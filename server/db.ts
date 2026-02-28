import { drizzle, MySql2Database } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  medications, 
  medicationTradeNames,
  medicationIndications,
  medicationCodes,
  conditions, 
  conditionCodes,
  conditionMedications,
  codes, 
  codeBranches,
  nonCoveredCodes, 
  searchAnalytics, 
  userSessions, 
  type Medication, 
  type Condition, 
  type Code,
  type CodeBranch,
  type MedicationTradeName,
  type MedicationIndication,
  type NonCoveredCode, 
  type InsertSearchAnalytic 
} from "../drizzle/schema";
import { count, eq, inArray, and, sql } from "drizzle-orm";
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

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const user = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    return user.length > 0 ? user[0] : null;
  } catch (error) {
    console.error("[Database] Error getting user by openId:", error);
    return null;
  }
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
    updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Error upserting user:", error);
    throw error;
  }
}

// ============================================================================
// MEDICATION QUERIES
// ============================================================================

export async function getMedicationById(id: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const med = await db.select().from(medications).where(eq(medications.id, id)).limit(1);
    if (!med.length) return null;

    // Get trade names
    const tradeNames = await db
      .select({ tradeName: medicationTradeNames.tradeName })
      .from(medicationTradeNames)
      .where(eq(medicationTradeNames.medicationId, id));

    // Get indications
    const indications = await db
      .select({ indication: medicationIndications.indication })
      .from(medicationIndications)
      .where(eq(medicationIndications.medicationId, id));

    // Get codes
    const relatedCodes = await db
      .select({ code: codes.code, description: codes.description })
      .from(medicationCodes)
      .innerJoin(codes, eq(medicationCodes.codeId, codes.id))
      .where(eq(medicationCodes.medicationId, id));

    return {
      ...med[0],
      tradeNames: tradeNames.map(t => t.tradeName),
      indications: indications.map(i => i.indication),
      icdCodes: relatedCodes.map(c => c.code),
    };
  } catch (error) {
    console.error("[Database] Error getting medication:", error);
    return null;
  }
}

export async function getAllMedications() {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(medications);
  } catch (error) {
    console.error("[Database] Error getting all medications:", error);
    return [];
  }
}

export async function searchMedications(query: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    const searchPattern = `%${query}%`;
    
    // Search in scientific names
    const meds = await db
      .select({ id: medications.id })
      .from(medications)
      .where(sql`${medications.scientificName} LIKE ${searchPattern}`)
      .limit(100);

    const medIds = meds.map(m => m.id);
    if (!medIds.length) return [];

    // Get full medication details
    const results = [];
    for (const id of medIds) {
      const med = await getMedicationById(id);
      if (med) results.push(med);
    }
    return results;
  } catch (error) {
    console.error("[Database] Error searching medications:", error);
    return [];
  }
}

// ============================================================================
// CODE QUERIES
// ============================================================================

export async function getCodeById(id: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const code = await db.select().from(codes).where(eq(codes.id, id)).limit(1);
    if (!code.length) return null;

    // Get branches
    const branches = await db
      .select({ code: codeBranches.branchCode, description: codeBranches.branchDescription })
      .from(codeBranches)
      .where(eq(codeBranches.parentCodeId, id));

    // Get related medications
    const relatedMeds = await db
      .select({ id: medications.id, scientificName: medications.scientificName })
      .from(medicationCodes)
      .innerJoin(medications, eq(medicationCodes.medicationId, medications.id))
      .where(eq(medicationCodes.codeId, id));

    return {
      ...code[0],
      branches: branches,
      relatedMedications: relatedMeds,
    };
  } catch (error) {
    console.error("[Database] Error getting code:", error);
    return null;
  }
}

export async function getCodeByCode(codeString: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const code = await db.select().from(codes).where(eq(codes.code, codeString)).limit(1);
    if (!code.length) return null;

    return await getCodeById(code[0].id);
  } catch (error) {
    console.error("[Database] Error getting code by code string:", error);
    return null;
  }
}

export async function getAllCodes() {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(codes);
  } catch (error) {
    console.error("[Database] Error getting all codes:", error);
    return [];
  }
}

export async function getCodesWithBranches() {
  const db = await getDb();
  if (!db) return [];

  try {
    const allCodes = await db.select().from(codes);
    
    const results = [];
    for (const code of allCodes) {
      const branches = await db
        .select()
        .from(codeBranches)
        .where(eq(codeBranches.parentCodeId, code.id));
      
      results.push({
        ...code,
        branches: branches,
      });
    }
    return results;
  } catch (error) {
    console.error("[Database] Error getting codes with branches:", error);
    return [];
  }
}

// ============================================================================
// CONDITION QUERIES
// ============================================================================

export async function getConditionById(id: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const condition = await db.select().from(conditions).where(eq(conditions.id, id)).limit(1);
    if (!condition.length) return null;

    // Get related codes
    const relatedCodes = await db
      .select({ code: codes.code, description: codes.description })
      .from(conditionCodes)
      .innerJoin(codes, eq(conditionCodes.codeId, codes.id))
      .where(eq(conditionCodes.conditionId, id));

    // Get related medications
    const relatedMeds = await db
      .select({ id: medications.id, scientificName: medications.scientificName })
      .from(conditionMedications)
      .innerJoin(medications, eq(conditionMedications.medicationId, medications.id))
      .where(eq(conditionMedications.conditionId, id));

    return {
      ...condition[0],
      relatedCodes: relatedCodes,
      relatedMedications: relatedMeds,
    };
  } catch (error) {
    console.error("[Database] Error getting condition:", error);
    return null;
  }
}

export async function getAllConditions() {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(conditions);
  } catch (error) {
    console.error("[Database] Error getting all conditions:", error);
    return [];
  }
}

// ============================================================================
// NON-COVERED CODE QUERIES
// ============================================================================

export async function getNonCoveredCodes() {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(nonCoveredCodes);
  } catch (error) {
    console.error("[Database] Error getting non-covered codes:", error);
    return [];
  }
}

// ============================================================================
// STATISTICS QUERIES
// ============================================================================

export async function getStatistics() {
  const db = await getDb();
  if (!db) return { medications: 0, conditions: 0, codes: 0, branches: 0 };

  try {
    const medCount = await db.select({ count: count() }).from(medications);
    const condCount = await db.select({ count: count() }).from(conditions);
    const codeCount = await db.select({ count: count() }).from(codes);
    const branchCount = await db.select({ count: count() }).from(codeBranches);

    return {
      medications: medCount[0]?.count || 0,
      conditions: condCount[0]?.count || 0,
      codes: codeCount[0]?.count || 0,
      branches: branchCount[0]?.count || 0,
    };
  } catch (error) {
    console.error("[Database] Error getting statistics:", error);
    return { medications: 0, conditions: 0, codes: 0, branches: 0 };
  }
}

// ============================================================================
// SEARCH ANALYTICS
// ============================================================================

export async function recordSearch(query: string, resultsCount: number, responseTime: number, userId?: number) {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(searchAnalytics).values({
      query,
      resultsCount,
      responseTime,
      userId: userId || null,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("[Database] Error recording search:", error);
  }
}

// ============================================================================
// USER SESSION QUERIES
// ============================================================================

export async function createUserSession(userId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(userSessions).values({
      userId,
      sessionStart: new Date(),
      isActive: true,
    });
    return result;
  } catch (error) {
    console.error("[Database] Error creating user session:", error);
    return null;
  }
}

export async function endUserSession(sessionId: number) {
  const db = await getDb();
  if (!db) return;

  try {
    await db.update(userSessions)
      .set({ sessionEnd: new Date(), isActive: false })
      .where(eq(userSessions.id, sessionId));
  } catch (error) {
    console.error("[Database] Error ending user session:", error);
  }
}
