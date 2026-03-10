/**
 * In-Memory LRU Cache with TTL Support
 * 
 * Implements Least Recently Used (LRU) eviction policy with Time-To-Live (TTL).
 * Stores the last N items in memory and automatically expires old entries.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: number;
}

export class LRUCache<K, V> {
  private cache: Map<K, CacheEntry<V>>;
  private readonly maxSize: number;
  private readonly ttlMs: number; // Time-to-live in milliseconds
  private hits: number = 0;
  private misses: number = 0;

  constructor(maxSize: number = 500, ttlMs: number = 30 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  /**
   * Get a value from cache if it exists and hasn't expired
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;

    return entry.data;
  }

  /**
   * Set a value in cache
   */
  set(key: K, data: V): void {
    // Remove if exists to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Remove least recently used (first entry) if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Delete a specific key
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }
}

// Legacy SearchCache class for backward compatibility
class SearchCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private readonly maxSize: number;
  private readonly ttlMs: number; // Time-to-live in milliseconds

  constructor(maxSize: number = 500, ttlMinutes: number = 30) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  /**
   * Get a value from cache if it exists and hasn't expired
   */
  get(key: string): T | null {
    const normalizedKey = this.normalizeKey(key);
    const entry = this.cache.get(normalizedKey);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp > this.ttlMs) {
      this.cache.delete(normalizedKey);
      return null;
    }

    return entry.data;
  }

  /**
   * Set a value in cache
   */
  set(key: string, data: T): void {
    const normalizedKey = this.normalizeKey(key);

    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(normalizedKey)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(normalizedKey, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; ttlMinutes: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlMinutes: this.ttlMs / 60 / 1000,
    };
  }

  /**
   * Normalize cache key (lowercase, trimmed)
   */
  private normalizeKey(key: string): string {
    return key.toLowerCase().trim();
  }
}

// Export singleton instance for search results
export const searchCache = new SearchCache(500, 30);

// Export singleton instance for analytics data
export const analyticsCache = new SearchCache(100, 60); // 100 entries, 60 minutes TTL
