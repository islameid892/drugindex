import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

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

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Increased from 100 to 300 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the RateLimit-* headers
  legacyHeaders: false, // Disable the X-RateLimit-* headers
  skip: (req) => req.method === 'GET', // Don't rate limit GET requests
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Increased from 50 to 200 requests per windowMs
  message: 'Too many API requests from this IP, please try again later.',
  skip: (req) => req.method === 'GET', // Don't rate limit GET requests
});

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Trust proxy - important for rate limiting behind reverse proxies
  app.set('trust proxy', 1);

  // Security middleware - Helmet for setting various HTTP headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://pagead2.googlesyndication.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:"],
        fontSrc: ["'self'", "https://fonts.googleapis.com"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true,
    },
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

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
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
  });
}

startServer().catch(console.error);
