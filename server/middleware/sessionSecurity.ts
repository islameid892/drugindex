/**
 * Session Security Middleware
 * 
 * Features:
 * 1. Session timeout (30 minutes of inactivity)
 * 2. Session binding to IP address
 * 3. Session binding to User-Agent
 * 4. Secure session storage
 * 5. Session activity tracking
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

interface SessionData {
  sessionId: string;
  userId: string;
  createdAt: number;
  lastActivity: number;
  ipAddress: string;
  userAgent: string;
  isValid: boolean;
}

// In-memory session store
const sessions = new Map<string, SessionData>();

// Configuration
const CONFIG = {
  // Session timeout (30 minutes of inactivity)
  SESSION_TIMEOUT_MS: 30 * 60 * 1000,
  
  // Maximum session duration (8 hours)
  MAX_SESSION_DURATION_MS: 8 * 60 * 60 * 1000,
  
  // Bind session to IP (disabled to avoid issues with mobile users switching networks)
  BIND_TO_IP: false,
  
  // Bind session to User-Agent
  BIND_TO_USER_AGENT: true,
  
  // Secure cookie options
  COOKIE_OPTIONS: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 30 * 60 * 1000, // 30 minutes
  },
};

function getClientIP(req: Request): string {
  return (
    (req.headers['cf-connecting-ip'] as string) ||
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create new session
 */
export function createSession(userId: string, req: Request): string {
  const sessionId = generateSessionId();
  const now = Date.now();
  
  const session: SessionData = {
    sessionId,
    userId,
    createdAt: now,
    lastActivity: now,
    ipAddress: getClientIP(req),
    userAgent: req.headers['user-agent'] || '',
    isValid: true,
  };
  
  sessions.set(sessionId, session);
  
  // Set secure cookie
  const res = (req as any).res;
  if (res) {
    res.cookie('sessionId', sessionId, CONFIG.COOKIE_OPTIONS);
  }
  
  console.log(`[SESSION] Created: ${sessionId} for user: ${userId}`);
  
  return sessionId;
}

/**
 * Validate session
 */
export function validateSession(sessionId: string, req: Request): { valid: boolean; userId?: string; error?: string } {
  const session = sessions.get(sessionId);
  
  if (!session) {
    return { valid: false, error: 'Session not found' };
  }
  
  if (!session.isValid) {
    return { valid: false, error: 'Session invalidated' };
  }
  
  const now = Date.now();
  
  // Check session timeout
  if (now - session.lastActivity > CONFIG.SESSION_TIMEOUT_MS) {
    session.isValid = false;
    return { valid: false, error: 'Session expired (timeout)' };
  }
  
  // Check maximum session duration
  if (now - session.createdAt > CONFIG.MAX_SESSION_DURATION_MS) {
    session.isValid = false;
    return { valid: false, error: 'Session expired (max duration)' };
  }
  
  // Check IP binding
  if (CONFIG.BIND_TO_IP) {
    const currentIP = getClientIP(req);
    if (session.ipAddress !== currentIP) {
      session.isValid = false;
      console.warn(`[SESSION] IP mismatch: ${session.ipAddress} vs ${currentIP}`);
      return { valid: false, error: 'Session IP mismatch' };
    }
  }
  
  // Check User-Agent binding
  if (CONFIG.BIND_TO_USER_AGENT) {
    const currentUA = req.headers['user-agent'] || '';
    if (session.userAgent !== currentUA) {
      session.isValid = false;
      console.warn(`[SESSION] User-Agent mismatch for session: ${sessionId}`);
      return { valid: false, error: 'Session User-Agent mismatch' };
    }
  }
  
  // Update last activity
  session.lastActivity = now;
  
  return { valid: true, userId: session.userId };
}

/**
 * Invalidate session
 */
export function invalidateSession(sessionId: string) {
  const session = sessions.get(sessionId);
  if (session) {
    session.isValid = false;
    console.log(`[SESSION] Invalidated: ${sessionId}`);
  }
}

/**
 * Session security middleware
 */
export function sessionSecurityMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip in development
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  
  // Skip health check and OAuth
  if (req.path === '/health' || req.path.startsWith('/api/oauth')) {
    return next();
  }
  
  // Get session ID from cookie
  const sessionId = req.cookies?.sessionId;
  
  // If no session, allow (will be checked at API level)
  if (!sessionId) {
    return next();
  }
  
  // Validate session
  const validation = validateSession(sessionId, req);
  
  if (!validation.valid) {
    // Clear invalid session cookie
    res.clearCookie('sessionId');
    
    // For API requests, return 401
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: validation.error || 'Session invalid',
      });
    }
    
    // For other requests, continue (frontend will handle redirect)
    return next();
  }
  
  // Attach user info to request
  (req as any).sessionUser = validation.userId;
  
  // Refresh session cookie
  res.cookie('sessionId', sessionId, CONFIG.COOKIE_OPTIONS);
  
  next();
}

/**
 * Get session statistics
 */
export function getSessionStats() {
  const now = Date.now();
  let activeSessions = 0;
  let expiredSessions = 0;
  let timedOutSessions = 0;
  
  for (const [, session] of sessions) {
    if (!session.isValid) {
      expiredSessions++;
    } else if (now - session.lastActivity > CONFIG.SESSION_TIMEOUT_MS) {
      timedOutSessions++;
    } else {
      activeSessions++;
    }
  }
  
  return {
    totalSessions: sessions.size,
    activeSessions,
    expiredSessions,
    timedOutSessions,
    sessionTimeoutMinutes: CONFIG.SESSION_TIMEOUT_MS / 60 / 1000,
    maxSessionHours: CONFIG.MAX_SESSION_DURATION_MS / 60 / 60 / 1000,
  };
}

/**
 * Clean up expired sessions
 */
export function cleanupExpiredSessions() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [sessionId, session] of sessions) {
    // Remove invalid sessions older than 24 hours
    if (!session.isValid && now - session.lastActivity > 24 * 60 * 60 * 1000) {
      sessions.delete(sessionId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`[SESSION] Cleaned up ${cleaned} expired sessions`);
  }
  
  return cleaned;
}

// Cleanup expired sessions every hour
setInterval(() => {
  cleanupExpiredSessions();
}, 60 * 60 * 1000);
