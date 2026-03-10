/**
 * Real Analytics Module
 * Queries actual database records for live metrics and analytics
 */

import { getDb } from "./db";
import { searchAnalytics } from "../drizzle/schema";
import { gte, desc, sql } from "drizzle-orm";

/**
 * Get top searches in the last N hours
 */
export async function getTopSearches(hoursBack: number = 24, limit: number = 10) {
  try {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const db = await getDb();

    const results = await db
      .select({
        query: searchAnalytics.query,
        count: sql<number>`COUNT(*) as count`,
      })
      .from(searchAnalytics)
      .where(gte(searchAnalytics.createdAt, cutoffTime))
      .groupBy(searchAnalytics.query)
      .orderBy(desc(sql<number>`COUNT(*)`))
      .limit(limit);

    return results.map((r: any) => ({
      term: r.query,
      count: Number(r.count),
    }));
  } catch (error) {
    console.error("Error fetching top searches:", error);
    return [];
  }
}

/**
 * Get total searches in the last N hours
 */
export async function getTotalSearches(hoursBack: number = 24) {
  try {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const db = await getDb();

    const result = await db
      .select({
        count: sql<number>`COUNT(*) as count`,
      })
      .from(searchAnalytics)
      .where(gte(searchAnalytics.createdAt, cutoffTime));

    return Number(result[0]?.count || 0);
  } catch (error) {
    console.error("Error fetching total searches:", error);
    return 0;
  }
}

/**
 * Get unique users in the last N hours
 */
export async function getUniqueUsers(hoursBack: number = 24) {
  try {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const db = await getDb();

    const result = await db
      .select({
        count: sql<number>`COUNT(DISTINCT user_id) as count`,
      })
      .from(searchAnalytics)
      .where(gte(searchAnalytics.createdAt, cutoffTime));

    return Number(result[0]?.count || 0);
  } catch (error) {
    console.error("Error fetching unique users:", error);
    return 0;
  }
}

/**
 * Get searches by hour (for hourly activity chart)
 */
export async function getHourlyActivity(hoursBack: number = 24) {
  try {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const db = await getDb();

    const results = await db
      .select({
        hour: sql<string>`DATE_FORMAT(createdAt, '%H:00') as hour`,
        count: sql<number>`COUNT(*) as count`,
      })
      .from(searchAnalytics)
      .where(gte(searchAnalytics.createdAt, cutoffTime))
      .groupBy(sql`DATE_FORMAT(createdAt, '%H:00')`)
      .orderBy(sql`DATE_FORMAT(createdAt, '%H:00')`);

    return results.map((r: any) => ({
      hour: r.hour,
      users: Number(r.count),
    }));
  } catch (error) {
    console.error("Error fetching hourly activity:", error);
    return [];
  }
}

/**
 * Get recent searches
 */
export async function getRecentSearches(limit: number = 10) {
  try {
    const db = await getDb();
    const results = await db
      .select({
        query: searchAnalytics.query,
        createdAt: searchAnalytics.createdAt,
        resultsCount: searchAnalytics.resultsCount,
      })
      .from(searchAnalytics)
      .orderBy(desc(searchAnalytics.createdAt))
      .limit(limit);

    return results.map((r: any) => ({
      term: r.query,
      timestamp: r.createdAt,
      results: r.resultsCount,
    }));
  } catch (error) {
    console.error("Error fetching recent searches:", error);
    return [];
  }
}

/**
 * Get search statistics
 */
export async function getSearchStats(hoursBack: number = 24) {
  try {
    const totalSearches = await getTotalSearches(hoursBack);
    const uniqueUsers = await getUniqueUsers(hoursBack);
    const topSearches = await getTopSearches(hoursBack, 5);

    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const db = await getDb();

    // Calculate average results per search
    const avgResult = await db
      .select({
        avg: sql<number>`AVG(results_count) as avg`,
      })
      .from(searchAnalytics)
      .where(gte(searchAnalytics.createdAt, cutoffTime));

    return {
      totalSearches,
      uniqueUsers,
      avgResultsPerSearch: Math.round(Number(avgResult[0]?.avg || 0)),
      topSearches,
    };
  } catch (error) {
    console.error("Error fetching search stats:", error);
    return {
      totalSearches: 0,
      uniqueUsers: 0,
      avgResultsPerSearch: 0,
      topSearches: [],
    };
  }
}

/**
 * Log a search to analytics
 */
export async function logSearch(
  query: string,
  resultsCount: number,
  userId?: number,
  searchType: string = "general"
) {
  try {
    const db = await getDb();
    await db.insert(searchAnalytics).values({
      query,
      resultsCount,
      userId: userId || null,
      searchType,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to log search:", error);
  }
}

/**
 * Get analytics dashboard data
 */
export async function getDashboardAnalytics() {
  try {
    const stats24h = await getSearchStats(24);
    const stats7d = await getSearchStats(24 * 7);
    const hourlyActivity = await getHourlyActivity(24);
    const recentSearches = await getRecentSearches(10);

    return {
      last24Hours: stats24h,
      last7Days: stats7d,
      hourlyActivity,
      recentSearches,
    };
  } catch (error) {
    console.error("Error fetching dashboard analytics:", error);
    return {
      last24Hours: { totalSearches: 0, uniqueUsers: 0, avgResultsPerSearch: 0, topSearches: [] },
      last7Days: { totalSearches: 0, uniqueUsers: 0, avgResultsPerSearch: 0, topSearches: [] },
      hourlyActivity: [],
      recentSearches: [],
    };
  }
}
