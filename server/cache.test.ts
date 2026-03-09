import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LRUCache } from './cache';

describe('LRUCache', () => {
  let cache: LRUCache<string, any>;

  beforeEach(() => {
    cache = new LRUCache(3, 1000); // 3 entries max, 1 second TTL for testing
  });

  describe('Basic Operations', () => {
    it('should set and get values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should update existing keys', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      expect(cache.get('key1')).toBe('value2');
    });

    it('should delete keys', () => {
      cache.set('key1', 'value1');
      cache.delete('key1');
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used entry when max size exceeded', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // Should evict key1

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });

    it('should update LRU order on get', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      // Access key1 to make it most recently used
      cache.get('key1');
      
      // Add key4, should evict key2 (least recently used)
      cache.set('key4', 'value4');
      
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });
  });

  describe('TTL Expiration', () => {
    it('should expire entries after TTL', async () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should not expire entries before TTL', async () => {
      cache.set('key1', 'value1');
      
      // Wait less than TTL
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(cache.get('key1')).toBe('value1');
    });
  });

  describe('Cache Statistics', () => {
    it('should track hits and misses', () => {
      cache.set('key1', 'value1');
      
      cache.get('key1'); // Hit
      cache.get('key1'); // Hit
      cache.get('nonexistent'); // Miss
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
    });

    it('should report cache size', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      const stats = cache.getStats();
      expect(stats.size).toBe(2);
    });

    it('should report max size', () => {
      const stats = cache.getStats();
      expect(stats.maxSize).toBe(3);
    });
  });

  describe('Complex Data Types', () => {
    it('should cache objects', () => {
      const obj = { name: 'test', value: 123 };
      cache.set('obj', obj);
      expect(cache.get('obj')).toEqual(obj);
    });

    it('should cache arrays', () => {
      const arr = [1, 2, 3, { nested: 'value' }];
      cache.set('arr', arr);
      expect(cache.get('arr')).toEqual(arr);
    });

    it('should cache null and undefined', () => {
      cache.set('null', null);
      cache.set('undefined', undefined);
      
      expect(cache.get('null')).toBeNull();
      expect(cache.get('undefined')).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty cache', () => {
      const stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it('should handle single entry cache', () => {
      const singleCache = new LRUCache(1, 1000);
      singleCache.set('key1', 'value1');
      singleCache.set('key2', 'value2'); // Should evict key1
      
      expect(singleCache.get('key1')).toBeUndefined();
      expect(singleCache.get('key2')).toBe('value2');
    });

    it('should handle rapid successive operations', () => {
      for (let i = 0; i < 100; i++) {
        cache.set(`key${i}`, `value${i}`);
      }
      
      // Only last 3 should be in cache
      expect(cache.get(`key97`)).toBe('value97');
      expect(cache.get(`key98`)).toBe('value98');
      expect(cache.get(`key99`)).toBe('value99');
      expect(cache.get(`key0`)).toBeUndefined();
    });
  });
});
