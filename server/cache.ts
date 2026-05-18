interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: number;
}

export interface CacheAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, data: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  getStats(): CacheStats;
}

class InMemoryCacheAdapter implements CacheAdapter {
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private readonly maxSize: number;
  private readonly ttlMs: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize = 500, ttlMs = 30 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) { this.misses++; return null; }
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;
    return entry.data as T;
  }

  async set<T>(key: string, data: T): Promise<void> {
    if (this.cache.has(key)) this.cache.delete(key);
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

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

class LazyRedisAdapter implements CacheAdapter {
  private client: any = null;
  private initPromise: Promise<void> | null = null;
  private ready = false;

  private async ensureConnected(): Promise<void> {
    if (this.ready) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.connect();
    return this.initPromise;
  }

  private async connect(): Promise<void> {
    try {
      const ioredis = await import('ioredis');
      this.client = new ioredis.default(process.env.REDIS_URL!, {
        maxRetriesPerRequest: 3,
        retryStrategy(times: number) {
          return times > 3 ? null : Math.min(times * 200, 2000);
        },
        lazyConnect: true,
      });
      await this.client.connect();
      this.ready = true;
      console.log('[Cache] Redis connected');
    } catch (err) {
      console.warn('[Cache] Redis unavailable, using in-memory fallback');
      this.ready = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    await this.ensureConnected();
    if (!this.ready) return null;
    try {
      const raw = await this.client.get(key);
      return raw ? JSON.parse(raw) as T : null;
    } catch { return null; }
  }

  async set<T>(key: string, data: T, ttlMs = 30 * 60 * 1000): Promise<void> {
    await this.ensureConnected();
    if (!this.ready) return;
    try {
      await this.client.set(key, JSON.stringify(data), 'PX', ttlMs);
    } catch { /* fail silently */ }
  }

  async delete(key: string): Promise<boolean> {
    await this.ensureConnected();
    if (!this.ready) return false;
    try {
      const r = await this.client.del(key);
      return r > 0;
    } catch { return false; }
  }

  async clear(): Promise<void> {
    await this.ensureConnected();
    if (!this.ready) return;
    try { await this.client.flushdb(); } catch { /* fail silently */ }
  }

  getStats(): CacheStats {
    return { size: 0, maxSize: 0, hits: 0, misses: 0, hitRate: 0 };
  }
}

function createSearchCache(): CacheAdapter {
  if (process.env.REDIS_URL) {
    console.log('[Cache] Using Redis backend');
    return new LazyRedisAdapter();
  }
  console.log('[Cache] Using in-memory backend');
  return new InMemoryCacheAdapter(500, 30 * 60 * 1000);
}

export const searchCache: CacheAdapter = createSearchCache();
export const analyticsCache: CacheAdapter = new InMemoryCacheAdapter(100, 60 * 1000);
