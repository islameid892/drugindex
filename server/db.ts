import { eq, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, medications, conditions, codes, nonCoveredCodes, type Medication, type Condition, type Code, type NonCoveredCode } from "../drizzle/schema";
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
  return await db.select().from(medications).where(
    like(medications.scientificName, `%${query}%`)
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
  return await db.select().from(conditions).where(
    like(conditions.name, `%${query}%`)
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
  if (!db) return [];
  return await db.select().from(codes).where(
    like(codes.code, `%${query}%`)
  ).limit(100);
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
  return await db.select().from(nonCoveredCodes).where(
    like(nonCoveredCodes.code, `%${query}%`)
  ).limit(100);
}

export async function getNonCoveredCodeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(nonCoveredCodes).where(eq(nonCoveredCodes.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}
