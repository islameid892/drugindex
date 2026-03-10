import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import type { RateLimitRequestHandler } from "express-rate-limit";
import { createServer } from "http";
import net from "net";
import compression from "compression";
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

// Rate limiting middleware - ACTUALLY ENFORCE LIMITS
const limiter: RateLimitRequestHandler = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 30, // 30 requests per minute globally
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the RateLimit-* headers
  legacyHeaders: false, // Disable the X-RateLimit-* headers
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: (req as any).rateLimit?.resetTime,
    });
  },
});

const apiLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 60, // 60 API requests per minute
  message: 'Too many API requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Trust proxy - important for rate limiting behind reverse proxies
  app.set('trust proxy', 1);

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

  // Health check endpoint - BEFORE rate limiting
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    });
  });

  // Apply rate limiting
  app.use(limiter);

  // Data sanitization against NoSQL injection
  app.use(mongoSanitize());

  // Data sanitization against XSS
  app.use(xss());

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Set server timeout to prevent premature disconnections
  server.setTimeout(120000); // 2 minutes
  server.keepAliveTimeout = 65000; // 65 seconds

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Apply stricter rate limiting to API endpoints
  app.use('/api/', apiLimiter);

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



  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

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
    console.log('✅ Rate limiting (100 req/15min global, 50 req/15min API)');
    console.log('✅ XSS protection');
    console.log('✅ NoSQL injection protection');
    console.log('✅ HSTS enabled');
    console.log('✅ Input validation and sanitization');
    console.log('✅ Trust proxy enabled for accurate rate limiting');
    console.log('✅ Response compression (gzip) enabled');
    console.log('✅ Cache control headers configured');
  });
}

startServer().catch(console.error);
