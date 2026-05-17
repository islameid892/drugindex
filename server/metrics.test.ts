import { describe, it, expect, beforeEach } from 'vitest';
import { metrics } from './metrics';

describe('Performance Metrics', () => {
  beforeEach(() => {
    metrics.reset();
  });

  describe('Cache Metrics', () => {
    it('should track cache hits', () => {
      metrics.recordCacheHit();
      metrics.recordCacheHit();
      const cacheMetrics = metrics.getCacheMetrics();
      expect(cacheMetrics.hits).toBe(2);
    });

    it('should track cache misses', () => {
      metrics.recordCacheMiss();
      metrics.recordCacheMiss();
      metrics.recordCacheMiss();
      const cacheMetrics = metrics.getCacheMetrics();
      expect(cacheMetrics.misses).toBe(3);
    });

    it('should calculate hit rate correctly', () => {
      metrics.recordCacheHit();
      metrics.recordCacheHit();
      metrics.recordCacheMiss();
      metrics.recordCacheMiss();
      const cacheMetrics = metrics.getCacheMetrics();
      expect(cacheMetrics.hitRate).toBe(50);
    });

    it('should handle 100% hit rate', () => {
      metrics.recordCacheHit();
      metrics.recordCacheHit();
      metrics.recordCacheHit();
      const cacheMetrics = metrics.getCacheMetrics();
      expect(cacheMetrics.hitRate).toBe(100);
    });

    it('should handle 0% hit rate', () => {
      metrics.recordCacheMiss();
      metrics.recordCacheMiss();
      const cacheMetrics = metrics.getCacheMetrics();
      expect(cacheMetrics.hitRate).toBe(0);
    });
  });

  describe('Rate Limit Metrics', () => {
    it('should track rate limit violations', () => {
      metrics.recordRateLimitViolation('192.168.1.1');
      metrics.recordRateLimitViolation('192.168.1.2');
      const rateLimitMetrics = metrics.getRateLimitMetrics();
      expect(rateLimitMetrics.violations).toBe(2);
    });

    it('should track blocked IPs', () => {
      metrics.recordRateLimitViolation('192.168.1.1');
      metrics.recordRateLimitViolation('192.168.1.1');
      metrics.recordRateLimitViolation('192.168.1.2');
      const rateLimitMetrics = metrics.getRateLimitMetrics();
      expect(rateLimitMetrics.blockedIPs.size).toBe(2);
    });

    it('should handle multiple violations from same IP', () => {
      metrics.recordRateLimitViolation('192.168.1.1');
      metrics.recordRateLimitViolation('192.168.1.1');
      metrics.recordRateLimitViolation('192.168.1.1');
      const rateLimitMetrics = metrics.getRateLimitMetrics();
      expect(rateLimitMetrics.violations).toBe(3);
      expect(rateLimitMetrics.blockedIPs.size).toBe(1);
    });
  });

  describe('Response Time Metrics', () => {
    it('should track response times', () => {
      metrics.recordResponseTime(100);
      metrics.recordResponseTime(200);
      metrics.recordResponseTime(150);
      const responseTimeMetrics = metrics.getResponseTimeMetrics();
      expect(responseTimeMetrics.min).toBe(100);
      expect(responseTimeMetrics.max).toBe(200);
    });

    it('should calculate average response time', () => {
      metrics.recordResponseTime(100);
      metrics.recordResponseTime(200);
      metrics.recordResponseTime(300);
      const responseTimeMetrics = metrics.getResponseTimeMetrics();
      expect(responseTimeMetrics.avg).toBe(200);
    });

    it('should calculate percentiles', () => {
      for (let i = 1; i <= 100; i++) {
        metrics.recordResponseTime(i);
      }
      const responseTimeMetrics = metrics.getResponseTimeMetrics();
      expect(responseTimeMetrics.p95).toBeGreaterThan(90);
      expect(responseTimeMetrics.p99).toBeGreaterThan(95);
    });

    it('should handle empty response times', () => {
      const responseTimeMetrics = metrics.getResponseTimeMetrics();
      expect(responseTimeMetrics.min).toBe(0);
      expect(responseTimeMetrics.max).toBe(0);
      expect(responseTimeMetrics.avg).toBe(0);
    });
  });

  describe('Request Tracking', () => {
    it('should track search requests', () => {
      metrics.recordRequest('search');
      metrics.recordRequest('search');
      const snapshot = metrics.getSnapshot();
      expect(snapshot.searchRequests).toBe(2);
    });

    it('should track analytics requests', () => {
      metrics.recordRequest('analytics');
      metrics.recordRequest('analytics');
      metrics.recordRequest('analytics');
      const snapshot = metrics.getSnapshot();
      expect(snapshot.analyticsRequests).toBe(3);
    });

    it('should track total requests', () => {
      metrics.recordRequest('search');
      metrics.recordRequest('analytics');
      metrics.recordRequest('other');
      const snapshot = metrics.getSnapshot();
      expect(snapshot.totalRequests).toBe(3);
    });
  });

  describe('Error Tracking', () => {
    it('should track errors', () => {
      metrics.recordError();
      metrics.recordError();
      const snapshot = metrics.getSnapshot();
      expect(snapshot.errorCount).toBe(2);
    });

    it('should include errors in report', () => {
      metrics.recordRequest('search');
      metrics.recordRequest('search');
      metrics.recordError();
      const report = metrics.getReport();
      expect(report.errorCount).toBe(1);
      expect(report.errorRate).toBeGreaterThan(0);
    });
  });

  describe('Metrics Snapshot', () => {
    it('should include all metrics in snapshot', () => {
      metrics.recordCacheHit();
      metrics.recordRequest('search');
      metrics.recordResponseTime(100);
      const snapshot = metrics.getSnapshot();
      expect(snapshot.timestamp).toBeGreaterThan(0);
      expect(snapshot.cacheHits).toBe(1);
      expect(snapshot.totalRequests).toBe(1);
      expect(snapshot.avgResponseTime).toBe(100);
    });

    it('should have current timestamp', () => {
      const before = Date.now();
      const snapshot = metrics.getSnapshot();
      const after = Date.now();
      expect(snapshot.timestamp).toBeGreaterThanOrEqual(before);
      expect(snapshot.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('Metrics Report', () => {
    it('should generate comprehensive report', () => {
      metrics.recordRequest('search');
      metrics.recordRequest('search');
      metrics.recordRequest('analytics');
      metrics.recordCacheHit();
      metrics.recordResponseTime(100);
      metrics.recordResponseTime(200);
      const report = metrics.getReport();
      expect(report.totalRequests).toBe(3);
      expect(report.searchRequests).toBe(2);
      expect(report.analyticsRequests).toBe(1);
      expect(report.cache.hits).toBe(1);
      expect(report.responseTime.avg).toBe(150);
    });

    it('should calculate requests per second', () => {
      for (let i = 0; i < 10; i++) {
        metrics.recordRequest('search');
      }
      const report = metrics.getReport();
      expect(report.requestsPerSecond).toBeGreaterThan(0);
    });

    it('should calculate error rate', () => {
      metrics.recordRequest('search');
      metrics.recordRequest('search');
      metrics.recordRequest('search');
      metrics.recordRequest('search');
      metrics.recordError();
      const report = metrics.getReport();
      expect(report.errorRate).toBeGreaterThan(0);
      expect(report.errorRate).toBeLessThan(100);
    });

    it('should include uptime', () => {
      const report = metrics.getReport();
      expect(report.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Metrics Reset', () => {
    it('should reset all metrics', () => {
      metrics.recordCacheHit();
      metrics.recordRequest('search');
      metrics.recordError();
      metrics.reset();
      const snapshot = metrics.getSnapshot();
      expect(snapshot.cacheHits).toBe(0);
      expect(snapshot.totalRequests).toBe(0);
      expect(snapshot.errorCount).toBe(0);
    });

    it('should reset response times', () => {
      metrics.recordResponseTime(100);
      metrics.recordResponseTime(200);
      metrics.reset();
      const responseTimeMetrics = metrics.getResponseTimeMetrics();
      expect(responseTimeMetrics.avg).toBe(0);
    });
  });

  describe('Performance Scenarios', () => {
    it('should handle high cache hit rate', () => {
      for (let i = 0; i < 100; i++) {
        metrics.recordCacheHit();
      }
      for (let i = 0; i < 5; i++) {
        metrics.recordCacheMiss();
      }
      const cacheMetrics = metrics.getCacheMetrics();
      expect(cacheMetrics.hitRate).toBeGreaterThan(95);
    });

    it('should handle high request volume', () => {
      for (let i = 0; i < 1000; i++) {
        metrics.recordRequest('search');
        metrics.recordResponseTime(Math.random() * 500);
      }
      const report = metrics.getReport();
      expect(report.totalRequests).toBe(1000);
      expect(report.requestsPerSecond).toBeGreaterThan(0);
    });

    it('should handle mixed request types', () => {
      for (let i = 0; i < 50; i++) {
        metrics.recordRequest('search');
        metrics.recordRequest('analytics');
        metrics.recordRequest('other');
      }
      const snapshot = metrics.getSnapshot();
      expect(snapshot.totalRequests).toBe(150);
      expect(snapshot.searchRequests).toBe(50);
      expect(snapshot.analyticsRequests).toBe(50);
    });
  });
});
