/**
 * API Security Middleware
 * drugindex.click - Enterprise-Grade API Protection
 * 
 * Features:
 * - API Key validation
 * - Rate limiting per API key
 * - CORS validation
 * - Input sanitization
 * - Request logging
 * - Anomaly detection
 */

const crypto = require('crypto');

// ============================================================================
// 1. API KEY VALIDATION MIDDLEWARE
// ============================================================================

/**
 * In-memory API key store (replace with database in production)
 */
const apiKeys = new Map([
  ['sk_live_abc123def456', { name: 'Web App', rateLimit: 100, active: true }],
  ['sk_live_xyz789uvw012', { name: 'Mobile App', rateLimit: 50, active: true }],
  ['sk_live_test_key_1234', { name: 'Testing', rateLimit: 1000, active: true }],
]);

/**
 * Validate API key middleware
 */
function validateAPIKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing X-API-Key header',
      code: 'MISSING_API_KEY'
    });
  }
  
  const keyData = apiKeys.get(apiKey);
  
  if (!keyData || !keyData.active) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid or inactive API key',
      code: 'INVALID_API_KEY'
    });
  }
  
  // Attach key data to request
  req.apiKey = apiKey;
  req.apiKeyData = keyData;
  
  next();
}

// ============================================================================
// 2. RATE LIMITING MIDDLEWARE
// ============================================================================

const rateLimitStore = new Map();

/**
 * Rate limiting middleware
 */
function rateLimitMiddleware(req, res, next) {
  const apiKey = req.apiKey || req.ip;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  
  if (!rateLimitStore.has(apiKey)) {
    rateLimitStore.set(apiKey, {
      requests: [],
      blocked: false,
      blockUntil: 0
    });
  }
  
  const record = rateLimitStore.get(apiKey);
  
  // Check if currently blocked
  if (record.blocked && now < record.blockUntil) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Try again later.',
      retryAfter: Math.ceil((record.blockUntil - now) / 1000),
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
  
  // Remove old requests outside window
  record.requests = record.requests.filter(time => now - time < windowMs);
  
  // Get limit for this key
  const limit = req.apiKeyData?.rateLimit || 60;
  
  // Check if limit exceeded
  if (record.requests.length >= limit) {
    record.blocked = true;
    record.blockUntil = now + (5 * 60 * 1000); // Block for 5 minutes
    
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Temporarily blocked.',
      retryAfter: 300,
      code: 'RATE_LIMIT_BLOCKED'
    });
  }
  
  // Add current request
  record.requests.push(now);
  record.blocked = false;
  
  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', limit - record.requests.length);
  res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));
  
  next();
}

// ============================================================================
// 3. CORS VALIDATION MIDDLEWARE
// ============================================================================

const allowedOrigins = [
  'https://drugindex.click',
  'https://www.drugindex.click',
  'https://icd10.manus.space',
  'https://icd10search-a2jmvftk.manus.space'
];

/**
 * CORS validation middleware
 */
function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  
  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, X-App-Version');
  res.setHeader('Access-Control-Max-Age', '3600');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
}

// ============================================================================
// 4. INPUT SANITIZATION MIDDLEWARE
// ============================================================================

/**
 * Sanitize search query
 */
function sanitizeQuery(query) {
  if (typeof query !== 'string') {
    throw new Error('Query must be a string');
  }
  
  // Remove SQL injection attempts
  query = query.replace(/['";\\]/g, '');
  
  // Remove XSS attempts
  query = query.replace(/<[^>]*>/g, '');
  
  // Remove control characters
  query = query.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Limit length
  if (query.length > 500) {
    throw new Error('Query too long (max 500 characters)');
  }
  
  // Trim whitespace
  query = query.trim();
  
  if (query.length === 0) {
    throw new Error('Query cannot be empty');
  }
  
  return query;
}

/**
 * Input validation middleware
 */
function inputValidationMiddleware(req, res, next) {
  // Validate query parameter
  if (req.query.query) {
    try {
      req.query.query = sanitizeQuery(req.query.query);
    } catch (error) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message,
        code: 'INVALID_INPUT'
      });
    }
  }
  
  // Validate body if present
  if (req.body && req.body.query) {
    try {
      req.body.query = sanitizeQuery(req.body.query);
    } catch (error) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message,
        code: 'INVALID_INPUT'
      });
    }
  }
  
  next();
}

// ============================================================================
// 5. REQUEST LOGGING MIDDLEWARE
// ============================================================================

const requestLog = [];

/**
 * Request logging middleware
 */
function requestLoggingMiddleware(req, res, next) {
  const startTime = Date.now();
  
  // Log request
  const logEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    apiKey: req.apiKey ? req.apiKey.substring(0, 10) + '...' : 'none',
  };
  
  // Intercept response
  const originalSend = res.send;
  res.send = function(data) {
    logEntry.status = res.statusCode;
    logEntry.duration = Date.now() - startTime;
    logEntry.responseSize = typeof data === 'string' ? data.length : 0;
    
    // Add to log (keep last 10000 entries)
    requestLog.push(logEntry);
    if (requestLog.length > 10000) {
      requestLog.shift();
    }
    
    // Log to console if error
    if (res.statusCode >= 400) {
      console.log(`[API] ${logEntry.method} ${logEntry.path} - ${logEntry.status} (${logEntry.duration}ms)`);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
}

// ============================================================================
// 6. ANOMALY DETECTION MIDDLEWARE
// ============================================================================

const anomalyStore = new Map();

/**
 * Detect suspicious patterns
 */
function anomalyDetectionMiddleware(req, res, next) {
  const apiKey = req.apiKey || req.ip;
  const now = Date.now();
  const hourWindow = 60 * 60 * 1000;
  
  if (!anomalyStore.has(apiKey)) {
    anomalyStore.set(apiKey, {
      requests: [],
      largeResponses: [],
      errors: []
    });
  }
  
  const record = anomalyStore.get(apiKey);
  
  // Clean old entries
  record.requests = record.requests.filter(time => now - time < hourWindow);
  record.largeResponses = record.largeResponses.filter(time => now - time < hourWindow);
  record.errors = record.errors.filter(time => now - time < hourWindow);
  
  // Add current request
  record.requests.push(now);
  
  // Detect anomalies
  const requestsPerHour = record.requests.length;
  
  // Alert if too many requests in short time
  if (requestsPerHour > 100) {
    console.warn(`[ANOMALY] ${apiKey}: ${requestsPerHour} requests/hour (threshold: 100)`);
  }
  
  // Intercept response to check for large responses
  const originalSend = res.send;
  res.send = function(data) {
    const responseSize = typeof data === 'string' ? data.length : 0;
    
    // Alert if response too large
    if (responseSize > 10 * 1024 * 1024) { // 10MB
      record.largeResponses.push(now);
      console.warn(`[ANOMALY] ${apiKey}: Large response ${responseSize} bytes`);
    }
    
    // Alert if multiple large responses
    if (record.largeResponses.length > 5) {
      console.warn(`[ANOMALY] ${apiKey}: Multiple large responses detected`);
    }
    
    return originalSend.call(this, data);
  };
  
  // Intercept error responses
  const originalJson = res.json;
  res.json = function(data) {
    if (data && data.error) {
      record.errors.push(now);
      
      // Alert if many errors
      if (record.errors.length > 20) {
        console.warn(`[ANOMALY] ${apiKey}: ${record.errors.length} errors/hour`);
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}

// ============================================================================
// 7. ERROR HANDLING MIDDLEWARE
// ============================================================================

/**
 * Global error handler
 */
function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err.message);
  
  // Don't expose error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: isDevelopment ? err.message : 'An error occurred',
    code: err.code || 'INTERNAL_ERROR',
    ...(isDevelopment && { stack: err.stack })
  });
}

// ============================================================================
// 8. ADMIN ENDPOINTS FOR MONITORING
// ============================================================================

/**
 * Get security stats
 */
function getSecurityStats() {
  return {
    timestamp: new Date().toISOString(),
    rateLimiting: {
      totalKeys: rateLimitStore.size,
      blockedKeys: Array.from(rateLimitStore.values()).filter(r => r.blocked).length,
      activeRequests: Array.from(rateLimitStore.values()).reduce((sum, r) => sum + r.requests.length, 0)
    },
    requestLog: {
      totalRequests: requestLog.length,
      lastRequests: requestLog.slice(-20)
    },
    anomalies: {
      totalTracked: anomalyStore.size,
      highActivity: Array.from(anomalyStore.entries())
        .filter(([_, data]) => data.requests.length > 100)
        .map(([key, _]) => key)
    }
  };
}

/**
 * Get request log
 */
function getRequestLog(limit = 100) {
  return requestLog.slice(-limit).reverse();
}

/**
 * Reset rate limit for key
 */
function resetRateLimit(apiKey) {
  rateLimitStore.delete(apiKey);
  return { message: 'Rate limit reset', apiKey };
}

// ============================================================================
// 9. EXPORT MIDDLEWARE
// ============================================================================

module.exports = {
  // Middleware
  validateAPIKey,
  rateLimitMiddleware,
  corsMiddleware,
  inputValidationMiddleware,
  requestLoggingMiddleware,
  anomalyDetectionMiddleware,
  errorHandler,
  
  // Utilities
  sanitizeQuery,
  
  // Admin functions
  getSecurityStats,
  getRequestLog,
  resetRateLimit,
  
  // Configuration
  apiKeys,
  allowedOrigins
};

// ============================================================================
// 10. USAGE EXAMPLE
// ============================================================================

/*
const express = require('express');
const security = require('./api_security_middleware');

const app = express();

// Apply middleware in order
app.use(express.json());
app.use(security.corsMiddleware);
app.use(security.requestLoggingMiddleware);

// Public endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Protected endpoints
app.use(security.validateAPIKey);
app.use(security.rateLimitMiddleware);
app.use(security.inputValidationMiddleware);
app.use(security.anomalyDetectionMiddleware);

// Search endpoint
app.get('/api/search', (req, res) => {
  const query = req.query.query;
  // Perform search...
  res.json({ results: [] });
});

// Admin endpoints
app.get('/api/admin/stats', (req, res) => {
  // Verify admin token here
  res.json(security.getSecurityStats());
});

// Error handler (must be last)
app.use(security.errorHandler);

app.listen(3000);
*/
