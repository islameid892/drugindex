/**
 * Performance Metrics Collection Module
 * Tracks cache hits, rate limit violations, response times, and API usage
 */

export interface MetricSnapshot {
  timestamp: number;
  cacheHits: number;
  cacheMisses: number;
  rateLimitViolations: number;
  avgResponseTime: number;
  totalRequests: number;
  searchRequests: number;
  analyticsRequests: number;
  errorCount: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
}

export interface RateLimitMetrics {
  violations: number;
  blockedIPs: Set<string>;
}

export interface ResponseTimeMetrics {
  min: number;
  max: number;
  avg: number;
  p95: number;
  p99: number;
}

class PerformanceMetrics {
  private cacheHits = 0;
  private cacheMisses = 0;
  private rateLimitViolations = 0;
  private responseTimes: number[] = [];
  private totalRequests = 0;
  private searchRequests = 0;
  private analyticsRequests = 0;
  private errorCount = 0;
  private blockedIPs = new Set<string>();
  private startTime = Date.now();

  /**
   * Record a cache hit
   */
  recordCacheHit(): void {
    this.cacheHits++;
  }

  /**
   * Record a cache miss
   */
  recordCacheMiss(): void {
    this.cacheMisses++;
  }

  /**
   * Record a rate limit violation
   */
  recordRateLimitViolation(ip: string): void {
    this.rateLimitViolations++;
    this.blockedIPs.add(ip);
  }

  /**
   * Record response time in milliseconds
   */
  recordResponseTime(ms: number): void {
    this.responseTimes.push(ms);
    // Keep only last 1000 response times to avoid memory issues
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }
  }

  /**
   * Record a request
   */
  recordRequest(type: 'search' | 'analytics' | 'other'): void {
    this.totalRequests++;
    if (type === 'search') {
      this.searchRequests++;
    } else if (type === 'analytics') {
      this.analyticsRequests++;
    }
  }

  /**
   * Record an error
   */
  recordError(): void {
    this.errorCount++;
  }

  /**
   * Get cache metrics
   */
  getCacheMetrics(): CacheMetrics {
    const total = this.cacheHits + this.cacheMisses;
    const hitRate = total > 0 ? (this.cacheHits / total) * 100 : 0;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  /**
   * Get rate limit metrics
   */
  getRateLimitMetrics(): RateLimitMetrics {
    return {
      violations: this.rateLimitViolations,
      blockedIPs: new Set(this.blockedIPs),
    };
  }

  /**
   * Get response time metrics
   */
  getResponseTimeMetrics(): ResponseTimeMetrics {
    if (this.responseTimes.length === 0) {
      return { min: 0, max: 0, avg: 0, p95: 0, p99: 0 };
    }

    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    return {
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      avg: Math.round(avg * 100) / 100,
      p95: Math.round(sorted[p95Index] * 100) / 100,
      p99: Math.round(sorted[p99Index] * 100) / 100,
    };
  }

  /**
   * Get current metrics snapshot
   */
  getSnapshot(): MetricSnapshot {
    return {
      timestamp: Date.now(),
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      rateLimitViolations: this.rateLimitViolations,
      avgResponseTime: this.getResponseTimeMetrics().avg,
      totalRequests: this.totalRequests,
      searchRequests: this.searchRequests,
      analyticsRequests: this.analyticsRequests,
      errorCount: this.errorCount,
    };
  }

  /**
   * Get comprehensive metrics report
   */
  getReport() {
    const uptime = Date.now() - this.startTime;
    const cacheMetrics = this.getCacheMetrics();
    const rateLimitMetrics = this.getRateLimitMetrics();
    const responseTimeMetrics = this.getResponseTimeMetrics();

    return {
      uptime: Math.round(uptime / 1000), // seconds
      totalRequests: this.totalRequests,
      searchRequests: this.searchRequests,
      analyticsRequests: this.analyticsRequests,
      errorCount: this.errorCount,
      errorRate: this.totalRequests > 0 ? (this.errorCount / this.totalRequests) * 100 : 0,
      cache: cacheMetrics,
      rateLimit: {
        violations: rateLimitMetrics.violations,
        uniqueBlockedIPs: rateLimitMetrics.blockedIPs.size,
      },
      responseTime: responseTimeMetrics,
      requestsPerSecond: Math.round((this.totalRequests / (uptime / 1000)) * 100) / 100,
    };
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.rateLimitViolations = 0;
    this.responseTimes = [];
    this.totalRequests = 0;
    this.searchRequests = 0;
    this.analyticsRequests = 0;
    this.errorCount = 0;
    this.blockedIPs.clear();
    this.startTime = Date.now();
  }
}

// Export singleton instance
export const metrics = new PerformanceMetrics();
