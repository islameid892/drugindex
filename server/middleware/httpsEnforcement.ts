/**
 * HTTPS Enforcement Middleware
 * 
 * Features:
 * 1. Redirect HTTP to HTTPS (301 permanent redirect)
 * 2. HSTS header (HTTP Strict Transport Security)
 * 3. Upgrade-Insecure-Requests support
 * 4. Prevent mixed content
 */

import { Request, Response, NextFunction } from 'express';

/**
 * HTTPS enforcement middleware
 */
export function httpsEnforcementMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip in development
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  
  // Check if connection is secure
  const isSecure = 
    req.protocol === 'https' ||
    req.headers['x-forwarded-proto'] === 'https' ||
    req.headers['cf-visitor']?.includes('https');
  
  if (!isSecure) {
    // Redirect HTTP to HTTPS with 301 permanent redirect
    const host = req.headers.host || 'drugindex.click';
    const url = `https://${host}${req.originalUrl}`;
    
    console.log(`[HTTPS] Redirecting HTTP to HTTPS: ${req.originalUrl}`);
    
    return res.redirect(301, url);
  }
  
  // Add HSTS header (HTTP Strict Transport Security)
  // Tells browsers to always use HTTPS for this domain
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  
  // Prevent mixed content
  res.setHeader('Content-Security-Policy', "upgrade-insecure-requests");
  
  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
}

/**
 * CSP (Content Security Policy) Header
 */
export function cspMiddleware(req: Request, res: Response, next: NextFunction) {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
    "img-src 'self' data: https: blob:",
    "media-src 'self' https:",
    "connect-src 'self' https: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', csp);
  
  next();
}

/**
 * Prevent SSL downgrade attacks
 */
export function preventSSLDowngrade(req: Request, res: Response, next: NextFunction) {
  // Prevent SSL stripping attacks
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // Prevent protocol downgrade
  if (req.headers['upgrade-insecure-requests']) {
    res.setHeader('Content-Security-Policy', 'upgrade-insecure-requests');
  }
  
  next();
}

/**
 * Certificate pinning info (for future implementation)
 */
export function getCertificatePinningInfo() {
  return {
    domain: 'drugindex.click',
    certificatePinning: {
      enabled: false,
      note: 'Can be enabled in production with proper certificate management',
      implementation: 'Use Public-Key-Pins header with backup keys',
    },
    hsts: {
      enabled: true,
      maxAge: '63072000 (2 years)',
      includeSubDomains: true,
      preload: true,
    },
    csp: {
      enabled: true,
      policy: 'Strict CSP with upgrade-insecure-requests',
    },
  };
}
