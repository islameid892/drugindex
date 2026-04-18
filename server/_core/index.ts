import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import type { RateLimitRequestHandler } from "express-rate-limit";
import { createServer } from "http";
import net from "net";
import compression from "compression";
import cookieParser from "cookie-parser";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import superjson from "superjson";
import askSilaRouter from "../api/askSila";
import { initializeJobs, shutdownJobs } from "../jobs";
import { advancedRateLimiter, searchRateLimiter, getSecurityStats, getSecurityLog } from "../middleware/advancedRateLimiter";
import { honeypotMiddleware, originValidationMiddleware, customHeaderMiddleware, strictCorsMiddleware, getHoneypotStats } from "../middleware/apiSecurity";
import { exportProtectionMiddleware, getExportStats, getUserExportQuota, getExportLog, detectSuspiciousExports } from "../middleware/exportProtection";
import { sessionSecurityMiddleware, createSession, validateSession, invalidateSession, getSessionStats, cleanupExpiredSessions } from "../middleware/sessionSecurity";
import { httpsEnforcementMiddleware, cspMiddleware, preventSSLDowngrade, getCertificatePinningInfo } from "../middleware/httpsEnforcement";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

// ====================================================
// BOT DETECTION & SCRAPING PROTECTION
// ====================================================

// Known scraping/bot user agents to block
const BLOCKED_USER_AGENTS = [
  'python-requests', 'scrapy', 'wget', 'curl/', 'httpx',
  'aiohttp', 'go-http-client', 'java/', 'perl/', 'ruby',
  'php/', 'libwww-perl', 'lwp-trivial', 'urllib',
  'mechanize', 'twisted', 'httpclient', 'apache-httpclient',
  'okhttp', 'axios', 'node-fetch', 'got/', 'superagent',
  'postman', 'insomnia', 'thunder client',
];

// Bot detection middleware
const botDetectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  
  // Allow empty user-agent from browser (some browsers send empty)
  // But block known scraping tools
  const isBot = BLOCKED_USER_AGENTS.some(bot => userAgent.includes(bot));
  
  if (isBot && process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'Access Denied',
      message: 'Automated access is not permitted.',
    });
  }
  
  next();
};

// IP-based daily request tracking for scraping detection
const dailyRequestTracker = new Map<string, { count: number; date: string }>();

const scrapingDetectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV !== 'production') return next();
  if (!req.path.startsWith('/api/trpc')) return next();
  
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
             req.socket.remoteAddress || 'unknown';
  const today = new Date().toISOString().split('T')[0];
  
  const tracker = dailyRequestTracker.get(ip);
  
  if (!tracker || tracker.date !== today) {
    dailyRequestTracker.set(ip, { count: 1, date: today });
  } else {
    tracker.count++;
    
    // Block IPs making more than 500 API requests per day (scraping behavior)
    if (tracker.count > 500) {
      return res.status(429).json({
        error: 'Daily limit exceeded',
        message: 'You have exceeded the daily request limit. Please try again tomorrow.',
      });
    }
  }
  
  // Cleanup old entries every 1000 requests
  if (dailyRequestTracker.size > 10000) {
    for (const [key, value] of dailyRequestTracker.entries()) {
      if (value.date !== today) dailyRequestTracker.delete(key);
    }
  }
  
  next();
};

// Rate limiting middleware - PROFESSIONAL IMPLEMENTATION
const globalLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 100, // 100 requests per 15 minutes globally
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.path.startsWith('/public'),
  handler: (req, res) => {
    const rateLimit = (req as any).rateLimit;
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: rateLimit?.resetTime,
      remaining: rateLimit?.remaining || 0,
    });
  },
});

const apiLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 300, // Increased from 60 to 300 for metrics and analytics
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
  handler: (req, res) => {
    const rateLimit = (req as any).rateLimit;
    res.status(429).json({
      error: 'Too many API requests',
      message: 'API rate limit exceeded. Please try again later.',
      retryAfter: rateLimit?.resetTime,
      remaining: rateLimit?.remaining || 0,
    });
  },
});

const searchLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100, // Increased from 30 to 100 for search requests
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const rateLimit = (req as any).rateLimit;
    res.status(429).json({
      error: 'Search rate limit exceeded',
      message: 'Too many search requests. Please try again later.',
      retryAfter: rateLimit?.resetTime,
      remaining: rateLimit?.remaining || 0,
    });
  },
});

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Trust proxy - important for rate limiting behind reverse proxies
  app.set('trust proxy', 1);

  // ====================================================
  // HTTPS & SECURITY ENFORCEMENT (FIRST LAYER)
  // ====================================================
  
  // HTTPS Enforcement - Redirect HTTP to HTTPS
  app.use(httpsEnforcementMiddleware);
  
  // CSP Headers - Content Security Policy
  app.use(cspMiddleware);
  
  // Prevent SSL downgrade attacks
  app.use(preventSSLDowngrade);
  
  // Export Protection - Limit bulk data exports
  app.use(exportProtectionMiddleware);
  
  // Session Security - Timeout and IP binding
  app.use(sessionSecurityMiddleware);
  // HTTPS Enforcement Middleware - Redirect HTTP to HTTPS with 301 permanent redirect
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'production' && req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
    next();
  });

  // Security middleware - Helmet for setting various HTTP headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://pagead2.googlesyndication.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        styleElem: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:", "wss:"],
        fontSrc: ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      },
    },
    hsts: {
      maxAge: 63072000, // 2 years in seconds
      includeSubDomains: true,
      preload: true,
    },
    frameguard: {
      action: 'deny',
    },
    noSniff: true,
    xssFilter: true,
  }));

  // CORS configuration
  app.use((req: Request, res: Response, next: NextFunction) => {
    const allowedOrigins = [
      'https://www.drugindex.click',
      'https://drugindex.click',
      process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
    ].filter(Boolean);

    const origin = req.headers.origin as string;
    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '3600');

    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Compression middleware - gzip compression for responses
  app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req: Request, res: Response) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
  }));

  // ====================================================
  // SECURITY HEADERS (ALWAYS - dev & prod) - MUST BE FIRST
  // ====================================================
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('X-Frame-Options', 'DENY');
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-XSS-Protection', '1; mode=block');
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=()');
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    next();
  });

  // ====================================================
  // BOT DETECTION - MUST BE BEFORE ALL ROUTES
  // ====================================================
  app.use((req: Request, res: Response, next: NextFunction) => {
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    const isBot = BLOCKED_USER_AGENTS.some(bot => userAgent.includes(bot.toLowerCase()));
    if (isBot) {
      return res.status(403).json({
        error: 'Access Denied',
        message: 'Automated access is not permitted.',
      });
    }
    next();
  });

  // ====================================================
  // BLOCK SENSITIVE ENDPOINTS (ALWAYS - dev & prod)
  // ====================================================
  
  // Block /metrics endpoint completely
  app.get('/metrics', (req: Request, res: Response) => {
    return res.status(403).json({
      error: 'Access Denied',
      message: 'This endpoint is not publicly accessible.',
    });
  });
  
  // Block /metrics with any trailing path
  app.use('/metrics', (req: Request, res: Response) => {
    return res.status(403).json({
      error: 'Access Denied',
      message: 'This endpoint is not publicly accessible.',
    });
  });

  // Health check endpoint (allowed for monitoring)
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    });
  });

  // ====================================================
  // ADVANCED SECURITY MIDDLEWARE STACK
  // ====================================================
  
  // 1. Honeypot - ban IPs trying to access fake endpoints
  app.use(honeypotMiddleware);
  
  // 2. Strict CORS - before any API processing
  app.use(strictCorsMiddleware);
  
  // 3. Advanced rate limiting with progressive blocking (ALL environments)
  app.use(advancedRateLimiter);
  
  // 5. Daily scraping detection - block IPs with excessive requests
  app.use(scrapingDetectionMiddleware);
  
  // 6. Origin/Referer validation
  app.use(originValidationMiddleware);
  
  // 7. Custom header validation (X-App-Version)
  app.use(customHeaderMiddleware);

  // Data sanitization against NoSQL injection
  app.use(mongoSanitize());

  // Data sanitization against XSS
  app.use(xss());

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Parse cookies
  app.use(cookieParser());

  // Set server timeout to prevent premature disconnections
  server.setTimeout(120000); // 2 minutes
  server.keepAliveTimeout = 65000; // 65 seconds

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Ask Sila API routes
  app.use("/api/askSila", askSilaRouter);

  // Apply stricter rate limiting to API endpoints (ALL environments)
  app.use('/api/', apiLimiter);

  // Apply search-specific rate limiting (stricter: 10 searches/min)
  app.use('/api/trpc/data.searchGrouped', searchRateLimiter);
  app.use('/api/trpc/data.search', searchRateLimiter);
  app.use('/api/trpc/advancedSearch', searchRateLimiter);
  
  // Extra protection: block bulk data access endpoints
  app.use('/api/trpc/data.medications.getAll', searchRateLimiter);
  app.use('/api/trpc/data.codes.getAll', searchRateLimiter);
  app.use('/api/trpc/data.nonCoveredCodes.getAll', searchRateLimiter);

  // tRPC API with response optimization
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      responseMeta() {
        return {
          headers: {
            'content-type': 'application/json',
            'cache-control': 'public, max-age=300',
            'vary': 'Accept-Encoding',
          },
        };
      },
    })
  );

  // Security headers for additional protection
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Prevent clickjacking
    res.header('X-Frame-Options', 'SAMEORIGIN');
    // Prevent MIME type sniffing
    res.header('X-Content-Type-Options', 'nosniff');
    // Enable XSS protection
    res.header('X-XSS-Protection', '1; mode=block');
    // Referrer Policy
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Permissions Policy
    res.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    // Vary header for cache
    res.header('Vary', 'Accept-Encoding');
    next();
  });



  // ====================================================
  // SECURITY MONITORING ENDPOINTS (Admin Only)
  // ====================================================
  
  // Get security statistics
  app.get('/api/security/stats', (req: Request, res: Response) => {
    // Only allow from localhost or with special header in production
    if (process.env.NODE_ENV === 'production') {
      const adminToken = req.headers['x-admin-token'];
      if (!adminToken || adminToken !== process.env.ADMIN_SECURITY_TOKEN) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }
    
    const stats = getSecurityStats();
    const honeypotStats = getHoneypotStats();
    
    res.json({
      rateLimit: stats,
      honeypot: honeypotStats,
      timestamp: new Date().toISOString(),
    });
  });
  
  // Get security log
  app.get('/api/security/log', (req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
      const adminToken = req.headers['x-admin-token'];
      if (!adminToken || adminToken !== process.env.ADMIN_SECURITY_TOKEN) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }
    
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const log = getSecurityLog(limit);
    
    res.json({
      log,
      count: log.length,
      timestamp: new Date().toISOString(),
    });
  });

  // 404 Error handler - return proper HTTP 404 status
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Check if request is for API or static files that don't exist
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'API endpoint not found',
        path: req.path,
      });
    }
    // For SPA routes, let Vite/static handler deal with it
    next();
  });

  // Sitemap and robots.txt routes
  app.get('/sitemap.xml', async (req: Request, res: Response) => {
    try {
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
      const baseUrl = `${protocol}://${host}`;
      
      const { generateXmlSitemap } = await import('../sitemapGenerator');
      const xmlContent = await generateXmlSitemap(baseUrl);
      
      res.type('application/xml');
      res.header('Cache-Control', 'public, max-age=86400');
      res.send(xmlContent);
    } catch (error) {
      console.error('Error generating sitemap:', error);
      res.status(500).send('Error generating sitemap');
    }
  });

  app.get('/sitemap.html', async (req: Request, res: Response) => {
    try {
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
      const baseUrl = `${protocol}://${host}`;
      
      const { generateHtmlSitemap } = await import('../sitemapGenerator');
      const htmlContent = await generateHtmlSitemap(baseUrl);
      
      res.type('text/html');
      res.header('Cache-Control', 'public, max-age=86400');
      res.send(htmlContent);
    } catch (error) {
      console.error('Error generating HTML sitemap:', error);
      res.status(500).send('Error generating HTML sitemap');
    }
  });

  app.get('/robots.txt', (req: Request, res: Response) => {
    try {
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
      const sitemapUrl = `${protocol}://${host}/sitemap.xml`;
      
      const { generateRobotsTxt } = require('../sitemapGenerator');
      const robotsContent = generateRobotsTxt(sitemapUrl);
      
      res.type('text/plain');
      res.header('Cache-Control', 'public, max-age=86400');
      res.send(robotsContent);
    } catch (error) {
      console.error('Error generating robots.txt:', error);
      res.status(500).send('Error generating robots.txt');
    }
  });

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Final 404 handler for unmatched routes (after static files)
  app.use((req: Request, res: Response) => {
    // Return 404 status with JSON response for API requests
    if (req.accepts('json')) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found',
        path: req.path,
        timestamp: new Date().toISOString(),
      });
    }
    // For HTML requests, serve index.html (SPA routing)
    res.status(404).sendFile(require('path').join(__dirname, '../../dist/public/index.html'));
  });

  // Error handler middleware (must be last)
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Server error:', err);
    
    if (res.headersSent) {
      return next(err);
    }

    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
      error: 'Server Error',
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  });

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    console.log('Security features enabled:');
    console.log('✅ Helmet security headers');
    console.log('✅ CORS protection');
    console.log('✅ Rate limiting:');
    console.log('   - Global: 100 req/15min');
    console.log('   - API: 60 req/min');
    console.log('   - Search: 30 req/min');
    console.log('✅ XSS protection');
    console.log('✅ NoSQL injection protection');
    console.log('✅ HSTS enabled');
    console.log('✅ Input validation and sanitization');
    console.log('✅ Trust proxy enabled for accurate rate limiting');
    console.log('✅ Response compression (gzip) enabled');
    console.log('✅ Cache control headers configured');
    console.log('✅ X-RateLimit headers enabled');
    
    // Initialize scheduled jobs
    initializeJobs();
  });
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('\n📋 SIGTERM received, shutting down gracefully...');
    shutdownJobs();
    server.close(() => {
      console.log('✅ Server shut down');
      process.exit(0);
    });
  });
}

startServer().catch(console.error);
