import { eq, like } from "drizzle-orm";
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


// Analytics functions
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

export async function getTotalSearches() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(searchAnalytics);
  return result[0]?.count || 0;
}

export async function getAverageResponseTime() {
  const db = await getDb();
  if (!db) return 0;
  try {
    const result = await db.select({ avg: count() }).from(searchAnalytics).limit(1);
    return Math.round(Math.random() * 300 + 100); // Mock for now
  } catch (error) {
    return 0;
  }
}

export async function getActiveUsers() {
  const db = await getDb();
  if (!db) return 0;
  try {
    const result = await db.select({ count: count() }).from(userSessions).limit(1);
    return Math.round(Math.random() * 500 + 100); // Mock for now
  } catch (error) {
    return 0;
  }
}

export async function getPopularSearches(days: number = 7) {
  const db = await getDb();
  if (!db) return [];
  try {
    const result = await db.select({ query: searchAnalytics.query, count: count() })
      .from(searchAnalytics)
      .groupBy(searchAnalytics.query)
      .orderBy(count())
      .limit(10);
    return result;
  } catch (error) {
    return [];
  }
}

export async function getCoverageRate() {
  const db = await getDb();
  if (!db) return 0;
  try {
    const total = await db.select({ count: count() }).from(medications);
    const covered = await db.select({ count: count() }).from(medications).where(
      eq(medications.coverageStatus, "COVERED")
    );
    const totalCount = total[0]?.count || 1;
    const coveredCount = covered[0]?.count || 0;
    return Math.round((coveredCount / totalCount) * 100);
  } catch (error) {
    return 0;
  }
}
