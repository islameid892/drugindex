import { describe, it, expect, vi } from 'vitest';
import * as db from '../db';

describe('Analytics Functions', () => {
  describe('getTotalSearches', () => {
    it('should return a number', async () => {
      const result = await db.getTotalSearches();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getAverageResponseTime', () => {
    it('should return a number', async () => {
      const result = await db.getAverageResponseTime();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getActiveUsers', () => {
    it('should return a number', async () => {
      const result = await db.getActiveUsers();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getPopularSearches', () => {
    it('should return an array', async () => {
      const result = await db.getPopularSearches(10);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return items with term and count', async () => {
      const result = await db.getPopularSearches(10);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('term');
        expect(result[0]).toHaveProperty('count');
        expect(typeof result[0].term).toBe('string');
        expect(typeof result[0].count).toBe('number');
      }
    });

    it('should respect limit parameter', async () => {
      const result = await db.getPopularSearches(3);
      expect(result.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getSearchTrend', () => {
    it('should return an array', async () => {
      const result = await db.getSearchTrend(7);
      expect(Array.isArray(result)).toBe(true);
      // Returns 7 days when there is data, or empty when DB has no records
      expect(result.length === 0 || result.length === 7).toBe(true);
    });

    it('should have date and searches fields', async () => {
      const result = await db.getSearchTrend(7);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('date');
        expect(result[0]).toHaveProperty('searches');
        expect(typeof result[0].date).toBe('string');
        expect(typeof result[0].searches).toBe('number');
      }
    });
  });

  describe('getDatabaseStats', () => {
    it('should return database statistics', async () => {
      const result = await db.getDatabaseStats();
      expect(result).toHaveProperty('totalCodes');
      expect(result).toHaveProperty('totalNonCovered');
      expect(result).toHaveProperty('totalMedications');
      expect(result).toHaveProperty('totalConditions');
      expect(typeof result.totalCodes).toBe('number');
      expect(typeof result.totalNonCovered).toBe('number');
      expect(typeof result.totalMedications).toBe('number');
      expect(typeof result.totalConditions).toBe('number');
    });

    it('should return non-negative values', async () => {
      const result = await db.getDatabaseStats();
      expect(result.totalCodes).toBeGreaterThanOrEqual(0);
      expect(result.totalNonCovered).toBeGreaterThanOrEqual(0);
      expect(result.totalMedications).toBeGreaterThanOrEqual(0);
      expect(result.totalConditions).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getCoverageRate', () => {
    it('should return coverage data with covered, uncovered, and rate', async () => {
      const result = await db.getCoverageRate();
      expect(result).toHaveProperty('covered');
      expect(result).toHaveProperty('uncovered');
      expect(result).toHaveProperty('rate');
      expect(typeof result.covered).toBe('number');
      expect(typeof result.uncovered).toBe('number');
      expect(typeof result.rate).toBe('number');
    });

    it('should have rate between 0 and 100', async () => {
      const result = await db.getCoverageRate();
      expect(result.rate).toBeGreaterThanOrEqual(0);
      expect(result.rate).toBeLessThanOrEqual(100);
    });
  });

  describe('recordSearch', () => {
    it('should record a search event', async () => {
      const result = await db.recordSearch({
        query: 'test_analytics_query',
        resultsCount: 5,
        responseTime: 150,
        timestamp: new Date(),
      });
      // Should not throw
      expect(result).toBeDefined();
    });
  });

  describe('getTodaySearchVolume', () => {
    it('should return a number', async () => {
      const result = await db.getTodaySearchVolume();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getRecentSearches', () => {
    it('should return an array', async () => {
      const result = await db.getRecentSearches(20);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const result = await db.getRecentSearches(5);
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should have proper fields', async () => {
      const result = await db.getRecentSearches(5);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('query');
        expect(result[0]).toHaveProperty('resultsCount');
        expect(result[0]).toHaveProperty('responseTime');
        expect(result[0]).toHaveProperty('timestamp');
      }
    });
  });
});
