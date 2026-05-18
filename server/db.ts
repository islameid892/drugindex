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
  max,
  type SQL,
} from "drizzle-orm";
import {
  drugEntries,
  drugEntryCodes,
  icdCodes,
  icdBranches,
  nonCoveredCodes,
  searchAnalytics,
  users,
  userSessions,
  type InsertSearchAnalytic,
} from "../drizzle/schema";
import { checkCoverageMultiple } from "./coverage";
import { ENV } from "./_core/env";

// ─── Database Connection ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: any = null;

export async function getDb() {
  if (_db !== null) return _db;
  const pool = mysql.createPool({
    uri: process.env.DATABASE_URL!,
    connectionLimit: ENV.dbConnectionLimit,
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

function fulltextMatch(columnNames: string[], query: string): SQL | null {
  if (query.length < 4) return null;
  const sanitized = query.replace(/[+\-*()~><"\]\[@]/g, ' ').trim();
  if (!sanitized) return null;
  const words = sanitized.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return null;
  const booleanQuery = words.map(w => `+${w}*`).join(' ');
  const columnList = columnNames.join(', ');
  return sql`MATCH(${sql.raw(columnList)}) AGAINST(${booleanQuery} IN BOOLEAN MODE)`;
}

function buildLikeSearch(columns: SQL[], query: string): SQL {
  const q = `%${query}%`;
  return or(...columns.map(col => ciLike(col, q)));
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

  // Combined query: drug_entry_codes + icd_codes + icd_branches in a single LEFT JOIN
  // Prevents N+1: was 2 separate queries, now 1
  const rows = await db
    .select({
      drugEntryId: drugEntryCodes.drugEntryId,
      codeId: icdCodes.id,
      code: icdCodes.code,
      description: icdCodes.description,
      branchCount: icdCodes.branchCount,
      parentCodeId: icdBranches.parentCodeId,
      branchCode: icdBranches.branchCode,
      branchDescription: icdBranches.branchDescription,
    })
    .from(drugEntryCodes)
    .innerJoin(icdCodes, eq(drugEntryCodes.codeId, icdCodes.id))
    .leftJoin(icdBranches, eq(icdCodes.id, icdBranches.parentCodeId))
    .where(inArray(drugEntryCodes.drugEntryId, entryIds));

  // Reconstruct unique links and branches from the joined result
  const seenLinkKeys = new Set<string>();
  const links: Array<{ drugEntryId: number; codeId: number; code: string; description: string; branchCount: number }> = [];
  const branchMap = new Map<number, BranchInfo[]>();
  const linkedCodeStrings: string[] = [];
  const seenCodeStrings = new Set<string>();

  for (const row of rows as Array<{ drugEntryId: number; codeId: number; code: string; description: string; branchCount: number; parentCodeId: number | null; branchCode: string | null; branchDescription: string | null }>) {
    const linkKey = `${row.drugEntryId}:${row.codeId}`;
    if (!seenLinkKeys.has(linkKey)) {
      seenLinkKeys.add(linkKey);
      links.push({ drugEntryId: row.drugEntryId, codeId: row.codeId, code: row.code, description: row.description, branchCount: row.branchCount });
    }
    if (!seenCodeStrings.has(row.code)) {
      seenCodeStrings.add(row.code);
      linkedCodeStrings.push(row.code);
    }

    if (row.parentCodeId !== null && row.branchCode !== null) {
      if (!branchMap.has(row.codeId)) branchMap.set(row.codeId, []);
      const existing = branchMap.get(row.codeId)!;
      if (!existing.find(b => b.branchCode === row.branchCode)) {
        existing.push({
          branchCode: row.branchCode,
          branchDescription: row.branchDescription,
          isNonCovered: false, // temporary, updated after coverage check
        });
      }
      if (!seenCodeStrings.has(row.branchCode)) {
        seenCodeStrings.add(row.branchCode);
        linkedCodeStrings.push(row.branchCode);
      }
    }
  }

  // Collect all codes needed for coverage check
  const allBranchCodes: string[] = [];
  for (const branches of branchMap.values()) {
    for (const b of branches) allBranchCodes.push(b.branchCode);
  }
  const allCodesToCheck = [...linkedCodeStrings, ...allBranchCodes];
  const coverageMap = await checkCoverageMultiple(allCodesToCheck);

  // Update branch coverage status
  for (const branches of branchMap.values()) {
    for (const b of branches) {
      b.isNonCovered = !coverageMap.get(b.branchCode)!;
    }
  }

  const codesByEntry = new Map<number, CodeInfo[]>();
  for (const link of links) {
    if (!codesByEntry.has(link.drugEntryId)) codesByEntry.set(link.drugEntryId, []);
    const codeBranches = branchMap.get(link.codeId) ?? [];
    const isCodeNotCovered = !coverageMap.get(link.code)!;
    const hasNonCoveredBranch = codeBranches.some((b) => b.isNonCovered);
    codesByEntry.get(link.drugEntryId)!.push({
      id: link.codeId,
      code: link.code,
      description: link.description,
      branchCount: link.branchCount,
      isNonCovered: isCodeNotCovered || hasNonCoveredBranch,
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
  const ftColumns = ['scientific_name', 'trade_name', 'indication', 'icd_codes_raw'];
  const likeColumns = [drugEntries.scientificName, drugEntries.tradeName, drugEntries.indication, drugEntries.icdCodesRaw];
  const ftCondition = fulltextMatch(ftColumns, query);

  let entries;
  if (ftCondition) {
    try {
      entries = await db.select().from(drugEntries).where(ftCondition).limit(limit).offset(offset);
    } catch {
      entries = [];
    }
    if (entries.length === 0) {
      entries = await db.select().from(drugEntries).where(buildLikeSearch(likeColumns, query)).limit(limit).offset(offset);
    }
  } else {
    entries = await db.select().from(drugEntries).where(buildLikeSearch(likeColumns, query)).limit(limit).offset(offset);
  }

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
  const likeQ = `%${query}%`;
  const mainLike = or(ciLike(icdCodes.code, likeQ), ciLike(icdCodes.description, likeQ));
  const branchLike = or(ciLike(icdBranches.branchCode, likeQ), ciLike(icdBranches.branchDescription, likeQ));

  const ftMain = fulltextMatch(['code', 'description'], query);
  const ftBranch = fulltextMatch(['branch_code', 'branch_description'], query);

  const queryMain = ftMain
    ? async () => {
        try {
          const r = await db.select().from(icdCodes).where(ftMain).limit(limit);
          if (r.length > 0) return r;
        } catch { /* FULLTEXT index missing, fall back to LIKE */ }
        return await db.select().from(icdCodes).where(mainLike).limit(limit);
      }
    : () => db.select().from(icdCodes).where(mainLike).limit(limit);

  const queryBranch = ftBranch
    ? async () => {
        try {
          const r = await db.select({ parentCodeId: icdBranches.parentCodeId }).from(icdBranches).where(ftBranch).limit(limit);
          if (r.length > 0) return r;
        } catch { /* FULLTEXT index missing, fall back to LIKE */ }
        return await db.select({ parentCodeId: icdBranches.parentCodeId }).from(icdBranches).where(branchLike).limit(limit);
      }
    : () => db.select({ parentCodeId: icdBranches.parentCodeId }).from(icdBranches).where(branchLike).limit(limit);

  const [mainMatches, branchMatches] = await Promise.all([queryMain(), queryBranch()]);

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

  const branches = await db.select().from(icdBranches).where(inArray(icdBranches.parentCodeId, codeIds));

  // Get all branch codes for the given parent codes
  const allBranchCodes = branches.map((b: any) => b.branchCode);
  
  // Collect all codes to check (main codes + branch codes)
  const allCodesToCheck = [...codeStrings, ...allBranchCodes];
  
  // Use hierarchical coverage logic
  const coverageMap = await checkCoverageMultiple(allCodesToCheck);

  const branchMap = new Map<number, Array<{ branchCode: string; branchDescription: string; isNonCovered: boolean }>>();
  for (const b of branches) {
    if (!branchMap.has(b.parentCodeId)) branchMap.set(b.parentCodeId, []);
    branchMap.get(b.parentCodeId)!.push({ 
      branchCode: b.branchCode, 
      branchDescription: b.branchDescription,
      isNonCovered: !coverageMap.get(b.branchCode)!
    });
  }

  return codes.map((c) => {
    const codeBranches = branchMap.get(c.id) ?? [];
    // A code is non-covered if the main code is non-covered OR any of its branches are non-covered
    const isCodeNotCovered = !coverageMap.get(c.code)!;
    const isNonCovered = isCodeNotCovered || codeBranches.some((b) => b.isNonCovered);
    return {
      id: c.id,
      code: c.code,
      description: c.description,
      branchCount: c.branchCount,
      branches: codeBranches.map(({ isNonCovered, ...rest }) => rest),
      isNonCovered,
    };
  });
}

// ─── Non-Covered Codes ─────────────────────────────────────────────────────────

export async function getAllNonCoveredCodes() {
  const db = await getDb();
  return db.select({
    code: nonCoveredCodes.code,
    description: sql`MAX(COALESCE(${icdBranches.branchDescription}, ${icdCodes.description}, ${nonCoveredCodes.description}))`,
  })
    .from(nonCoveredCodes)
    .leftJoin(icdBranches, eq(nonCoveredCodes.code, icdBranches.branchCode))
    .leftJoin(icdCodes, eq(nonCoveredCodes.code, icdCodes.code))
    .groupBy(nonCoveredCodes.code)
    .orderBy(nonCoveredCodes.code);
}

export async function searchNonCoveredCodes(query: string) {
  const db = await getDb();
  const q = `%${query}%`;
  return db.select({
    code: nonCoveredCodes.code,
    description: sql`MAX(COALESCE(${icdBranches.branchDescription}, ${icdCodes.description}, ${nonCoveredCodes.description}))`,
  })
    .from(nonCoveredCodes)
    .leftJoin(icdBranches, eq(nonCoveredCodes.code, icdBranches.branchCode))
    .leftJoin(icdCodes, eq(nonCoveredCodes.code, icdCodes.code))
    .where(or(
      ciLike(nonCoveredCodes.code, q),
      ciLike(icdBranches.branchDescription, q),
      ciLike(icdCodes.description, q),
      ciLike(nonCoveredCodes.description, q)
    ))
    .groupBy(nonCoveredCodes.code)
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
    const result = await db.insert(searchAnalytics).values(data);
    return result;
  } catch (error: any) {
    console.error('[recordSearch] FAILED:', error?.message || error);
    throw error;
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
    avg: sql<number>`COALESCE(AVG(${searchAnalytics.responseTimeMs}), 0)`,
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
  // Use raw SQL with explicit table.column to satisfy MySQL only_full_group_by mode
  return db.select({
    date: sql<string>`DATE(search_analytics.createdAt)`,
    count: count(),
  })
    .from(searchAnalytics)
    .where(gte(searchAnalytics.createdAt, since))
    .groupBy(sql`DATE(search_analytics.createdAt)`)
    .orderBy(sql`DATE(search_analytics.createdAt)`);
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

// ─── Browse: Search Drugs by Trade Name ────────────────────────────────────────
// Returns grouped data: for a trade name search, show the scientific name + all its indications + codes

export async function browseDrugsByTradeName(query: string, limit = 20, offset = 0): Promise<{
  tradeName: string;
  scientificName: string;
  indications: Array<{
    indication: string;
    codes: CodeInfo[];
  }>;
}[]> {
  const db = await getDb();
  const ftCondition = fulltextMatch(['trade_name'], query);
  const likeCondition = buildLikeSearch([drugEntries.tradeName], query);

  // Try FULLTEXT first, fallback to LIKE
  let tradeNames: Array<{ tradeName: string; scientificName: string }>;
  if (ftCondition) {
    try {
      tradeNames = await db
        .select({ tradeName: drugEntries.tradeName, scientificName: drugEntries.scientificName })
        .from(drugEntries)
        .where(ftCondition)
        .groupBy(drugEntries.tradeName, drugEntries.scientificName)
        .orderBy(drugEntries.tradeName)
        .limit(limit)
        .offset(offset);
    } catch {
      tradeNames = [];
    }
  } else {
    tradeNames = await db
      .select({ tradeName: drugEntries.tradeName, scientificName: drugEntries.scientificName })
      .from(drugEntries)
      .where(likeCondition)
      .groupBy(drugEntries.tradeName, drugEntries.scientificName)
      .orderBy(drugEntries.tradeName)
      .limit(limit)
      .offset(offset);
  }

  if (tradeNames.length === 0 && ftCondition) {
    tradeNames = await db
      .select({ tradeName: drugEntries.tradeName, scientificName: drugEntries.scientificName })
      .from(drugEntries)
      .where(likeCondition)
      .groupBy(drugEntries.tradeName, drugEntries.scientificName)
      .orderBy(drugEntries.tradeName)
      .limit(limit)
      .offset(offset);
  }

  if (tradeNames.length === 0) return [];

  const tnList = tradeNames as Array<{ tradeName: string; scientificName: string }>;

  // Batch: fetch all entries for ALL matched trade names in a single query
  // Prevents N+1: was 1 query per trade name (20 queries), now 1 query total
  const pairConditions = tnList.map(tn =>
    and(eq(drugEntries.tradeName, tn.tradeName), eq(drugEntries.scientificName, tn.scientificName))
  );
  const allEntries = await db
    .select()
    .from(drugEntries)
    .where(or(...pairConditions))
    .limit(tnList.length * 100);

  // Single enrichment for all entries
  const allEnriched = await enrichDrugEntriesWithCodes(
    allEntries as Array<{ id: number; scientificName: string; tradeName: string; indication: string; icdCodesRaw: string }>
  );

  // Group by (tradeName, scientificName) in JS
  const grouped = new Map<string, {
    tradeName: string;
    scientificName: string;
    indicationMap: Map<string, CodeInfo[]>;
  }>();

  for (const e of allEnriched) {
    const key = `${e.tradeName}|${e.scientificName}`;
    if (!grouped.has(key)) {
      grouped.set(key, { tradeName: e.tradeName, scientificName: e.scientificName, indicationMap: new Map() });
    }
    const g = grouped.get(key)!;
    if (!g.indicationMap.has(e.indication)) g.indicationMap.set(e.indication, []);
    for (const code of e.icdCodes) {
      const existing = g.indicationMap.get(e.indication)!;
      if (!existing.find(c => c.code === code.code)) existing.push(code);
    }
  }

  return tnList.map(tn => {
    const key = `${tn.tradeName}|${tn.scientificName}`;
    const g = grouped.get(key);
    if (!g) return { tradeName: tn.tradeName, scientificName: tn.scientificName, indications: [] };
    return {
      tradeName: g.tradeName,
      scientificName: g.scientificName,
      indications: Array.from(g.indicationMap.entries()).map(([indication, codes]) => ({ indication, codes })),
    };
  });
}

export async function browseDrugsByTradeNameCount(query: string): Promise<number> {
  const db = await getDb();
  const likeCondition = buildLikeSearch([drugEntries.tradeName], query);

  let result: Array<{ count: number | bigint }>;
  const ftCondition = fulltextMatch(['trade_name'], query);
  if (ftCondition) {
    try {
      result = await db.select({ count: sql<number>`COUNT(DISTINCT CONCAT(trade_name, '|', scientific_name))` }).from(drugEntries).where(ftCondition);
    } catch {
      result = [];
    }
    if (!result[0]?.count) {
      result = await db.select({ count: sql<number>`COUNT(DISTINCT CONCAT(trade_name, '|', scientific_name))` }).from(drugEntries).where(likeCondition);
    }
  } else {
    result = await db.select({ count: sql<number>`COUNT(DISTINCT CONCAT(trade_name, '|', scientific_name))` }).from(drugEntries).where(likeCondition);
  }

  return Number((result as Array<{ count: number }>)[0]?.count ?? 0);
}

// ─── Browse: Search Conditions ─────────────────────────────────────────────────
// Returns: condition name, scientific names, trade names, codes

export async function browseConditions(query: string, limit = 20, offset = 0): Promise<{
  condition: string;
  scientificNames: string[];
  tradeNames: string[];
  codes: CodeInfo[];
}[]> {
  const db = await getDb();
  const ftCondition = fulltextMatch(['indication'], query);
  const likeCondition = buildLikeSearch([drugEntries.indication], query);

  // Find distinct indications matching the query
  let conditions: Array<{ indication: string }>;
  if (ftCondition) {
    try {
      conditions = await db.select({ indication: drugEntries.indication }).from(drugEntries).where(ftCondition).groupBy(drugEntries.indication).orderBy(drugEntries.indication).limit(limit).offset(offset);
    } catch {
      conditions = [];
    }
    if (conditions.length === 0) {
      conditions = await db.select({ indication: drugEntries.indication }).from(drugEntries).where(likeCondition).groupBy(drugEntries.indication).orderBy(drugEntries.indication).limit(limit).offset(offset);
    }
  } else {
    conditions = await db.select({ indication: drugEntries.indication }).from(drugEntries).where(likeCondition).groupBy(drugEntries.indication).orderBy(drugEntries.indication).limit(limit).offset(offset);
  }

  if (conditions.length === 0) return [];

  const condList = conditions as Array<{ indication: string }>;

  // Batch: fetch all entries for ALL matched indications in a single query
  // Prevents N+1: was 1 query per condition (20 queries), now 1 query total
  const allEntries = await db
    .select()
    .from(drugEntries)
    .where(inArray(drugEntries.indication, condList.map(c => c.indication)))
    .limit(condList.length * 200);

  // Single enrichment for all entries
  const allEnriched = await enrichDrugEntriesWithCodes(
    allEntries as Array<{ id: number; scientificName: string; tradeName: string; indication: string; icdCodesRaw: string }>
  );

  // Group by indication in JS
  const grouped = new Map<string, {
    scientificNames: Set<string>;
    tradeNames: Set<string>;
    codeMap: Map<string, CodeInfo>;
  }>();

  for (const e of allEnriched) {
    if (!grouped.has(e.indication)) {
      grouped.set(e.indication, { scientificNames: new Set(), tradeNames: new Set(), codeMap: new Map() });
    }
    const g = grouped.get(e.indication)!;
    g.scientificNames.add(e.scientificName);
    g.tradeNames.add(e.tradeName);
    for (const code of e.icdCodes) {
      if (!g.codeMap.has(code.code)) g.codeMap.set(code.code, code);
    }
  }

  return condList.map(cond => {
    const g = grouped.get(cond.indication);
    if (!g) return { condition: cond.indication, scientificNames: [], tradeNames: [], codes: [] };
    return {
      condition: cond.indication,
      scientificNames: Array.from(g.scientificNames).sort(),
      tradeNames: Array.from(g.tradeNames).sort(),
      codes: Array.from(g.codeMap.values()),
    };
  });
}

export async function browseConditionsCount(query: string): Promise<number> {
  const db = await getDb();
  const likeCondition = buildLikeSearch([drugEntries.indication], query);

  let result: Array<{ count: number | bigint }>;
  const ftCondition = fulltextMatch(['indication'], query);
  if (ftCondition) {
    try {
      result = await db.select({ count: sql<number>`COUNT(DISTINCT indication)` }).from(drugEntries).where(ftCondition);
    } catch {
      result = [];
    }
    if (!result[0]?.count) {
      result = await db.select({ count: sql<number>`COUNT(DISTINCT indication)` }).from(drugEntries).where(likeCondition);
    }
  } else {
    result = await db.select({ count: sql<number>`COUNT(DISTINCT indication)` }).from(drugEntries).where(likeCondition);
  }

  return Number((result as Array<{ count: number }>)[0]?.count ?? 0);
}

// ─── Search Grouped by Scientific Name ─────────────────────────────────────────
// Used by the main search bar: groups results by scientific name,
// shows all trade names, indications, codes, and coverage status

export interface GroupedDrugResult {
  scientificName: string;
  tradeNames: string[];
  indications: Array<{
    indication: string;
    codes: CodeInfo[];
    coverageStatus: "COVERED" | "NON-COVERED" | "PARTIAL";
  }>;
  overallCoverage: "COVERED" | "NON-COVERED" | "PARTIAL";
  totalTradeNames: number;
}

export interface SearchGroupedResponse {
  medications: GroupedDrugResult[];
  conditions: Array<{
    indication: string;
    scientificNames: string[];
    tradeNames: string[];
    codes: CodeInfo[];
  }>;
  codes: Array<{
    code: string;
    description: string;
    branchCount: number;
    isNonCovered: boolean;
    branches: BranchInfo[];
    medications: string[]; // scientific names that use this code
  }>;
}

export async function searchGroupedComprehensive(
  query: string,
  limit = 30
): Promise<SearchGroupedResponse> {
  const db = await getDb();
  
  const ftColumns = ['scientific_name', 'trade_name', 'indication', 'icd_codes_raw'];
  const likeColumns = [drugEntries.scientificName, drugEntries.tradeName, drugEntries.indication, drugEntries.icdCodesRaw];
  const words = query.trim().split(/\s+/).filter(w => w.length > 0);
  
  // Build LIKE-based fallback conditions (word-level AND → OR)
  const searchConditions = words.map(word => {
    const q = `%${word}%`;
    return or(...likeColumns.map(col => ciLike(col, q)));
  });
  const andLike = searchConditions.length > 0 ? and(...searchConditions) : undefined;
  const orLike = searchConditions.length > 1 ? or(...searchConditions) : andLike;

  // Try FULLTEXT first, fallback to LIKE with AND→OR
  let allMatches: any[];
  const ftCondition = fulltextMatch(ftColumns, query);

  if (ftCondition) {
    try {
      allMatches = await db.select().from(drugEntries).where(ftCondition).limit(limit * 2);
    } catch {
      allMatches = [];
    }
    if (allMatches.length === 0) {
      allMatches = await db.select().from(drugEntries).where(andLike!).limit(limit * 2);
      if (allMatches.length === 0 && orLike !== andLike) {
        allMatches = await db.select().from(drugEntries).where(orLike!).limit(limit * 2);
      }
    }
  } else {
    allMatches = await db.select().from(drugEntries).where(andLike!).limit(limit * 2);
    if (allMatches.length === 0 && orLike !== andLike) {
      allMatches = await db.select().from(drugEntries).where(orLike!).limit(limit * 2);
    }
  }

  if (allMatches.length === 0) return { medications: [], conditions: [], codes: [] };

  // Enrich with codes
  const enriched = await enrichDrugEntriesWithCodes(
    allMatches as Array<{ id: number; scientificName: string; tradeName: string; indication: string; icdCodesRaw: string }>
  );

  // ===== MEDICATIONS TAB: Group by scientific name =====
  const medicationsByScientificName = new Map<string, {
    tradeNames: Set<string>;
    indicationMap: Map<string, { codes: Map<string, CodeInfo> }>;
  }>();

  for (const entry of enriched) {
    if (!medicationsByScientificName.has(entry.scientificName)) {
      medicationsByScientificName.set(entry.scientificName, {
        tradeNames: new Set(),
        indicationMap: new Map(),
      });
    }
    const g = medicationsByScientificName.get(entry.scientificName)!;
    g.tradeNames.add(entry.tradeName);

    if (!g.indicationMap.has(entry.indication)) {
      g.indicationMap.set(entry.indication, { codes: new Map() });
    }
    const indGroup = g.indicationMap.get(entry.indication)!;
    for (const code of entry.icdCodes) {
      if (!indGroup.codes.has(code.code)) {
        indGroup.codes.set(code.code, code);
      }
    }
  }

  const medications: GroupedDrugResult[] = Array.from(medicationsByScientificName.entries())
    .slice(0, limit)
    .map(([sciName, g]) => {
      const tradeNames = Array.from(g.tradeNames).sort();
      const indications = Array.from(g.indicationMap.entries()).map(([indication, { codes }]) => {
        const codeList = Array.from(codes.values());
        const hasNonCovered = codeList.some(c => c.isNonCovered);
        const hasCovered = codeList.some(c => !c.isNonCovered);
        const coverageStatus: "COVERED" | "NON-COVERED" | "PARTIAL" =
          codeList.length === 0 ? "COVERED" :
          hasNonCovered && hasCovered ? "PARTIAL" :
          hasNonCovered ? "NON-COVERED" : "COVERED";
        return { indication, codes: codeList, coverageStatus };
      });

      const allCodes = indications.flatMap(i => i.codes);
      const hasNonCovered = allCodes.some(c => c.isNonCovered);
      const hasCovered = allCodes.some(c => !c.isNonCovered);
      const overallCoverage: "COVERED" | "NON-COVERED" | "PARTIAL" =
        allCodes.length === 0 ? "COVERED" :
        hasNonCovered && hasCovered ? "PARTIAL" :
        hasNonCovered ? "NON-COVERED" : "COVERED";

      return {
        scientificName: sciName,
        tradeNames,
        indications,
        overallCoverage,
        totalTradeNames: tradeNames.length,
      };
    });

  // ===== CONDITIONS TAB: Group by indication =====
  const conditionsByIndication = new Map<string, {
    scientificNames: Set<string>;
    tradeNames: Set<string>;
    codes: Map<string, CodeInfo>;
  }>();

  for (const entry of enriched) {
    if (!conditionsByIndication.has(entry.indication)) {
      conditionsByIndication.set(entry.indication, {
        scientificNames: new Set(),
        tradeNames: new Set(),
        codes: new Map(),
      });
    }
    const g = conditionsByIndication.get(entry.indication)!;
    g.scientificNames.add(entry.scientificName);
    g.tradeNames.add(entry.tradeName);
    for (const code of entry.icdCodes) {
      if (!g.codes.has(code.code)) {
        g.codes.set(code.code, code);
      }
    }
  }

  const conditions = Array.from(conditionsByIndication.entries())
    .slice(0, limit)
    .map(([indication, g]) => ({
      indication,
      scientificNames: Array.from(g.scientificNames).sort(),
      tradeNames: Array.from(g.tradeNames).sort(),
      codes: Array.from(g.codes.values()),
    }));

  // ===== CODES TAB: Group by ICD-10 code =====
  const codesByCode = new Map<string, {
    code: CodeInfo;
    medications: Set<string>;
  }>();

  for (const entry of enriched) {
    for (const code of entry.icdCodes) {
      if (!codesByCode.has(code.code)) {
        codesByCode.set(code.code, {
          code,
          medications: new Set(),
        });
      }
      const g = codesByCode.get(code.code)!;
      g.medications.add(entry.scientificName);
    }
  }

  const codesResult = Array.from(codesByCode.values())
    .slice(0, limit)
    .map(({ code, medications }) => ({
      code: code.code,
      description: code.description,
      branchCount: code.branchCount,
      isNonCovered: code.isNonCovered,
      branches: code.branches,
      medications: Array.from(medications).sort(),
    }));

  return { medications, conditions, codes: codesResult };
}

export async function searchGroupedByScientificName(
  query: string,
  limit = 30
): Promise<GroupedDrugResult[]> {
  const db = await getDb();
  
  const ftColumns = ['scientific_name', 'trade_name', 'indication', 'icd_codes_raw'];
  const likeColumns = [drugEntries.scientificName, drugEntries.tradeName, drugEntries.indication, drugEntries.icdCodesRaw];
  const words = query.trim().split(/\s+/).filter(w => w.length > 0);
  
  // Build LIKE-based fallback conditions
  const searchConditions = words.map(word => {
    const q = `%${word}%`;
    return or(...likeColumns.map(col => ciLike(col, q)));
  });
  const andLike = searchConditions.length > 0 ? and(...searchConditions) : undefined;
  const orLike = searchConditions.length > 1 ? or(...searchConditions) : andLike;

  // Try FULLTEXT first, fallback to LIKE with AND→OR
  const ftCondition = fulltextMatch(ftColumns, query);

  let sciNames: Array<{ scientificName: string }>;
  if (ftCondition) {
    try {
      sciNames = await db
        .select({ scientificName: drugEntries.scientificName })
        .from(drugEntries).where(ftCondition)
        .groupBy(drugEntries.scientificName)
        .orderBy(drugEntries.scientificName)
        .limit(limit) as any;
    } catch {
      sciNames = [];
    }

    if (sciNames.length === 0) {
      sciNames = await db
        .select({ scientificName: drugEntries.scientificName })
        .from(drugEntries).where(andLike!)
        .groupBy(drugEntries.scientificName)
        .orderBy(drugEntries.scientificName)
        .limit(limit) as any;
      if (sciNames.length === 0 && orLike !== andLike) {
        sciNames = await db
          .select({ scientificName: drugEntries.scientificName })
          .from(drugEntries).where(orLike!)
          .groupBy(drugEntries.scientificName)
          .orderBy(drugEntries.scientificName)
          .limit(limit) as any;
      }
    }
  } else {
    sciNames = await db
      .select({ scientificName: drugEntries.scientificName })
      .from(drugEntries).where(andLike!)
      .groupBy(drugEntries.scientificName)
      .orderBy(drugEntries.scientificName)
      .limit(limit) as any;
    if (sciNames.length === 0 && orLike !== andLike) {
      sciNames = await db
        .select({ scientificName: drugEntries.scientificName })
        .from(drugEntries).where(orLike!)
        .groupBy(drugEntries.scientificName)
        .orderBy(drugEntries.scientificName)
        .limit(limit) as any;
    }
  }

  if (sciNames.length === 0) return [];

  const sciNameList = (sciNames as Array<{ scientificName: string }>).map(r => r.scientificName);

  // Step 2: Load all entries for these scientific names
  const allEntries = await db
    .select()
    .from(drugEntries)
    .where(inArray(drugEntries.scientificName, sciNameList));

  // Step 3: Enrich with codes
  const enriched = await enrichDrugEntriesWithCodes(
    allEntries as Array<{ id: number; scientificName: string; tradeName: string; indication: string; icdCodesRaw: string }>
  );

  // Step 4: Group by scientific name
  const grouped = new Map<string, {
    tradeNames: Set<string>;
    indicationMap: Map<string, { codes: Map<string, CodeInfo> }>;
  }>();

  for (const entry of enriched) {
    if (!grouped.has(entry.scientificName)) {
      grouped.set(entry.scientificName, {
        tradeNames: new Set(),
        indicationMap: new Map(),
      });
    }
    const g = grouped.get(entry.scientificName)!;
    g.tradeNames.add(entry.tradeName);

    if (!g.indicationMap.has(entry.indication)) {
      g.indicationMap.set(entry.indication, { codes: new Map() });
    }
    const indGroup = g.indicationMap.get(entry.indication)!;
    for (const code of entry.icdCodes) {
      if (!indGroup.codes.has(code.code)) {
        indGroup.codes.set(code.code, code);
      }
    }
  }

  // Step 5: Build output, preserving the order from sciNameList
  return sciNameList.map(sciName => {
    const g = grouped.get(sciName);
    if (!g) return null;

    const tradeNames = Array.from(g.tradeNames).sort();
    const indications = Array.from(g.indicationMap.entries()).map(([indication, { codes }]) => {
      const codeList = Array.from(codes.values());
      const hasNonCovered = codeList.some(c => c.isNonCovered);
      const hasCovered = codeList.some(c => !c.isNonCovered);
      const coverageStatus: "COVERED" | "NON-COVERED" | "PARTIAL" =
        codeList.length === 0 ? "COVERED" :
        hasNonCovered && hasCovered ? "PARTIAL" :
        hasNonCovered ? "NON-COVERED" : "COVERED";
      return { indication, codes: codeList, coverageStatus };
    });

    const allCodes = indications.flatMap(i => i.codes);
    const hasNonCovered = allCodes.some(c => c.isNonCovered);
    const hasCovered = allCodes.some(c => !c.isNonCovered);
    const overallCoverage: "COVERED" | "NON-COVERED" | "PARTIAL" =
      allCodes.length === 0 ? "COVERED" :
      hasNonCovered && hasCovered ? "PARTIAL" :
      hasNonCovered ? "NON-COVERED" : "COVERED";

    return {
      scientificName: sciName,
      tradeNames,
      indications,
      overallCoverage,
      totalTradeNames: tradeNames.length,
    };
  }).filter(Boolean) as GroupedDrugResult[];
}


// ─── Metrics & Analytics ────────────────────────────────────────────────────────

/**
 * Get recent searches with timestamps
 * @param limit - number of recent searches to return (default 20)
 */
export async function getRecentSearches(limit = 20) {
  const db = await getDb();
  
  const searches = await db
    .select({
      id: searchAnalytics.id,
      query: searchAnalytics.query,
      resultsCount: searchAnalytics.resultsCount,
      responseTimeMs: searchAnalytics.responseTimeMs,
      createdAt: searchAnalytics.createdAt,
    })
    .from(searchAnalytics)
    .orderBy(desc(searchAnalytics.createdAt))
    .limit(limit);

  return searches;
}

/**
 * Get aggregated recent searches (groups same searches together)
 * @param limit - number of unique searches to return (default 10)
 */
export async function getAggregatedRecentSearches(limit = 10) {
  const db = await getDb();
  
  // Get unique searches with their latest occurrence and total count
  const searches = await db
    .select({
      query: searchAnalytics.query,
      count: count().as("count"),
      lastSearchedAt: sql<Date>`MAX(${searchAnalytics.createdAt})`.as("lastSearchedAt"),
      avgResponseTime: sql<number>`ROUND(AVG(${searchAnalytics.responseTimeMs}), 2)`.as("avgResponseTime"),
    })
    .from(searchAnalytics)
    .groupBy(searchAnalytics.query)
    .orderBy(sql`MAX(${searchAnalytics.createdAt}) DESC`)
    .limit(limit);
  
  return (searches as Array<{
    query: string;
    count: number | bigint;
    lastSearchedAt: Date | null;
    avgResponseTime: string | number | null;
  }>).map((row) => ({
    query: row.query,
    count: Number(row.count),
    lastSearchedAt: row.lastSearchedAt,
    avgResponseTime: Number(row.avgResponseTime ?? 0),
  }));
}

/**
 * Get active users count (users with activity in last X minutes)
 * @param minutesAgo - consider users active if they were seen in last X minutes (default 15)
 */
export async function getActiveUsersCount(minutesAgo = 15) {
  const db = await getDb();
  
  const cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000);
  
  const result = await db
    .select({ count: count() })
    .from(userSessions)
    .where(gte(userSessions.lastSeenAt, cutoffTime));

  return result[0]?.count || 0;
}

/**
 * Get top searches by frequency
 * @param limit - number of top searches to return (default 10)
 */
export async function getTopSearches(limit = 10, hoursAgo = 720) {
  const db = await getDb();
  const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  
  const topSearches = await db
    .select({
      query: searchAnalytics.query,
      count: count().as("count"),
      avgResponseTime: sql<number>`ROUND(AVG(${searchAnalytics.responseTimeMs}), 2)`.as("avgResponseTime"),
    })
    .from(searchAnalytics)
    .where(gte(searchAnalytics.createdAt, cutoffTime))
    .groupBy(searchAnalytics.query)
    .orderBy(desc(count()))
    .limit(limit);
  
  // Convert avgResponseTime from string (returned by SQL ROUND) to number
  return (topSearches as Array<{ query: string; count: number | bigint; avgResponseTime: string | number | null }>).map((row) => ({
    query: row.query,
    count: Number(row.count),
    avgResponseTime: Number(row.avgResponseTime ?? 0),
  }));
}

/**
 * Get search metrics for the last X hours
 * @param hoursAgo - analyze searches from last X hours (default 24)
 */
export async function getSearchMetrics(hoursAgo = 24) {
  const db = await getDb();
  
  const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  // Metrics logging removed for security
  const result = await db
    .select({
      totalSearches: count().as("totalSearches"),
      avgResponseTime: sql<number>`ROUND(COALESCE(AVG(${searchAnalytics.responseTimeMs}), 0), 2)`.as("avgResponseTime"),
      minResponseTime: sql<number>`COALESCE(MIN(${searchAnalytics.responseTimeMs}), 0)`.as("minResponseTime"),
      maxResponseTime: sql<number>`COALESCE(MAX(${searchAnalytics.responseTimeMs}), 0)`.as("maxResponseTime"),
    })
    .from(searchAnalytics)
    .where(gte(searchAnalytics.createdAt, cutoffTime));

  const row = result[0];
  const metrics = {
    totalSearches: Number(row?.totalSearches ?? 0),
    avgResponseTime: Number(row?.avgResponseTime ?? 0),
    minResponseTime: Number(row?.minResponseTime ?? 0),
    maxResponseTime: Number(row?.maxResponseTime ?? 0),
  };
  return metrics;
}

/**
 * Get hourly search activity for the last X hours
 * @param hoursAgo - analyze activity from last X hours (default 24)
 */
export async function getHourlyActivity(hoursAgo = 24) {
  const db = await getDb();
  
  const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  
  // Use raw SQL for complex DATE_FORMAT queries
  const activity = await db.execute(
    sql`SELECT DATE_FORMAT(createdAt, '%Y-%m-%d %H:00:00') as hour, COUNT(*) as count
        FROM search_analytics
        WHERE createdAt >= ${cutoffTime}
        GROUP BY DATE_FORMAT(createdAt, '%Y-%m-%d %H:00:00')
        ORDER BY hour DESC`
  );

  return (activity as any)[0] || [];
}

/**
 * Track a search query
 */
export async function trackSearch(data: InsertSearchAnalytic) {
  const db = await getDb();
  
  try {
    await db.insert(searchAnalytics).values({
      query: data.query,
      resultsCount: data.resultsCount || 0,
      searchType: data.searchType || 'general',
      responseTimeMs: data.responseTimeMs || 0,
      userId: data.userId || null,
      ipAddress: data.ipAddress || null,
    });
  } catch (err) {
    console.error('Error tracking search:', err);
  }
}

/**
 * Update or create user session
 */
export async function updateUserSession(
  sessionId: string,
  userId: number | null,
  ipAddress?: string,
  userAgent?: string
) {
  const db = await getDb();
  const { userSessions } = await import("../drizzle/schema");
  
  // Try to update existing session
  const existing = await db
    .select()
    .from(userSessions)
    .where(eq(userSessions.sessionId, sessionId))
    .limit(1);

  if (existing.length > 0) {
    // Update last seen time
    await db
      .update(userSessions)
      .set({ lastSeenAt: new Date() })
      .where(eq(userSessions.sessionId, sessionId));
  } else {
    // Create new session
    await db.insert(userSessions).values({
      sessionId,
      userId,
      ipAddress,
      userAgent,
    });
  }
}

// ─── Feature Usage Tracking ────────────────────────────────────────────────────

import { featureUsageTracking, type InsertFeatureUsageTracking } from "../drizzle/schema";

export async function trackFeatureUsage(data: Omit<InsertFeatureUsageTracking, 'createdAt'>) {
  try {
    const db = await getDb();
    await db.insert(featureUsageTracking).values({
      ...data,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Error tracking feature usage:", error);
  }
}

export async function getFeatureUsageStats(featureName: string, days: number = 7) {
  try {
    const db = await getDb();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const stats = await db
      .select({
        count: count(),
        feature: featureUsageTracking.featureName,
      })
      .from(featureUsageTracking)
      .where(
        and(
          eq(featureUsageTracking.featureName, featureName),
          gte(featureUsageTracking.createdAt, cutoffDate)
        )
      )
      .groupBy(featureUsageTracking.featureName);

    return stats[0]?.count || 0;
  } catch (error) {
    console.error("Error getting feature usage stats:", error);
    return 0;
  }
}

export async function getAllFeatureUsageStats(days: number = 7) {
  try {
    const db = await getDb();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const stats = await db
      .select({
        feature: featureUsageTracking.featureName,
        count: count(),
      })
      .from(featureUsageTracking)
      .where(gte(featureUsageTracking.createdAt, cutoffDate))
      .groupBy(featureUsageTracking.featureName);

    return stats;
  } catch (error) {
    console.error("Error getting all feature usage stats:", error);
    return [];
  }
}

export async function getTotalFeatureUsageCount(featureName: string) {
  try {
    const db = await getDb();
    const result = await db
      .select({ count: count() })
      .from(featureUsageTracking)
      .where(eq(featureUsageTracking.featureName, featureName));

    return result[0]?.count || 0;
  } catch (error) {
    console.error("Error getting total feature usage count:", error);
    return 0;
  }
}
