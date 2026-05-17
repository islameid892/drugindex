import { describe, it, expect } from 'vitest';
import * as db from '../db';

/**
 * Analytics Functions Tests
 * Tests the actual db.ts functions used by the analytics and monitoring systems.
 * All assertions match the actual return shapes from the database.
 */
describe('Analytics Functions', () => {
  // ─── getTotalSearches ───────────────────────────────────────────────────────
  describe('getTotalSearches', () => {
    it('should return a non-negative number', async () => {
      const result = await db.getTotalSearches();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── getAverageResponseTime ─────────────────────────────────────────────────
  describe('getAverageResponseTime', () => {
    it('should return a number (avgResponseTime)', async () => {
      const result = await db.getAverageResponseTime();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── getActiveUsers ─────────────────────────────────────────────────────────
  describe('getActiveUsers', () => {
    it('should return a non-negative number', async () => {
      const result = await db.getActiveUsers();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── getPopularSearches ─────────────────────────────────────────────────────
  describe('getPopularSearches', () => {
    it('should return an array', async () => {
      const result = await db.getPopularSearches(10);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return items with query and count fields (actual DB shape)', async () => {
      const result = await db.getPopularSearches(10);
      if (result.length > 0) {
        // getPopularSearches returns { query, count } not { term, count }
        expect(result[0]).toHaveProperty('query');
        expect(result[0]).toHaveProperty('count');
        expect(typeof result[0].query).toBe('string');
        expect(typeof result[0].count).toBe('number');
      }
    });

    it('should respect limit parameter', async () => {
      const result = await db.getPopularSearches(3);
      expect(result.length).toBeLessThanOrEqual(3);
    });
  });

  // ─── getSearchTrend ─────────────────────────────────────────────────────────
  describe('getSearchTrend', () => {
    it('should return an array', async () => {
      const result = await db.getSearchTrend(7);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should have date and count fields (actual DB shape)', async () => {
      const result = await db.getSearchTrend(7);
      if (result.length > 0) {
        // getSearchTrend returns { date, count } not { date, searches }
        expect(result[0]).toHaveProperty('date');
        expect(result[0]).toHaveProperty('count');
        expect(typeof result[0].date).toBe('string');
        expect(typeof result[0].count).toBe('number');
      }
    });

    it('should return at most 8 rows for 7-day window (can span 8 calendar days)', async () => {
      const result = await db.getSearchTrend(7);
      // A 7-day window (168h) can span up to 8 calendar days depending on time of day
      expect(result.length).toBeLessThanOrEqual(8);
    });
  });

  // ─── getStats (replaces getDatabaseStats) ───────────────────────────────────
  describe('getStats', () => {
    it('should return database statistics with correct fields', async () => {
      const result = await db.getStats();
      expect(result).toHaveProperty('totalDrugEntries');
      expect(result).toHaveProperty('uniqueScientificNames');
      expect(result).toHaveProperty('uniqueTradeNames');
      expect(result).toHaveProperty('uniqueIndications');
      expect(result).toHaveProperty('totalCodes');
      expect(result).toHaveProperty('totalBranches');
      expect(result).toHaveProperty('nonCoveredCodes');
    });

    it('should return non-negative values', async () => {
      const result = await db.getStats();
      expect(result.totalDrugEntries).toBeGreaterThanOrEqual(0);
      expect(result.totalCodes).toBeGreaterThanOrEqual(0);
      expect(result.totalBranches).toBeGreaterThanOrEqual(0);
      expect(result.nonCoveredCodes).toBeGreaterThanOrEqual(0);
    });

    it('should have significant data (production DB has data)', async () => {
      const result = await db.getStats();
      // Production DB should have at least some entries
      expect(result.totalDrugEntries).toBeGreaterThan(0);
    });
  });

  // ─── recordSearch ───────────────────────────────────────────────────────────
  describe('recordSearch', () => {
    it('should record a search event without throwing', async () => {
      // InsertSearchAnalytic requires: query, resultsCount, responseTimeMs, searchType
      await expect(
        db.recordSearch({
          query: 'test_analytics_vitest',
          resultsCount: 5,
          responseTimeMs: 150,
          searchType: 'general',
        })
      ).resolves.not.toThrow();
    });
  });

  // ─── getTotalSearchesSince ──────────────────────────────────────────────────
  describe('getTotalSearchesSince', () => {
    it('should return a non-negative number for last 7 days', async () => {
      const result = await db.getTotalSearchesSince(7);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 or more for last 1 day', async () => {
      const result = await db.getTotalSearchesSince(1);
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── getRecentSearches ──────────────────────────────────────────────────────
  describe('getRecentSearches', () => {
    it('should return an array', async () => {
      const result = await db.getRecentSearches(20);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const result = await db.getRecentSearches(5);
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should have proper fields (actual DB shape: query, resultsCount, responseTimeMs, createdAt)', async () => {
      const result = await db.getRecentSearches(5);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('query');
        expect(result[0]).toHaveProperty('resultsCount');
        expect(result[0]).toHaveProperty('responseTimeMs');
        expect(result[0]).toHaveProperty('createdAt');
      }
    });
  });

  // ─── getTopSearches ─────────────────────────────────────────────────────────
  describe('getTopSearches', () => {
    it('should return an array', async () => {
      const result = await db.getTopSearches(10);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should have query and count fields', async () => {
      const result = await db.getTopSearches(5);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('query');
        expect(result[0]).toHaveProperty('count');
      }
    });

    it('should respect limit', async () => {
      const result = await db.getTopSearches(3);
      expect(result.length).toBeLessThanOrEqual(3);
    });
  });

  // ─── getActiveUsersCount ────────────────────────────────────────────────────
  describe('getActiveUsersCount', () => {
    it('should return a non-negative number', async () => {
      const result = await db.getActiveUsersCount(15);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── getHourlyActivity ──────────────────────────────────────────────────────
  describe('getHourlyActivity', () => {
    it('should return an array', async () => {
      const result = await db.getHourlyActivity(24);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should have hour and count fields', async () => {
      const result = await db.getHourlyActivity(24);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('hour');
        expect(result[0]).toHaveProperty('count');
      }
    });
  });

  // ─── getDashboard API shape ─────────────────────────────────────────────────
  describe('getDashboard API response shape', () => {
    it('getDashboard should return all required fields', async () => {
      // Test via direct HTTP call to ensure the full procedure works
      const response = await fetch('http://localhost:3000/api/trpc/analytics.getDashboard');
      expect(response.ok).toBe(true);
      const json = await response.json();
      const data = json.result.data.json;

      // Core metrics
      expect(data).toHaveProperty('totalSearches');
      expect(data).toHaveProperty('searchesToday');
      expect(data).toHaveProperty('searchesThisWeek');
      expect(data).toHaveProperty('registeredUsers');
      expect(data).toHaveProperty('avgResponseTime');
      expect(data).toHaveProperty('coverageRate');

      // Arrays
      expect(Array.isArray(data.weeklyTrends)).toBe(true);
      expect(Array.isArray(data.topSearches)).toBe(true);
      expect(Array.isArray(data.recentSearches)).toBe(true);

      // weeklyTrends items have date and count
      if (data.weeklyTrends.length > 0) {
        expect(data.weeklyTrends[0]).toHaveProperty('date');
        expect(data.weeklyTrends[0]).toHaveProperty('count');
        expect(typeof data.weeklyTrends[0].date).toBe('string');
        expect(typeof data.weeklyTrends[0].count).toBe('number');
      }

      // topSearches items have term and count
      if (data.topSearches.length > 0) {
        expect(data.topSearches[0]).toHaveProperty('term');
        expect(data.topSearches[0]).toHaveProperty('count');
      }

      // dbSummary exists
      expect(data).toHaveProperty('dbSummary');
      expect(data.dbSummary).toHaveProperty('icd10Count');
      expect(data.dbSummary).toHaveProperty('medicationsCount');
    });
  });

  // ─── monitoring.getAnalytics API shape ─────────────────────────────────────
  describe('monitoring.getAnalytics API response shape', () => {
    it('should return activeUsers, topSearches, hourlyActivity, recentSearches', async () => {
      const response = await fetch('http://localhost:3000/api/trpc/monitoring.getAnalytics');
      expect(response.ok).toBe(true);
      const json = await response.json();
      const data = json.result.data.json;

      expect(data).toHaveProperty('activeUsers');
      expect(Array.isArray(data.topSearches)).toBe(true);
      expect(Array.isArray(data.hourlyActivity)).toBe(true);
      expect(Array.isArray(data.recentSearches)).toBe(true);

      // topSearches items have term, count, avgResponseTime
      if (data.topSearches.length > 0) {
        expect(data.topSearches[0]).toHaveProperty('term');
        expect(data.topSearches[0]).toHaveProperty('count');
        expect(data.topSearches[0]).toHaveProperty('avgResponseTime');
        // avgResponseTime must be a number (not a string)
        expect(typeof data.topSearches[0].avgResponseTime).toBe('number');
      }
    });
  });
});
