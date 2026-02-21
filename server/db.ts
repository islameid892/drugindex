import { eq, like, sql, desc, gte, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, medications, conditions, codes, nonCoveredCodes, searchAnalytics, userSessions, type Medication, type Condition, type Code, type NonCoveredCode, type InsertSearchAnalytic } from "../drizzle/schema";
import { count } from "drizzle-orm";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.

// Medications queries
export async function getAllMedications() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(medications);
}

export async function searchMedications(query: string) {
  const db = await getDb();
  if (!db) return [];
  const lowerQuery = query.toLowerCase();
  return await db.select().from(medications).where(
    like(medications.scientificName, `%${lowerQuery}%`)
  ).limit(100);
}

export async function getMedicationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(medications).where(eq(medications.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Conditions queries
export async function getAllConditions() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(conditions);
}

export async function searchConditions(query: string) {
  const db = await getDb();
  if (!db) return [];
  const lowerQuery = query.toLowerCase();
  return await db.select().from(conditions).where(
    like(conditions.name, `%${lowerQuery}%`)
  ).limit(100);
}

export async function getConditionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(conditions).where(eq(conditions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Codes queries
export async function getAllCodes() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(codes);
}

export async function searchCodes(query: string) {
  const db = await getDb();
  if (!db) {
    console.log('DB connection failed');
    return [];
  }
  const upperQuery = query.toUpperCase();
  console.log('Searching code:', upperQuery);
  
  let result = await db.select().from(codes).where(
    eq(codes.code, upperQuery)
  ).limit(1);
  
  console.log('Exact match:', result.length);
  
  if (result.length === 0) {
    result = await db.select().from(codes).where(
      like(codes.code, `%${upperQuery}%`)
    ).limit(100);
    console.log('Partial match:', result.length);
  }
  
  return result;
}

export async function getCodeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(codes).where(eq(codes.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Non-Covered Codes queries
export async function getAllNonCoveredCodes() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(nonCoveredCodes);
}

export async function searchNonCoveredCodes(query: string) {
  const db = await getDb();
  if (!db) return [];
  const upperQuery = query.toUpperCase();
  // Try exact match first
  let result = await db.select().from(nonCoveredCodes).where(
    eq(nonCoveredCodes.code, upperQuery)
  ).limit(1);
  
  // If no exact match, try partial match
  if (result.length === 0) {
    result = await db.select().from(nonCoveredCodes).where(
      like(nonCoveredCodes.code, `%${upperQuery}%`)
    ).limit(100);
  }
  
  return result;
}

export async function getNonCoveredCodeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(nonCoveredCodes).where(eq(nonCoveredCodes.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}


// ===== Analytics functions =====

// Record a search event with response time
export async function recordSearch(data: InsertSearchAnalytic) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.insert(searchAnalytics).values(data);
    return result;
  } catch (error) {
    console.error("[Database] Failed to record search:", error);
    return undefined;
  }
}

// Get total number of searches (all time)
export async function getTotalSearches() {
  const db = await getDb();
  if (!db) return 0;
  try {
    const result = await db.select({ count: count() }).from(searchAnalytics);
    return result[0]?.count || 0;
  } catch (error) {
    console.error("[Database] Failed to get total searches:", error);
    return 0;
  }
}

// Get total searches in the last N days
export async function getTotalSearchesSince(days: number) {
  const db = await getDb();
  if (!db) return 0;
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const result = await db.select({ count: count() })
      .from(searchAnalytics)
      .where(gte(searchAnalytics.timestamp, since));
    return result[0]?.count || 0;
  } catch (error) {
    console.error("[Database] Failed to get recent searches:", error);
    return 0;
  }
}

// Get real average response time from search analytics
export async function getAverageResponseTime() {
  const db = await getDb();
  if (!db) return 0;
  try {
    const result = await db.select({
      avg: sql<number>`COALESCE(AVG(${searchAnalytics.responseTime}), 0)`
    }).from(searchAnalytics);
    return Math.round(result[0]?.avg || 0);
  } catch (error) {
    console.error("[Database] Failed to get avg response time:", error);
    return 0;
  }
}

// Get unique users count (from users table)
export async function getActiveUsers() {
  const db = await getDb();
  if (!db) return 0;
  try {
    const result = await db.select({ count: count() }).from(users);
    return result[0]?.count || 0;
  } catch (error) {
    console.error("[Database] Failed to get active users:", error);
    return 0;
  }
}

// Get unique searchers (distinct userId from searchAnalytics in last N days)
export async function getUniqueSearchers(days: number = 7) {
  const db = await getDb();
  if (!db) return 0;
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const result = await db.select({
      count: sql<number>`COUNT(DISTINCT ${searchAnalytics.userId})`
    })
      .from(searchAnalytics)
      .where(gte(searchAnalytics.timestamp, since));
    return result[0]?.count || 0;
  } catch (error) {
    console.error("[Database] Failed to get unique searchers:", error);
    return 0;
  }
}

// Get top searched terms (real data from DB)
export async function getPopularSearches(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  try {
    const result = await db.select({
      query: searchAnalytics.query,
      count: count()
    })
      .from(searchAnalytics)
      .groupBy(searchAnalytics.query)
      .orderBy(desc(count()))
      .limit(limit);
    return result.map(r => ({ term: r.query, count: r.count }));
  } catch (error) {
    console.error("[Database] Failed to get popular searches:", error);
    return [];
  }
}

// Get search trend for last N days (daily counts)
export async function getSearchTrend(days: number = 7) {
  const db = await getDb();
  if (!db) return [];
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    // Use raw SQL to avoid only_full_group_by issue
    const result = await db.execute(
      sql`SELECT DATE(\`timestamp\`) as search_date, COUNT(*) as search_count FROM \`searchAnalytics\` WHERE \`timestamp\` >= ${since} GROUP BY search_date ORDER BY search_date`
    ) as any;
    
    // Parse raw results
    const rows = (result[0] || result || []) as Array<{ search_date: string; search_count: number }>;
    
    // Fill in missing days with 0
    const trendMap = new Map<string, number>();
    rows.forEach((r: any) => {
      // search_date might be a Date object or string
      const dateStr = r.search_date instanceof Date 
        ? r.search_date.toISOString().split('T')[0] 
        : String(r.search_date);
      trendMap.set(dateStr, Number(r.search_count) || 0);
    });
    
    const trend: Array<{ date: string; searches: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      trend.push({
        date: `${dayName} ${d.getDate()}/${d.getMonth() + 1}`,
        searches: trendMap.get(dateStr) || 0
      });
    }
    
    return trend;
  } catch (error) {
    console.error("[Database] Failed to get search trend:", error);
    return [];
  }
}

// Get real database statistics
export async function getDatabaseStats() {
  const db = await getDb();
  if (!db) return { totalCodes: 0, totalNonCovered: 0, totalMedications: 0, totalConditions: 0 };
  try {
    const [codesCount, nonCoveredCount, medsCount, conditionsCount] = await Promise.all([
      db.select({ count: count() }).from(codes),
      db.select({ count: count() }).from(nonCoveredCodes),
      db.select({ count: count() }).from(medications),
      db.select({ count: count() }).from(conditions),
    ]);
    
    return {
      totalCodes: codesCount[0]?.count || 0,
      totalNonCovered: nonCoveredCount[0]?.count || 0,
      totalMedications: medsCount[0]?.count || 0,
      totalConditions: conditionsCount[0]?.count || 0,
    };
  } catch (error) {
    console.error("[Database] Failed to get database stats:", error);
    return { totalCodes: 0, totalNonCovered: 0, totalMedications: 0, totalConditions: 0 };
  }
}

// Get coverage rate from real data
export async function getCoverageRate() {
  const db = await getDb();
  if (!db) return { covered: 0, uncovered: 0, rate: 0 };
  try {
    const [totalCodesResult, nonCoveredResult] = await Promise.all([
      db.select({ count: count() }).from(codes),
      db.select({ count: count() }).from(nonCoveredCodes),
    ]);
    
    const totalCodes = totalCodesResult[0]?.count || 0;
    const nonCovered = nonCoveredResult[0]?.count || 0;
    const covered = totalCodes - nonCovered;
    const rate = totalCodes > 0 ? Math.round((covered / totalCodes) * 100) : 0;
    
    return { covered, uncovered: nonCovered, rate };
  } catch (error) {
    console.error("[Database] Failed to get coverage rate:", error);
    return { covered: 0, uncovered: 0, rate: 0 };
  }
}

// Get searches per hour for today (for performance insights)
export async function getTodaySearchVolume() {
  const db = await getDb();
  if (!db) return 0;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = await db.select({ count: count() })
      .from(searchAnalytics)
      .where(gte(searchAnalytics.timestamp, today));
    return result[0]?.count || 0;
  } catch (error) {
    return 0;
  }
}

// Get recent searches (last N)
export async function getRecentSearches(limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  try {
    const result = await db.select({
      query: searchAnalytics.query,
      resultsCount: searchAnalytics.resultsCount,
      responseTime: searchAnalytics.responseTime,
      timestamp: searchAnalytics.timestamp,
    })
      .from(searchAnalytics)
      .orderBy(desc(searchAnalytics.timestamp))
      .limit(limit);
    return result;
  } catch (error) {
    return [];
  }
}
