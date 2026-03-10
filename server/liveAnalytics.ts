/**
 * Live Analytics System
 * Tracks searches in real-time and persists to database
 */

import { getDb } from "./db";
import { searchAnalytics } from "../drizzle/schema";
import { desc, gte, sql } from "drizzle-orm";

interface SearchRecord {
  query: string;
  count: number;
  timestamp: Date;
}

interface AnalyticsSnapshot {
  totalSearches: number;
  uniqueSearchTerms: number;
  topSearches: Array<{ term: string; count: number }>;
  recentSearches: SearchRecord[];
  hourlyActivity: Array<{ hour: string; count: number }>;
}

class LiveAnalyticsStore {
  private searchLog: Map<string, number> = new Map();
  private recentSearches: SearchRecord[] = [];
  private maxRecentSearches = 100;

  /**
   * Log a search query
   */
  async logSearch(query: string, resultsCount: number, userId?: number) {
    try {
      // Update in-memory counters
      const normalized = query.toLowerCase().trim();
      this.searchLog.set(normalized, (this.searchLog.get(normalized) || 0) + 1);

      // Add to recent searches
      this.recentSearches.unshift({
        query,
        count: resultsCount,
        timestamp: new Date(),
      });

      // Keep only last N searches
      if (this.recentSearches.length > this.maxRecentSearches) {
        this.recentSearches = this.recentSearches.slice(0, this.maxRecentSearches);
      }

      // Persist to database asynchronously (don't block)
      this.persistToDatabase(query, resultsCount, userId).catch((err) => {
        console.error("Failed to persist search to database:", err);
      });
    } catch (error) {
      console.error("Error logging search:", error);
    }
  }

  /**
   * Persist search to database
   */
  private async persistToDatabase(query: string, resultsCount: number, userId?: number) {
    try {
      const db = await getDb();
      await db.insert(searchAnalytics).values({
        query,
        resultsCount,
        userId: userId || null,
        searchType: "general",
        createdAt: new Date(),
      });
    } catch (error) {
      console.error("Database persistence error:", error);
    }
  }

  /**
   * Get current analytics snapshot
   */
  getSnapshot(): AnalyticsSnapshot {
    // Calculate top searches from in-memory log
    const topSearches = Array.from(this.searchLog.entries())
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate hourly activity from recent searches
    const hourlyMap = new Map<string, number>();
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourStr = hour.getHours().toString().padStart(2, "0") + ":00";
      hourlyMap.set(hourStr, 0);
    }

    for (const search of this.recentSearches) {
      const hour = search.timestamp.getHours().toString().padStart(2, "0") + ":00";
      hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
    }

    const hourlyActivity = Array.from(hourlyMap.entries())
      .map(([hour, count]) => ({ hour, count }))
      .reverse();

    return {
      totalSearches: this.recentSearches.length,
      uniqueSearchTerms: this.searchLog.size,
      topSearches,
      recentSearches: this.recentSearches.slice(0, 20),
      hourlyActivity,
    };
  }

  /**
   * Get analytics from database (historical data)
   */
  async getDatabaseAnalytics(hoursBack: number = 24) {
    try {
      const db = await getDb();
      const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

      // Get top searches
      const topSearches = await db
        .select({
          query: searchAnalytics.query,
          count: sql<number>`COUNT(*) as count`,
        })
        .from(searchAnalytics)
        .where(gte(searchAnalytics.createdAt, cutoffTime))
        .groupBy(searchAnalytics.query)
        .orderBy(desc(sql<number>`COUNT(*)`))
        .limit(10);

      // Get total searches
      const totalResult = await db
        .select({
          count: sql<number>`COUNT(*) as count`,
        })
        .from(searchAnalytics)
        .where(gte(searchAnalytics.createdAt, cutoffTime));

      // Get recent searches
      const recentSearches = await db
        .select({
          query: searchAnalytics.query,
          resultsCount: searchAnalytics.resultsCount,
          createdAt: searchAnalytics.createdAt,
        })
        .from(searchAnalytics)
        .where(gte(searchAnalytics.createdAt, cutoffTime))
        .orderBy(desc(searchAnalytics.createdAt))
        .limit(20);

      return {
        totalSearches: Number(totalResult[0]?.count || 0),
        topSearches: (topSearches as any[]).map((s) => ({
          term: s.query,
          count: Number(s.count),
        })),
        recentSearches: (recentSearches as any[]).map((s) => ({
          query: s.query,
          count: s.resultsCount,
          timestamp: s.createdAt,
        })),
      };
    } catch (error) {
      console.error("Error fetching database analytics:", error);
      return {
        totalSearches: 0,
        topSearches: [],
        recentSearches: [],
      };
    }
  }

  /**
   * Reset analytics (admin only)
   */
  reset() {
    this.searchLog.clear();
    this.recentSearches = [];
  }
}

// Export singleton instance
export const liveAnalytics = new LiveAnalyticsStore();
