/**
 * Advanced Caching Strategies (In-Memory)
 * - Query result caching with TTL
 * - Cache invalidation strategies
 * - Cache warming for popular searches
 */

export interface CacheEntry<T> {
  key: string;
  value: T;
  expiresAt: number;
  hits: number;
  createdAt: number;
}

export interface CacheStats {
  totalEntries: number;
  expiredEntries: number;
  totalHits: number;
  avgHitsPerEntry: number;
}

class AdvancedCacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private totalHits = 0;

  /**
   * Initialize the cache manager and start cleanup
   */
  async initialize(): Promise<void> {
    try {
      this.startCleanup();
      console.log("✅ Advanced cache manager initialized");
    } catch (error) {
      console.error("Failed to initialize advanced cache:", error);
    }
  }

  /**
   * Get a cached value
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const entry = this.cache.get(key);

      // Check if entry exists and not expired
      if (!entry || entry.expiresAt < Date.now()) {
        return null;
      }

      // Increment hits
      entry.hits++;
      this.totalHits++;

      return entry.value as T;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a cached value
   */
  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    try {
      const expiresAt = Date.now() + (ttlMs || this.DEFAULT_TTL);

      this.cache.set(key, {
        key,
        value,
        expiresAt,
        hits: 0,
        createdAt: Date.now(),
      });
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete a cached value
   */
  async delete(key: string): Promise<void> {
    try {
      this.cache.delete(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Clear all expired entries
   */
  async clearExpired(): Promise<number> {
    try {
      let deleted = 0;
      const now = Date.now();

      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiresAt < now) {
          this.cache.delete(key);
          deleted++;
        }
      }

      return deleted;
    } catch (error) {
      console.error("Cache cleanup error:", error);
      return 0;
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    try {
      let deleted = 0;
      const regex = new RegExp(pattern.replace(/%/g, ".*"));

      for (const [key] of this.cache.entries()) {
        if (regex.test(key)) {
          this.cache.delete(key);
          deleted++;
        }
      }

      return deleted;
    } catch (error) {
      console.error(`Cache invalidation error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      let expiredCount = 0;
      let totalHits = 0;
      const now = Date.now();

      for (const entry of this.cache.values()) {
        if (entry.expiresAt < now) {
          expiredCount++;
        }
        totalHits += entry.hits;
      }

      const validEntries = this.cache.size - expiredCount;
      const avgHits = validEntries > 0 ? totalHits / validEntries : 0;

      return {
        totalEntries: this.cache.size,
        expiredEntries: expiredCount,
        totalHits,
        avgHitsPerEntry: avgHits,
      };
    } catch (error) {
      console.error("Cache stats error:", error);
      return {
        totalEntries: 0,
        expiredEntries: 0,
        totalHits: 0,
        avgHitsPerEntry: 0,
      };
    }
  }

  /**
   * Warm cache with popular searches
   */
  async warmCache(searches: Array<{ query: string; data: any }>): Promise<number> {
    let count = 0;
    for (const search of searches) {
      try {
        const key = `search:${search.query.toLowerCase()}`;
        await this.set(key, search.data, this.DEFAULT_TTL);
        count++;
      } catch (error) {
        console.error(`Failed to warm cache for ${search.query}:`, error);
      }
    }
    return count;
  }

  /**
   * Get all cache keys
   */
  async getKeys(): Promise<string[]> {
    return Array.from(this.cache.keys());
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.totalHits = 0;
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    if (this.cleanupInterval) return;

    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(async () => {
      try {
        const deleted = await this.clearExpired();
        if (deleted > 0) {
          console.log(`🧹 Cache cleanup: removed ${deleted} expired entries`);
        }
      } catch (error) {
        console.error("Cleanup interval error:", error);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Export singleton instance
export const advancedCache = new AdvancedCacheManager();
