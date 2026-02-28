/**
 * Database query helpers for ICD-10 Search Engine
 *
 * Schema overview:
 * - drug_entries: one row per (scientific_name, trade_name, indication, icd_codes_raw) from Excel
 * - drug_entry_codes: junction table linking drug_entries → icd_codes
 * - icd_codes: main ICD-10 codes with descriptions
 * - icd_branches: sub-codes under each main code
 * - non_covered_codes: codes that are not covered
 * - search_analytics: search tracking
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  eq,
  like,
  or,
  inArray,
  count,
  sql,
  and,
  gte,
  desc,
} from "drizzle-orm";
import {
  drugEntries,
  drugEntryCodes,
  icdCodes,
  icdBranches,
  nonCoveredCodes,
  searchAnalytics,
  users,
  type InsertSearchAnalytic,
} from "../drizzle/schema";

// ─── Database Connection ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: any = null;

export async function getDb() {
  if (_db !== null) return _db;
  const pool = mysql.createPool({
    uri: process.env.DATABASE_URL!,
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
  });
  _db = drizzle(pool);
  return _db;
}

// Case-insensitive LIKE using LOWER()
function ciLike(col: any, pattern: string) {
  return sql`LOWER(${col}) LIKE LOWER(${pattern})`;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface DrugResult {
  id: number;
  scientificName: string;
  tradeName: string;
  indication: string;
  icdCodesRaw: string;
  icdCodes: CodeInfo[];
  coverageStatus: "COVERED" | "NON-COVERED" | "PARTIAL";
}

export interface CodeInfo {
  id: number;
  code: string;
  description: string;
  branchCount: number;
  isNonCovered: boolean;
  branches: BranchInfo[];
}

export interface BranchInfo {
  branchCode: string;
  branchDescription: string;
  isNonCovered: boolean;
}

export interface CodeResult {
  id: number;
  code: string;
  description: string;
  branchCount: number;
  branches: Array<{ branchCode: string; branchDescription: string }>;
  isNonCovered: boolean;
}

// ─── Core: Enrich Drug Entries with ICD Codes ──────────────────────────────────

async function enrichDrugEntriesWithCodes(
  entries: Array<{ id: number; scientificName: string; tradeName: string; indication: string; icdCodesRaw: string }>
): Promise<DrugResult[]> {
  if (entries.length === 0) return [];
  const db = await getDb();

  const entryIds = entries.map((e) => e.id);

  // Load all code links for these entries
  const links = await db
    .select({
      drugEntryId: drugEntryCodes.drugEntryId,
      codeId: icdCodes.id,
      code: icdCodes.code,
      description: icdCodes.description,
      branchCount: icdCodes.branchCount,
    })
    .from(drugEntryCodes)
    .innerJoin(icdCodes, eq(drugEntryCodes.codeId, icdCodes.id))
    .where(inArray(drugEntryCodes.drugEntryId, entryIds));

  // Load branches for all linked codes
  const linkedCodeIds = [...new Set((links as Array<{ drugEntryId: number; codeId: number; code: string; description: string; branchCount: number }>).map((l) => l.codeId))];
  const linkedCodeStrings = [...new Set((links as Array<{ drugEntryId: number; codeId: number; code: string; description: string; branchCount: number }>).map((l) => l.code))];

  let branches: Array<{ parentCodeId: number; branchCode: string; branchDescription: string }> = [];
  if (linkedCodeIds.length > 0) {
    branches = await db
      .select({
        parentCodeId: icdBranches.parentCodeId,
        branchCode: icdBranches.branchCode,
        branchDescription: icdBranches.branchDescription,
      })
      .from(icdBranches)
      .where(inArray(icdBranches.parentCodeId, linkedCodeIds));
  }

  // Load all non-covered codes
  const allBranchCodes = branches.map((b) => b.branchCode);
  const allCodesToCheck = [...linkedCodeStrings, ...allBranchCodes];
  let nonCoveredSet = new Set<string>();
  if (allCodesToCheck.length > 0) {
    const nc = await db.select({ code: nonCoveredCodes.code }).from(nonCoveredCodes);
    nonCoveredSet = new Set((nc as Array<{ code: string }>).map((r) => r.code));
  }

  // Build maps
  const branchMap = new Map<number, BranchInfo[]>();
  for (const b of branches) {
    if (!branchMap.has(b.parentCodeId)) branchMap.set(b.parentCodeId, []);
    branchMap.get(b.parentCodeId)!.push({
      branchCode: b.branchCode,
      branchDescription: b.branchDescription,
      isNonCovered: nonCoveredSet.has(b.branchCode),
    });
  }

  const codesByEntry = new Map<number, CodeInfo[]>();
  for (const link of links) {
    if (!codesByEntry.has(link.drugEntryId)) codesByEntry.set(link.drugEntryId, []);
    const codeBranches = branchMap.get(link.codeId) ?? [];
    const parentNonCovered = nonCoveredSet.has(link.code);
    const hasNonCoveredBranch = codeBranches.some((b) => b.isNonCovered);
    codesByEntry.get(link.drugEntryId)!.push({
      id: link.codeId,
      code: link.code,
      description: link.description,
      branchCount: link.branchCount,
      isNonCovered: parentNonCovered || hasNonCoveredBranch,
      branches: codeBranches,
    });
  }

  return entries.map((entry) => {
    const codes = codesByEntry.get(entry.id) ?? [];
    const hasNonCovered = codes.some((c) => c.isNonCovered);
    const hasCovered = codes.some((c) => !c.isNonCovered);
    const coverageStatus: DrugResult["coverageStatus"] =
      codes.length === 0 ? "COVERED" :
      hasNonCovered && hasCovered ? "PARTIAL" :
      hasNonCovered ? "NON-COVERED" : "COVERED";

    return {
      id: entry.id,
      scientificName: entry.scientificName,
      tradeName: entry.tradeName,
      indication: entry.indication,
      icdCodesRaw: entry.icdCodesRaw,
      icdCodes: codes,
      coverageStatus,
    };
  });
}

// ─── Search Medications ────────────────────────────────────────────────────────

export async function searchMedications(
  query: string,
  limit = 50,
  offset = 0
): Promise<DrugResult[]> {
  const db = await getDb();
  const q = `%${query}%`;

  const entries = await db
    .select()
    .from(drugEntries)
    .where(
      or(
        ciLike(drugEntries.scientificName, q),
        ciLike(drugEntries.tradeName, q),
        ciLike(drugEntries.indication, q),
        ciLike(drugEntries.icdCodesRaw, q)
      )
    )
    .limit(limit)
    .offset(offset);

  return enrichDrugEntriesWithCodes(entries);
}

// ─── Advanced Search ───────────────────────────────────────────────────────────

export async function advancedSearch(params: {
  scientificName?: string;
  tradeName?: string;
  indication?: string;
  limit?: number;
  offset?: number;
}): Promise<{ results: DrugResult[]; total: number }> {
  const db = await getDb();
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  const conditions = [];
  if (params.scientificName) {
    conditions.push(ciLike(drugEntries.scientificName, `%${params.scientificName}%`));
  }
  if (params.tradeName) {
    conditions.push(ciLike(drugEntries.tradeName, `%${params.tradeName}%`));
  }
  if (params.indication) {
    conditions.push(ciLike(drugEntries.indication, `%${params.indication}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [entries, totalResult] = await Promise.all([
    db.select().from(drugEntries).where(whereClause).limit(limit).offset(offset),
    db.select({ count: count() }).from(drugEntries).where(whereClause),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);
  const results = await enrichDrugEntriesWithCodes(entries);

  return { results, total };
}

// ─── Get Suggestions for Advanced Search ──────────────────────────────────────

export async function getScientificNameSuggestions(
  query: string,
  limit = 10
): Promise<Array<{ name: string; count: number }>> {
  const db = await getDb();
  const q = `%${query}%`;

  const rows = await db
    .select({
      name: drugEntries.scientificName,
      count: count(),
    })
    .from(drugEntries)
    .where(ciLike(drugEntries.scientificName, q))
    .groupBy(drugEntries.scientificName)
    .orderBy(drugEntries.scientificName)
    .limit(limit);

  return (rows as Array<{ name: string; count: number | bigint }>).map((r) => ({ name: r.name, count: Number(r.count) }));
}

export async function getTradeNameSuggestions(
  query: string,
  scientificName?: string,
  limit = 20
): Promise<Array<{ name: string }>> {
  const db = await getDb();
  const q = `%${query}%`;

  const conditions = [ciLike(drugEntries.tradeName, q)];
  if (scientificName) {
    conditions.push(ciLike(drugEntries.scientificName, `%${scientificName}%`));
  }

  const rows = await db
    .select({ name: drugEntries.tradeName })
    .from(drugEntries)
    .where(and(...conditions))
    .groupBy(drugEntries.tradeName)
    .orderBy(drugEntries.tradeName)
    .limit(limit);

  return (rows as Array<{ name: string }>).map((r) => ({ name: r.name }));
}

export async function getIndicationSuggestions(
  scientificName?: string,
  tradeName?: string,
  query?: string,
  limit = 50
): Promise<Array<{ indication: string }>> {
  const db = await getDb();

  const conditions = [];
  if (scientificName) {
    conditions.push(ciLike(drugEntries.scientificName, `%${scientificName}%`));
  }
  if (tradeName) {
    conditions.push(ciLike(drugEntries.tradeName, `%${tradeName}%`));
  }
  if (query) {
    conditions.push(ciLike(drugEntries.indication, `%${query}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({ indication: drugEntries.indication })
    .from(drugEntries)
    .where(whereClause)
    .groupBy(drugEntries.indication)
    .orderBy(drugEntries.indication)
    .limit(limit);

  return (rows as Array<{ indication: string }>).map((r) => ({ indication: r.indication }));
}

// ─── ICD Codes ─────────────────────────────────────────────────────────────────

export async function searchCodes(query: string, limit = 50): Promise<CodeResult[]> {
  const db = await getDb();
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

  const branchParentIds = [...new Set((branchMatches as Array<{ parentCodeId: number }>).map((b) => b.parentCodeId))];
  let parentCodes: typeof mainMatches = [];
  if (branchParentIds.length > 0) {
    parentCodes = await db.select().from(icdCodes).where(inArray(icdCodes.id, branchParentIds));
  }

  const allCodes = [...mainMatches, ...parentCodes];
  const unique = Array.from(new Map(allCodes.map((c) => [c.id, c])).values());
  return enrichCodesWithBranches(unique);
}

export async function getAllCodes(limit = 2100, offset = 0): Promise<CodeResult[]> {
  const db = await getDb();
  const codes = await db.select().from(icdCodes).limit(limit).offset(offset);
  return enrichCodesWithBranches(codes);
}

export async function getCodeById(id: number): Promise<CodeResult | null> {
  const db = await getDb();
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

  const codeIds = codes.map((c) => c.id);
  const codeStrings = codes.map((c) => c.code);

  const [branches, nc] = await Promise.all([
    db.select().from(icdBranches).where(inArray(icdBranches.parentCodeId, codeIds)),
    db.select({ code: nonCoveredCodes.code }).from(nonCoveredCodes).where(inArray(nonCoveredCodes.code, codeStrings)),
  ]);

  const nonCoveredSet = new Set((nc as Array<{ code: string }>).map((r) => r.code));
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
  return db.select().from(nonCoveredCodes);
}

export async function searchNonCoveredCodes(query: string) {
  const db = await getDb();
  const q = `%${query}%`;
  return db.select().from(nonCoveredCodes)
    .where(or(ciLike(nonCoveredCodes.code, q), ciLike(nonCoveredCodes.description, q)))
    .limit(100);
}

// ─── Bulk Verify ───────────────────────────────────────────────────────────────

export async function bulkVerifyCodes(codeList: string[]) {
  if (codeList.length === 0) return [];
  const db = await getDb();

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

  const nonCoveredSet = new Set((nc as Array<{ code: string }>).map((r) => r.code));
  const mainMap = new Map((mainCodes as Array<{ code: string; description: string }>).map((c) => [c.code, c.description]));
  const branchMap = new Map((branchCodes as Array<{ branchCode: string; branchDescription: string; parentCode: string }>).map((c) => [c.branchCode, { desc: c.branchDescription, parent: c.parentCode }]));

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

// ─── Stats ─────────────────────────────────────────────────────────────────────

export async function getStats() {
  const db = await getDb();
  const [drugsResult, codesResult, branchesResult, ncResult] = await Promise.all([
    db.select({ count: count() }).from(drugEntries),
    db.select({ count: count() }).from(icdCodes),
    db.select({ count: count() }).from(icdBranches),
    db.select({ count: count() }).from(nonCoveredCodes),
  ]);

  // Count unique scientific names and trade names
  const [sciNamesResult, tradeNamesResult, indicationsResult] = await Promise.all([
    db.select({ count: sql<number>`COUNT(DISTINCT scientific_name)` }).from(drugEntries),
    db.select({ count: sql<number>`COUNT(DISTINCT trade_name)` }).from(drugEntries),
    db.select({ count: sql<number>`COUNT(DISTINCT indication)` }).from(drugEntries),
  ]);

  return {
    totalDrugEntries: Number(drugsResult[0]?.count ?? 0),
    uniqueScientificNames: Number(sciNamesResult[0]?.count ?? 0),
    uniqueTradeNames: Number(tradeNamesResult[0]?.count ?? 0),
    uniqueIndications: Number(indicationsResult[0]?.count ?? 0),
    totalCodes: Number(codesResult[0]?.count ?? 0),
    totalBranches: Number(branchesResult[0]?.count ?? 0),
    nonCoveredCodes: Number(ncResult[0]?.count ?? 0),
  };
}

export async function getDashboardStats() {
  return getStats();
}

// ─── Analytics ─────────────────────────────────────────────────────────────────

export async function recordSearch(data: InsertSearchAnalytic) {
  const db = await getDb();
  try {
    await db.insert(searchAnalytics).values(data);
  } catch (error) {
    console.error("[Database] Failed to record search:", error);
  }
}

export async function getTotalSearches() {
  const db = await getDb();
  const result = await db.select({ count: count() }).from(searchAnalytics);
  return Number(result[0]?.count ?? 0);
}

export async function getTotalSearchesSince(days: number) {
  const db = await getDb();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const result = await db.select({ count: count() }).from(searchAnalytics)
    .where(gte(searchAnalytics.createdAt, since));
  return Number(result[0]?.count ?? 0);
}

export async function getAverageResponseTime() {
  const db = await getDb();
  const result = await db.select({
    avg: sql<number>`COALESCE(AVG(results_count), 0)`,
  }).from(searchAnalytics);
  return Math.round(Number(result[0]?.avg ?? 0));
}

export async function getActiveUsers() {
  const db = await getDb();
  const result = await db.select({ count: count() }).from(users);
  return Number(result[0]?.count ?? 0);
}

export async function getUniqueSearchers(days = 7) {
  const db = await getDb();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const result = await db.select({
    count: sql<number>`COUNT(DISTINCT user_id)`,
  }).from(searchAnalytics).where(gte(searchAnalytics.createdAt, since));
  return Number(result[0]?.count ?? 0);
}

export async function getPopularSearches(limit = 10) {
  const db = await getDb();
  return db.select({
    query: searchAnalytics.query,
    count: count(),
  })
    .from(searchAnalytics)
    .groupBy(searchAnalytics.query)
    .orderBy(desc(count()))
    .limit(limit);
}

export async function getSearchTrend(days = 7) {
  const db = await getDb();
  const since = new Date();
  since.setDate(since.getDate() - days);
  return db.select({
    date: sql<string>`DATE(createdAt)`,
    count: count(),
  })
    .from(searchAnalytics)
    .where(gte(searchAnalytics.createdAt, since))
    .groupBy(sql`DATE(createdAt)`)
    .orderBy(sql`DATE(createdAt)`);
}

// ─── User Management ───────────────────────────────────────────────────────────

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0] ?? null;
}

export async function upsertUser(data: {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  lastSignedIn?: Date;
}) {
  const db = await getDb();
  const existing = await getUserByOpenId(data.openId);
  if (existing) {
    await db.update(users).set({
      name: data.name ?? existing.name,
      email: data.email ?? existing.email,
      loginMethod: data.loginMethod ?? existing.loginMethod,
      lastSignedIn: data.lastSignedIn ?? new Date(),
    }).where(eq(users.openId, data.openId));
    return getUserByOpenId(data.openId);
  } else {
    await db.insert(users).values({
      openId: data.openId,
      name: data.name ?? null,
      email: data.email ?? null,
      loginMethod: data.loginMethod ?? null,
      lastSignedIn: data.lastSignedIn ?? new Date(),
    });
    return getUserByOpenId(data.openId);
  }
}
