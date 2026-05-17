/**
 * API Security Middleware
 * 
 * Features:
 * 1. Origin/Referer validation
 * 2. Custom required headers (X-App-Version)
 * 3. Honeypot endpoints - auto-block IPs that hit them
 * 4. CORS strict enforcement
 */

import { Request, Response, NextFunction } from 'express';
import { banIP, getSecurityLog } from './advancedRateLimiter';

// Allowed origins (strict CORS)
const ALLOWED_ORIGINS = [
  'https://drugindex.click',
  'https://www.drugindex.click',
  'https://icd10.manus.space',
  'https://icd10search-a2jmvftk.manus.space',
];

// Current app version - update this when deploying new versions
const CURRENT_APP_VERSION = '2.0';
const ALLOWED_VERSIONS = ['2.0', '1.9', '1.8']; // Allow recent versions

// Honeypot paths - any request to these paths gets the IP banned
const HONEYPOT_PATHS = [
  '/api/v1/export',
  '/api/v1/dump',
  '/api/export-all',
  '/api/database',
  '/api/backup',
  '/api/admin/users',
  '/api/admin/export',
  '/wp-admin',
  '/wp-login.php',
  '/admin.php',
  '/phpmyadmin',
  '/.env',
  '/config.php',
  '/api/all-drugs',
  '/api/bulk-export',
  '/api/v2/drugs/all',
  '/api/v2/export',
  '/data/drugs.json',
  '/data/all.json',
  '/dump.sql',
  '/backup.sql',
];

function getClientIP(req: Request): string {
  return (
    (req.headers['cf-connecting-ip'] as string) ||
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

/**
 * Honeypot middleware - ban any IP that tries to access honeypot paths
 */
export function honeypotMiddleware(req: Request, res: Response, next: NextFunction) {
  const path = req.path.toLowerCase();
  
  const isHoneypot = HONEYPOT_PATHS.some(honeypot => 
    path === honeypot || path.startsWith(honeypot + '/')
  );
  
  if (isHoneypot) {
    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    
    // Ban the IP permanently for hitting honeypot
    if (process.env.NODE_ENV === 'production') {
      banIP(ip, true, `Honeypot triggered: ${req.path}`);
      console.warn(`[HONEYPOT] Banned IP: ${ip} | Path: ${req.path} | UA: ${userAgent}`);
    }
    
    // Return a fake 404 to not reveal the honeypot
    return res.status(404).json({
      error: 'Not Found',
      message: 'The requested resource was not found.',
    });
  }
  
  next();
}

/**
 * Origin/Referer validation middleware
 * Only applies to API endpoints
 */
export function originValidationMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip in development
  if (process.env.NODE_ENV !== 'production') return next();
  
  // Only validate API requests
  if (!req.path.startsWith('/api/trpc')) return next();
  
  const origin = req.headers.origin as string;
  const referer = req.headers.referer as string;
  
  // Allow requests with no origin from same server (server-to-server)
  if (!origin && !referer) {
    // Check if it's a direct browser request (has Accept: text/html)
    const accept = req.headers.accept || '';
    if (accept.includes('text/html')) {
      return next(); // Browser direct navigation
    }
    // API call without origin - could be scraper
    // Allow but log it
    return next();
  }
  
  // Validate origin
  if (origin) {
    const isAllowed = ALLOWED_ORIGINS.some(allowed => origin === allowed || origin.startsWith(allowed));
    if (!isAllowed) {
      const ip = getClientIP(req);
      console.warn(`[CORS] Blocked origin: ${origin} from IP: ${ip}`);
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access from this origin is not permitted.',
      });
    }
  }
  
  // Validate referer if present
  if (referer && !origin) {
    const isAllowed = ALLOWED_ORIGINS.some(allowed => referer.startsWith(allowed));
    if (!isAllowed) {
      const ip = getClientIP(req);
      console.warn(`[REFERER] Suspicious referer: ${referer} from IP: ${ip}`);
      // Log but don't block (some browsers strip referer)
    }
  }
  
  next();
}

/**
 * Custom header validation middleware
 * Requires X-App-Version header for API requests
 */
export function customHeaderMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip in development
  if (process.env.NODE_ENV !== 'production') return next();
  
  // Only validate tRPC API requests (not OAuth, health, etc.)
  if (!req.path.startsWith('/api/trpc')) return next();
  
  const appVersion = req.headers['x-app-version'] as string;
  
  // If no version header, allow but log (for backward compatibility)
  if (!appVersion) {
    return next();
  }
  
  // If version header present but invalid, block
  if (!ALLOWED_VERSIONS.includes(appVersion)) {
    const ip = getClientIP(req);
    console.warn(`[VERSION] Invalid app version: ${appVersion} from IP: ${ip}`);
    return res.status(400).json({
      error: 'Invalid Client Version',
      message: 'Please refresh the page to use the latest version.',
    });
  }
  
  next();
}

/**
 * Strict CORS middleware
 */
export function strictCorsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin as string;
  
  if (origin) {
    const isAllowed = ALLOWED_ORIGINS.some(allowed => origin === allowed);
    
    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-App-Version');
      res.setHeader('Access-Control-Max-Age', '3600');
    }
  }
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
}

/**
 * Get honeypot statistics
 */
export function getHoneypotStats() {
  const log = getSecurityLog(1000);
  const honeypotEvents = log.filter(e => e.action === 'PERMANENT_BAN' && e.details?.includes('Honeypot'));
  
  return {
    totalHoneypotTriggers: honeypotEvents.length,
    recentTriggers: honeypotEvents.slice(0, 10),
    honeypotPaths: HONEYPOT_PATHS,
  };
}
