import { eq, sql, desc, gte, and, or, inArray, count } from "drizzle-orm";
import { drizzle, MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  InsertUser,
  users,
  icdCodes,
  icdBranches,
  nonCoveredCodes,
  medications,
  medicationTradeNames,
  medicationIndications,
  medicationCodes,
  searchAnalytics,
  type User,
  type InsertSearchAnalytic,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

// ─── DB Connection ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDB = MySql2Database<Record<string, never>>;
let _db: DrizzleDB | null = null;

export async function getDb() {
  if (_db) return _db;
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn("[Database] DATABASE_URL not set");
    return null;
  }
  try {
    const pool = mysql.createPool({
      uri: dbUrl,
      ssl: { rejectUnauthorized: false },
      waitForConnections: true,
      connectionLimit: 10,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _db = drizzle(pool as any, { mode: "default" }) as DrizzleDB;
    return _db;
  } catch (error) {
    console.warn("[Database] Failed to connect:", error);
    return null;
  }
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface MedicationResult {
  id: number;
  scientificName: string;
  tradeNames: string[];
  indications: string[];
  icdCodes: Array<{
    code: string;
    description: string;
    branchCount: number;
    isNonCovered: boolean;
    branches?: Array<{ branchCode: string; branchDescription: string }>;
  }>;
  coverageStatus: "COVERED" | "NON-COVERED" | "PARTIAL";
}

export interface CodeResult {
  id: number;
  code: string;
  description: string;
  branchCount: number;
  branches: Array<{ branchCode: string; branchDescription: string }>;
  isNonCovered: boolean;
}

// ─── Helper: case-insensitive LIKE ─────────────────────────────────────────────

// TiDB uses utf8mb4_bin collation by default which is case-sensitive.
// We use LOWER() on both sides for case-insensitive matching.
function ciLike(column: any, pattern: string) {
  return sql`LOWER(${column}) LIKE LOWER(${pattern})`;
}

// ─── Users ─────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    for (const field of textFields) {
      if (user[field] !== undefined) {
        values[field] = user[field] ?? null;
        updateSet[field] = user[field] ?? null;
      }
    }
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users);
}

// ─── Stats ─────────────────────────────────────────────────────────────────────

export async function getStats() {
  const db = await getDb();
  if (!db) return { medications: 0, conditions: 0, codes: 0 };

  const [medCount, indicationCount, codeCount, branchCount] = await Promise.all([
    db.select({ count: count() }).from(medications),
    db.select({ count: sql<number>`COUNT(DISTINCT indication)` }).from(medicationIndications),
    db.select({ count: count() }).from(icdCodes),
    db.select({ count: count() }).from(icdBranches),
  ]);

  return {
    medications: Number(medCount[0]?.count ?? 0),
    conditions: Number(indicationCount[0]?.count ?? 0),
    codes: Number(codeCount[0]?.count ?? 0) + Number(branchCount[0]?.count ?? 0),
  };
}

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return null;

  const [medCount, indicationCount, codeCount, branchCount, ncCount, userCount, searchCount] =
    await Promise.all([
      db.select({ count: count() }).from(medications),
      db.select({ count: sql<number>`COUNT(DISTINCT indication)` }).from(medicationIndications),
      db.select({ count: count() }).from(icdCodes),
      db.select({ count: count() }).from(icdBranches),
      db.select({ count: count() }).from(nonCoveredCodes),
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(searchAnalytics),
    ]);

  const meds = Number(medCount[0]?.count ?? 0);
  const conds = Number(indicationCount[0]?.count ?? 0);
  const mainCodes = Number(codeCount[0]?.count ?? 0);
  const branches = Number(branchCount[0]?.count ?? 0);
  return {
    medications: meds,
    totalMedications: meds,
    conditions: conds,
    totalConditions: conds,
    mainCodes,
    branches,
    totalCodes: mainCodes + branches,
    nonCoveredCodes: Number(ncCount[0]?.count ?? 0),
    totalNonCovered: Number(ncCount[0]?.count ?? 0),
    users: Number(userCount[0]?.count ?? 0),
    totalSearches: Number(searchCount[0]?.count ?? 0),
  };
}

// ─── Medications ───────────────────────────────────────────────────────────────

export async function searchMedications(query: string, limit = 50, offset = 0): Promise<MedicationResult[]> {
  const db = await getDb();
  if (!db) return [];

  const q = `%${query}%`;

  // Collect IDs from all matching sources using case-insensitive LOWER()
  const [byScientific, byTrade, byIndication, byCode] = await Promise.all([
    db.select({ id: medications.id }).from(medications)
      .where(ciLike(medications.scientificName, q)).limit(300),
    db.select({ id: medicationTradeNames.medicationId }).from(medicationTradeNames)
      .where(ciLike(medicationTradeNames.tradeName, q)).limit(300),
    db.select({ id: medicationIndications.medicationId }).from(medicationIndications)
      .where(ciLike(medicationIndications.indication, q)).limit(300),
    db.select({ id: medicationCodes.medicationId }).from(medicationCodes)
      .innerJoin(icdCodes, eq(medicationCodes.codeId, icdCodes.id))
      .where(ciLike(icdCodes.code, q)).limit(300),
  ]);

  const allIds = new Set<number>([
    ...byScientific.map((r) => r.id),
    ...byTrade.map((r) => r.id),
    ...byIndication.map((r) => r.id),
    ...byCode.map((r) => r.id),
  ]);

  if (allIds.size === 0) return [];
  const idArray = [...allIds].slice(offset, offset + limit);
  return await getMedicationsByIds(idArray);
}

export async function getMedicationsByIds(ids: number[]): Promise<MedicationResult[]> {
  if (ids.length === 0) return [];
  const db = await getDb();
  if (!db) return [];

  const [meds, tradeNames, indications, linkedCodes] = await Promise.all([
    db.select().from(medications).where(inArray(medications.id, ids)),
    db.select().from(medicationTradeNames).where(inArray(medicationTradeNames.medicationId, ids)),
    db.select().from(medicationIndications).where(inArray(medicationIndications.medicationId, ids)),
    db.select({
      medicationId: medicationCodes.medicationId,
      code: icdCodes.code,
      description: icdCodes.description,
      branchCount: icdCodes.branchCount,
    })
      .from(medicationCodes)
      .innerJoin(icdCodes, eq(medicationCodes.codeId, icdCodes.id))
      .where(inArray(medicationCodes.medicationId, ids)),
  ]);

  // Check non-covered
  const allCodes = Array.from(new Set(linkedCodes.map((c) => c.code)));
  let nonCoveredSet = new Set<string>();
  if (allCodes.length > 0) {
    const nc = await db
      .select({ code: nonCoveredCodes.code })
      .from(nonCoveredCodes)
      .where(inArray(nonCoveredCodes.code, allCodes));
    nonCoveredSet = new Set(nc.map((r) => r.code));
  }

  // Group
  const tradeMap = new Map<number, string[]>();
  const indicationMap = new Map<number, string[]>();
  const codeMap = new Map<number, Array<{ code: string; description: string; branchCount: number; isNonCovered: boolean }>>();

  for (const t of tradeNames) {
    if (!tradeMap.has(t.medicationId)) tradeMap.set(t.medicationId, []);
    tradeMap.get(t.medicationId)!.push(t.tradeName);
  }
  for (const i of indications) {
    if (!indicationMap.has(i.medicationId)) indicationMap.set(i.medicationId, []);
    indicationMap.get(i.medicationId)!.push(i.indication);
  }
  for (const c of linkedCodes) {
    if (!codeMap.has(c.medicationId)) codeMap.set(c.medicationId, []);
    codeMap.get(c.medicationId)!.push({
      code: c.code,
      description: c.description ?? "",
      branchCount: c.branchCount ?? 0,
      isNonCovered: nonCoveredSet.has(c.code),
    });
  }

  // Expand: each trade name becomes a separate result (matches original JSON behavior)
  const results: MedicationResult[] = [];
  for (const med of meds) {
    const codes = codeMap.get(med.id) ?? [];
    const hasNonCovered = codes.some((c) => c.isNonCovered);
    const hasCovered = codes.some((c) => !c.isNonCovered);
    const coverageStatus =
      codes.length === 0 ? "COVERED" :
      hasNonCovered && hasCovered ? "PARTIAL" :
      hasNonCovered ? "NON-COVERED" : "COVERED";

    const trades = tradeMap.get(med.id) ?? [];
    const inds = indicationMap.get(med.id) ?? [];

    if (trades.length <= 1) {
      // Single or no trade name - one result
      results.push({
        id: med.id,
        scientificName: med.scientificName,
        tradeNames: trades,
        indications: inds,
        icdCodes: codes,
        coverageStatus,
      });
    } else {
      // Multiple trade names - one result per trade name
      for (const tn of trades) {
        results.push({
          id: med.id,
          scientificName: med.scientificName,
          tradeNames: [tn],
          indications: inds,
          icdCodes: codes,
          coverageStatus,
        });
      }
    }
  }
  return results;
}

export async function getAllMedications(limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  const meds = await db.select().from(medications).limit(limit).offset(offset);
  return await getMedicationsByIds(meds.map((m) => m.id));
}

export async function getMedicationById(id: number): Promise<MedicationResult | null> {
  const results = await getMedicationsByIds([id]);
  return results[0] ?? null;
}

// ─── ICD Codes ─────────────────────────────────────────────────────────────────

export async function searchCodes(query: string, limit = 50): Promise<CodeResult[]> {
  const db = await getDb();
  if (!db) return [];

  const q = `%${query}%`;

  const [mainMatches, branchMatches] = await Promise.all([
    db.select().from(icdCodes)
      .where(or(ciLike(icdCodes.code, q), ciLike(icdCodes.description, q)))
      .limit(limit),
    db.select({ parentCodeId: icdBranches.parentCodeId })
      .from(icdBranches)
      .where(or(ciLike(icdBranches.branchCode, q), ciLike(icdBranches.branchDescription, q)))
      .limit(limit),
  ]);

  const branchParentIds = [...new Set(branchMatches.map((b) => b.parentCodeId))];
  let parentCodes: typeof mainMatches = [];
  if (branchParentIds.length > 0) {
    parentCodes = await db.select().from(icdCodes).where(inArray(icdCodes.id, branchParentIds));
  }

  const allCodes = [...mainMatches, ...parentCodes];
  const unique = Array.from(new Map(allCodes.map((c) => [c.id, c])).values());
  return await enrichCodesWithBranches(unique);
}

export async function getAllCodes(limit = 2100, offset = 0): Promise<CodeResult[]> {
  const db = await getDb();
  if (!db) return [];
  const codes = await db.select().from(icdCodes).limit(limit).offset(offset);
  return await enrichCodesWithBranches(codes);
}

export async function getCodeById(id: number): Promise<CodeResult | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(icdCodes).where(eq(icdCodes.id, id)).limit(1);
  if (result.length === 0) return null;
  const enriched = await enrichCodesWithBranches(result);
  return enriched[0] ?? null;
}

async function enrichCodesWithBranches(
  codes: Array<{ id: number; code: string; description: string; branchCount: number }>
): Promise<CodeResult[]> {
  if (codes.length === 0) return [];
  const db = await getDb();
  if (!db) return [];

  const codeIds = codes.map((c) => c.id);
  const codeStrings = codes.map((c) => c.code);

  const [branches, nc] = await Promise.all([
    db.select().from(icdBranches).where(inArray(icdBranches.parentCodeId, codeIds)),
    db.select({ code: nonCoveredCodes.code }).from(nonCoveredCodes).where(inArray(nonCoveredCodes.code, codeStrings)),
  ]);

  const nonCoveredSet = new Set(nc.map((r) => r.code));
  const branchMap = new Map<number, Array<{ branchCode: string; branchDescription: string }>>();
  for (const b of branches) {
    if (!branchMap.has(b.parentCodeId)) branchMap.set(b.parentCodeId, []);
    branchMap.get(b.parentCodeId)!.push({ branchCode: b.branchCode, branchDescription: b.branchDescription });
  }

  return codes.map((c) => ({
    id: c.id,
    code: c.code,
    description: c.description,
    branchCount: c.branchCount,
    branches: branchMap.get(c.id) ?? [],
    isNonCovered: nonCoveredSet.has(c.code),
  }));
}

// ─── Non-Covered Codes ─────────────────────────────────────────────────────────

export async function getAllNonCoveredCodes() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(nonCoveredCodes);
}

export async function searchNonCoveredCodes(query: string) {
  const db = await getDb();
  if (!db) return [];
  const q = `%${query}%`;
  return await db.select().from(nonCoveredCodes)
    .where(or(ciLike(nonCoveredCodes.code, q), ciLike(nonCoveredCodes.description, q)))
    .limit(100);
}

// ─── Bulk Verify ───────────────────────────────────────────────────────────────

export async function bulkVerifyCodes(codeList: string[]) {
  if (codeList.length === 0) return [];
  const db = await getDb();
  if (!db) return [];

  const [mainCodes, branchCodes, nc] = await Promise.all([
    db.select({ code: icdCodes.code, description: icdCodes.description })
      .from(icdCodes).where(inArray(icdCodes.code, codeList)),
    db.select({
      branchCode: icdBranches.branchCode,
      branchDescription: icdBranches.branchDescription,
      parentCode: icdCodes.code,
    })
      .from(icdBranches)
      .innerJoin(icdCodes, eq(icdBranches.parentCodeId, icdCodes.id))
      .where(inArray(icdBranches.branchCode, codeList)),
    db.select({ code: nonCoveredCodes.code }).from(nonCoveredCodes).where(inArray(nonCoveredCodes.code, codeList)),
  ]);

  const nonCoveredSet = new Set(nc.map((r) => r.code));
  const mainMap = new Map(mainCodes.map((c) => [c.code, c.description]));
  const branchMap = new Map(branchCodes.map((c) => [c.branchCode, { desc: c.branchDescription, parent: c.parentCode }]));

  return codeList.map((code) => {
    const mainMatch = mainMap.get(code);
    const branchMatch = branchMap.get(code);
    const found = !!(mainMatch || branchMatch);
    return {
      code,
      found,
      description: mainMatch ?? branchMatch?.desc ?? null,
      parentCode: branchMatch?.parent ?? null,
      isNonCovered: nonCoveredSet.has(code),
      status: !found ? "NOT_FOUND" : nonCoveredSet.has(code) ? "NON_COVERED" : "COVERED",
    };
  });
}

// ─── Advanced Search ───────────────────────────────────────────────────────────

export async function advancedSearch(params: {
  scientificName?: string;
  tradeName?: string;
  indication?: string;
  icdCode?: string;
  coverageStatus?: "covered" | "non-covered" | "all";
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { results: [], total: 0 };

  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  let matchedIds: Set<number> | null = null;

  const intersect = (newIds: Set<number>) => {
    if (matchedIds === null) matchedIds = newIds;
    else matchedIds = new Set([...matchedIds].filter((id) => newIds.has(id)));
  };

  if (params.scientificName) {
    const rows = await db.select({ id: medications.id }).from(medications)
      .where(ciLike(medications.scientificName, `%${params.scientificName}%`));
    intersect(new Set(rows.map((r) => r.id)));
  }
  if (params.tradeName) {
    const rows = await db.select({ id: medicationTradeNames.medicationId }).from(medicationTradeNames)
      .where(ciLike(medicationTradeNames.tradeName, `%${params.tradeName}%`));
    intersect(new Set(rows.map((r) => r.id)));
  }
  if (params.indication) {
    const rows = await db.select({ id: medicationIndications.medicationId }).from(medicationIndications)
      .where(ciLike(medicationIndications.indication, `%${params.indication}%`));
    intersect(new Set(rows.map((r) => r.id)));
  }
  if (params.icdCode) {
    const rows = await db.select({ id: medicationCodes.medicationId }).from(medicationCodes)
      .innerJoin(icdCodes, eq(medicationCodes.codeId, icdCodes.id))
      .where(ciLike(icdCodes.code, `%${params.icdCode}%`));
    intersect(new Set(rows.map((r) => r.id)));
  }

  if (matchedIds === null) {
    const allMeds = await db.select({ id: medications.id }).from(medications);
    matchedIds = new Set(allMeds.map((r) => r.id));
  }

  const total = matchedIds.size;
  const idArray = [...(matchedIds as Set<number>)].slice(offset, offset + limit);
  let results = await getMedicationsByIds(idArray);

  if (params.coverageStatus === "covered") {
    results = results.filter((r) => r.coverageStatus !== "NON-COVERED");
  } else if (params.coverageStatus === "non-covered") {
    results = results.filter((r) => r.coverageStatus === "NON-COVERED" || r.coverageStatus === "PARTIAL");
  }

  return { results, total };
}

// ─── Analytics ─────────────────────────────────────────────────────────────────

export async function recordSearch(data: InsertSearchAnalytic) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(searchAnalytics).values(data);
  } catch (error) {
    console.error("[Database] Failed to record search:", error);
  }
}

export async function getTotalSearches() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(searchAnalytics);
  return Number(result[0]?.count ?? 0);
}

export async function getTotalSearchesSince(days: number) {
  const db = await getDb();
  if (!db) return 0;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const result = await db.select({ count: count() }).from(searchAnalytics).where(gte(searchAnalytics.createdAt, since));
  return Number(result[0]?.count ?? 0);
}

export async function getAverageResponseTime() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({
    avg: sql<number>`COALESCE(AVG(results_count), 0)`,
  }).from(searchAnalytics);
  return Math.round(Number(result[0]?.avg ?? 0));
}

export async function getActiveUsers() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(users);
  return Number(result[0]?.count ?? 0);
}

export async function getUniqueSearchers(days = 7) {
  const db = await getDb();
  if (!db) return 0;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const result = await db.select({
    count: sql<number>`COUNT(DISTINCT user_id)`,
  }).from(searchAnalytics).where(gte(searchAnalytics.createdAt, since));
  return Number(result[0]?.count ?? 0);
}

export async function getPopularSearches(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({ query: searchAnalytics.query, count: count() })
    .from(searchAnalytics)
    .groupBy(searchAnalytics.query)
    .orderBy(desc(count()))
    .limit(limit);
  return result.map((r) => ({ term: r.query, count: Number(r.count) }));
}

export async function getSearchTrend(days = 7) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date();
  since.setDate(since.getDate() - days);
  const result = await db.execute(
    sql`SELECT DATE(createdAt) as search_date, COUNT(*) as search_count FROM search_analytics WHERE createdAt >= ${since} GROUP BY search_date ORDER BY search_date`
  ) as any;
  const rows = (result[0] || result || []) as Array<{ search_date: string; search_count: number }>;
  const trendMap = new Map<string, number>();
  rows.forEach((r: any) => {
    const d = r.search_date instanceof Date ? r.search_date.toISOString().split("T")[0] : String(r.search_date);
    trendMap.set(d, Number(r.search_count));
  });
  const trend = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    trend.push({ date: key, count: trendMap.get(key) ?? 0 });
  }
  return trend;
}
