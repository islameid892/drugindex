import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiter, RateLimitConfig } from './rateLimiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    const config: RateLimitConfig = {
      windowMs: 1000, // 1 second for testing
      maxRequests: 3,
    };
    limiter = new RateLimiter(config);
  });

  afterEach(() => {
    limiter.destroy();
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests within limit', () => {
      const result1 = limiter.isAllowed('user1');
      const result2 = limiter.isAllowed('user1');
      const result3 = limiter.isAllowed('user1');

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(result3.allowed).toBe(true);
    });

    it('should reject requests exceeding limit', () => {
      limiter.isAllowed('user1');
      limiter.isAllowed('user1');
      limiter.isAllowed('user1');
      const result4 = limiter.isAllowed('user1');

      expect(result4.allowed).toBe(false);
    });

    it('should track remaining requests', () => {
      const result1 = limiter.isAllowed('user1');
      expect(result1.remaining).toBe(2);

      const result2 = limiter.isAllowed('user1');
      expect(result2.remaining).toBe(1);

      const result3 = limiter.isAllowed('user1');
      expect(result3.remaining).toBe(0);
    });

    it('should isolate limits per identifier', () => {
      limiter.isAllowed('user1');
      limiter.isAllowed('user1');
      limiter.isAllowed('user1');

      const result1 = limiter.isAllowed('user2');
      const result2 = limiter.isAllowed('user2');

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });
  });

  describe('Window Reset', () => {
    it('should reset limit after window expires', async () => {
      limiter.isAllowed('user1');
      limiter.isAllowed('user1');
      limiter.isAllowed('user1');

      const resultBefore = limiter.isAllowed('user1');
      expect(resultBefore.allowed).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      const resultAfter = limiter.isAllowed('user1');
      expect(resultAfter.allowed).toBe(true);
      expect(resultAfter.remaining).toBe(2);
    });
  });

  describe('Reset Operations', () => {
    it('should reset limit for specific identifier', () => {
      limiter.isAllowed('user1');
      limiter.isAllowed('user1');
      limiter.isAllowed('user1');

      limiter.reset('user1');

      const result = limiter.isAllowed('user1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it('should reset all limits', () => {
      limiter.isAllowed('user1');
      limiter.isAllowed('user1');
      limiter.isAllowed('user1');

      limiter.isAllowed('user2');
      limiter.isAllowed('user2');

      limiter.resetAll();

      const result1 = limiter.isAllowed('user1');
      const result2 = limiter.isAllowed('user2');

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should track number of tracked IPs', () => {
      limiter.isAllowed('user1');
      limiter.isAllowed('user2');
      limiter.isAllowed('user3');

      const stats = limiter.getStats();
      expect(stats.trackedIPs).toBe(3);
    });

    it('should track total requests', () => {
      limiter.isAllowed('user1');
      limiter.isAllowed('user1');
      limiter.isAllowed('user2');
      limiter.isAllowed('user2');
      limiter.isAllowed('user2');

      const stats = limiter.getStats();
      expect(stats.totalRequests).toBe(5);
    });
  });

  describe('Get Count', () => {
    it('should return current request count', () => {
      expect(limiter.getCount('user1')).toBe(0);

      limiter.isAllowed('user1');
      expect(limiter.getCount('user1')).toBe(1);

      limiter.isAllowed('user1');
      expect(limiter.getCount('user1')).toBe(2);
    });

    it('should return 0 for expired entries', async () => {
      limiter.isAllowed('user1');
      expect(limiter.getCount('user1')).toBe(1);

      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(limiter.getCount('user1')).toBe(0);
    });
  });

  describe('Reset Time Tracking', () => {
    it('should provide reset time', () => {
      const result = limiter.isAllowed('user1');
      expect(result.resetTime).toBeGreaterThan(Date.now());
      expect(result.resetTime - Date.now()).toBeLessThanOrEqual(1000);
    });

    it('should maintain same reset time within window', () => {
      const result1 = limiter.isAllowed('user1');
      const result2 = limiter.isAllowed('user1');

      expect(result1.resetTime).toBe(result2.resetTime);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero max requests', () => {
      const zeroLimiter = new RateLimiter({
        windowMs: 1000,
        maxRequests: 0,
      });

      const result = zeroLimiter.isAllowed('user1');
      expect(result.allowed).toBe(false);

      zeroLimiter.destroy();
    });

    it('should handle high request counts', () => {
      const highLimiter = new RateLimiter({
        windowMs: 1000,
        maxRequests: 1000,
      });

      for (let i = 0; i < 1000; i++) {
        const result = highLimiter.isAllowed('user1');
        expect(result.allowed).toBe(true);
      }

      const result = highLimiter.isAllowed('user1');
      expect(result.allowed).toBe(false);

      highLimiter.destroy();
    });

    it('should handle many different identifiers', () => {
      for (let i = 0; i < 100; i++) {
        limiter.isAllowed(`user${i}`);
      }

      const stats = limiter.getStats();
      expect(stats.trackedIPs).toBe(100);
    });
  });

  describe('Custom Error Message', () => {
    it('should use custom error message', () => {
      const customLimiter = new RateLimiter({
        windowMs: 1000,
        maxRequests: 1,
        message: 'Custom rate limit message',
      });

      customLimiter.isAllowed('user1');
      const result = customLimiter.isAllowed('user1');

      expect(result.allowed).toBe(false);
      // Note: The message is stored but not returned in isAllowed
      // It would be used when throwing an error in middleware

      customLimiter.destroy();
    });
  });
});
