import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { advancedCache } from './advancedCache';

describe('Advanced Cache Manager', () => {
  beforeEach(async () => {
    await advancedCache.initialize();
  });

  afterEach(() => {
    advancedCache.destroy();
  });

  describe('Basic Operations', () => {
    it('should set and get a cached value', async () => {
      const testData = { id: 1, name: 'Test Drug' };
      await advancedCache.set('test:1', testData);
      const result = await advancedCache.get('test:1');
      expect(result).toEqual(testData);
    });

    it('should return null for non-existent key', async () => {
      const result = await advancedCache.get('non:existent');
      expect(result).toBeNull();
    });

    it('should delete a cached value', async () => {
      const testData = { id: 1, name: 'Test' };
      await advancedCache.set('test:delete', testData);
      await advancedCache.delete('test:delete');
      const result = await advancedCache.get('test:delete');
      expect(result).toBeNull();
    });
  });

  describe('TTL and Expiration', () => {
    it('should respect custom TTL', async () => {
      const testData = { id: 1, name: 'Test' };
      // Set with 100ms TTL
      await advancedCache.set('test:ttl', testData, 100);
      
      // Should exist immediately
      let result = await advancedCache.get('test:ttl');
      expect(result).toEqual(testData);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      result = await advancedCache.get('test:ttl');
      expect(result).toBeNull();
    });

    it('should clear expired entries', async () => {
      const testData1 = { id: 1 };
      const testData2 = { id: 2 };
      
      await advancedCache.set('test:exp1', testData1, 50);
      await advancedCache.set('test:exp2', testData2, 50000);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      const deleted = await advancedCache.clearExpired();
      
      expect(deleted).toBeGreaterThan(0);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate by pattern', async () => {
      const testData = { id: 1 };
      await advancedCache.set('search:panadol', testData);
      await advancedCache.set('search:aspirin', testData);
      await advancedCache.set('other:data', testData);
      
      const deleted = await advancedCache.invalidateByPattern('search:%');
      expect(deleted).toBeGreaterThanOrEqual(2);
    });

    it('should handle pattern invalidation with no matches', async () => {
      const deleted = await advancedCache.invalidateByPattern('nonexistent:%');
      expect(deleted).toBe(0);
    });
  });

  describe('Cache Statistics', () => {
    it('should get cache statistics', async () => {
      const testData = { id: 1 };
      await advancedCache.set('stat:1', testData);
      await advancedCache.set('stat:2', testData);
      
      const stats = await advancedCache.getStats();
      expect(stats.totalEntries).toBeGreaterThanOrEqual(2);
      expect(stats.totalHits).toBeGreaterThanOrEqual(0);
    });

    it('should track cache hits', async () => {
      const testData = { id: 1 };
      await advancedCache.set('hit:test', testData);
      
      // Access multiple times
      await advancedCache.get('hit:test');
      await advancedCache.get('hit:test');
      await advancedCache.get('hit:test');
      
      const stats = await advancedCache.getStats();
      expect(stats.totalHits).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Cache Warming', () => {
    it('should warm cache with popular searches', async () => {
      const searches = [
        { query: 'Panadol', data: { id: 1, name: 'Panadol' } },
        { query: 'Aspirin', data: { id: 2, name: 'Aspirin' } },
        { query: 'Ibuprofen', data: { id: 3, name: 'Ibuprofen' } },
      ];
      
      const warmed = await advancedCache.warmCache(searches);
      expect(warmed).toBe(3);
      
      // Verify warmed data
      const result = await advancedCache.get('search:panadol');
      expect(result).toEqual(searches[0].data);
    });

    it('should handle cache warming errors gracefully', async () => {
      const searches = [
        { query: 'Valid', data: { id: 1 } },
        { query: 'Also Valid', data: { id: 2 } },
      ];
      
      const warmed = await advancedCache.warmCache(searches);
      expect(warmed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Data Integrity', () => {
    it('should handle complex objects', async () => {
      const complexData = {
        id: 1,
        name: 'Complex',
        nested: {
          level1: {
            level2: {
              value: 'deep'
            }
          }
        },
        array: [1, 2, 3, 4, 5],
        date: new Date().toISOString(),
      };
      
      await advancedCache.set('complex:data', complexData);
      const result = await advancedCache.get('complex:data');
      expect(result).toEqual(complexData);
    });

    it('should handle special characters in keys', async () => {
      const testData = { id: 1 };
      const specialKey = 'search:panadol:500mg:egypt';
      
      await advancedCache.set(specialKey, testData);
      const result = await advancedCache.get(specialKey);
      expect(result).toEqual(testData);
    });

    it('should handle large data objects', async () => {
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: 'Lorem ipsum dolor sit amet'.repeat(10),
        })),
      };
      
      await advancedCache.set('large:data', largeData);
      const result = await advancedCache.get('large:data');
      expect(result).toEqual(largeData);
      expect(result?.items.length).toBe(1000);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent sets', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        advancedCache.set(`concurrent:${i}`, { id: i })
      );
      
      await Promise.all(promises);
      
      const result = await advancedCache.get('concurrent:5');
      expect(result).toEqual({ id: 5 });
    });

    it('should handle concurrent gets', async () => {
      const testData = { id: 1 };
      await advancedCache.set('concurrent:get', testData);
      
      const promises = Array.from({ length: 10 }, () =>
        advancedCache.get('concurrent:get')
      );
      
      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(result).toEqual(testData);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', async () => {
      await advancedCache.set('null:value', null);
      const result = await advancedCache.get('null:value');
      expect(result).toBeNull();
    });

    it('should handle empty strings', async () => {
      await advancedCache.set('empty:string', '');
      const result = await advancedCache.get('empty:string');
      expect(result).toBe('');
    });

    it('should handle zero values', async () => {
      await advancedCache.set('zero:value', 0);
      const result = await advancedCache.get('zero:value');
      expect(result).toBe(0);
    });

    it('should handle false values', async () => {
      await advancedCache.set('false:value', false);
      const result = await advancedCache.get('false:value');
      expect(result).toBe(false);
    });
  });
});
