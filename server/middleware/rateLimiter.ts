/**
 * Rate Limiting Middleware
 * 
 * Implements per-IP rate limiting with configurable limits for different endpoints.
 * Uses in-memory store with automatic cleanup of expired entries.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string; // Custom error message
}

export class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly message: string;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: RateLimitConfig) {
    this.windowMs = config.windowMs;
    this.maxRequests = config.maxRequests;
    this.message = config.message || `Too many requests, please try again later.`;

    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  /**
   * Check if request should be allowed
   */
  isAllowed(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.store.get(identifier);

    if (!entry || now > entry.resetTime) {
      // Create new entry
      const resetTime = now + this.windowMs;
      const allowed = this.maxRequests > 0;
      
      this.store.set(identifier, {
        count: allowed ? 1 : 0,
        resetTime,
      });
      return {
        allowed,
        remaining: Math.max(0, this.maxRequests - (allowed ? 1 : 0)),
        resetTime,
      };
    }

    // Increment existing entry
    entry.count++;

    const allowed = entry.count <= this.maxRequests;
    const remaining = Math.max(0, this.maxRequests - entry.count);

    return {
      allowed,
      remaining,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Get current request count for identifier
   */
  getCount(identifier: string): number {
    const entry = this.store.get(identifier);
    if (!entry || Date.now() > entry.resetTime) {
      return 0;
    }
    return entry.count;
  }

  /**
   * Reset limit for identifier
   */
  reset(identifier: string): void {
    this.store.delete(identifier);
  }

  /**
   * Reset all limits
   */
  resetAll(): void {
    this.store.clear();
  }

  /**
   * Get statistics
   */
  getStats(): {
    trackedIPs: number;
    totalRequests: number;
  } {
    let totalRequests = 0;
    this.store.forEach((entry) => {
      totalRequests += entry.count;
    });

    return {
      trackedIPs: this.store.size,
      totalRequests,
    };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.store.forEach((entry, key) => {
      if (now > entry.resetTime) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => {
      this.store.delete(key);
    });
  }

  /**
   * Destroy the rate limiter and cleanup intervals
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Create rate limiters for different endpoints
export const searchRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 requests per minute
  message: "Too many search requests. Please wait before searching again.",
});

export const analyticsRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 requests per minute
  message: "Too many analytics requests. Please wait before trying again.",
});

export const bulkOperationRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // 5 requests per minute
  message: "Too many bulk operations. Please wait before trying again.",
});

export const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute (general API limit)
  message: "Rate limit exceeded. Please try again later.",
});
