/**
 * Smart Price Update Service
 * Uses fuzzy matching to intelligently match SFDA prices with existing drugs
 */

import * as XLSX from 'xlsx';
import { getDb } from './db';
import { drugLens } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

interface SFDADrug {
  scientific_name: string;
  trade_name: string;
  strength: string;
  pharmaceutical_form: string;
  price: number;
}

interface DBDrug {
  id: number;
  scientific_name: string;
  trade_name: string;
  price: string | null;
}

interface MatchResult {
  dbId: number;
  score: number;
  matchType: string;
}

interface PriceUpdateStats {
  total_sfda: number;
  total_db: number;
  matched: number;
  updated: number;
  high_confidence: number;
  medium_confidence: number;
  low_confidence: number;
  no_match: number;
  price_changes: Array<{
    id: number;
    scientific_name: string;
    trade_name: string;
    old_price: string | null;
    new_price: string;
    match_type: string;
    confidence: number;
  }>;
}

/**
 * Normalize drug names for comparison
 */
function normalizeName(name: string | undefined | null): string {
  if (!name) return '';
  return String(name).trim().toUpperCase();
}

/**
 * Calculate string similarity using token set ratio
 * Similar to fuzzywuzzy's token_set_ratio
 */
function tokenSetRatio(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  // Split into tokens
  const tokens1 = new Set(str1.split(/\s+/));
  const tokens2 = new Set(str2.split(/\s+/));

  // Calculate intersection and union
  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);

  // Jaccard similarity
  return (intersection.size / union.size) * 100;
}

/**
 * Find best matching drug in database using fuzzy matching
 */
function findBestMatch(
  sfdaDrug: SFDADrug,
  dbDrugs: DBDrug[],
  threshold: number = 75
): MatchResult | null {
  const sfdaSci = normalizeName(sfdaDrug.scientific_name);
  const sfdaTrade = normalizeName(sfdaDrug.trade_name);

  let bestScore = 0;
  let bestMatch: MatchResult | null = null;

  for (const dbDrug of dbDrugs) {
    const dbSci = normalizeName(dbDrug.scientific_name);
    const dbTrade = normalizeName(dbDrug.trade_name);

    // Strategy 1: Exact match on scientific name
    if (sfdaSci && dbSci && sfdaSci === dbSci) {
      return {
        dbId: dbDrug.id,
        score: 100,
        matchType: 'exact_scientific',
      };
    }

    // Strategy 2: Exact match on trade name
    if (sfdaTrade && dbTrade && sfdaTrade === dbTrade) {
      return {
        dbId: dbDrug.id,
        score: 100,
        matchType: 'exact_trade',
      };
    }

    // Strategy 3: Fuzzy match on scientific name (high weight)
    if (sfdaSci && dbSci) {
      const sciScore = tokenSetRatio(sfdaSci, dbSci);
      if (sciScore > bestScore) {
        bestScore = sciScore;
        bestMatch = {
          dbId: dbDrug.id,
          score: sciScore,
          matchType: 'fuzzy_scientific',
        };
      }
    }

    // Strategy 4: Fuzzy match on trade name
    if (sfdaTrade && dbTrade) {
      const tradeScore = tokenSetRatio(sfdaTrade, dbTrade);
      if (tradeScore > bestScore) {
        bestScore = tradeScore;
        bestMatch = {
          dbId: dbDrug.id,
          score: tradeScore,
          matchType: 'fuzzy_trade',
        };
      }
    }

    // Strategy 5: Combined fuzzy match
    if (sfdaSci && dbSci && sfdaTrade && dbTrade) {
      const combined =
        tokenSetRatio(sfdaSci, dbSci) * 0.6 +
        tokenSetRatio(sfdaTrade, dbTrade) * 0.4;
      if (combined > bestScore) {
        bestScore = combined;
        bestMatch = {
          dbId: dbDrug.id,
          score: combined,
          matchType: 'combined_fuzzy',
        };
      }
    }
  }

  if (bestScore >= threshold && bestMatch) {
    return bestMatch;
  }

  return null;
}

/**
 * Load SFDA data from Excel file
 */
function loadSFDAData(filePath: string): SFDADrug[] {
  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];

  const drugs: SFDADrug[] = [];

  // Skip header row
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const price = parseFloat(row[4]);

    if (!isNaN(price) && row[1]) {
      // Check if trade_name exists
      drugs.push({
        scientific_name: row[0] || '',
        trade_name: row[1] || '',
        strength: row[2] || '',
        pharmaceutical_form: row[3] || '',
        price,
      });
    }
  }

  return drugs;
}

/**
 * Update prices in database
 */
export async function updatePricesFromSFDA(
  filePath: string
): Promise<PriceUpdateStats> {
  console.log('📥 Loading SFDA price data...');
  const sfdaDrugs = loadSFDAData(filePath);
  console.log(`✓ Loaded ${sfdaDrugs.length} drugs from SFDA`);

  console.log('📊 Fetching database drugs...');
  const db = await getDb();
  const dbDrugs = await db
    .select({
      id: drugLens.id,
      scientific_name: drugLens.scientificName,
      trade_name: drugLens.tradeName,
      price: drugLens.price,
    })
    .from(drugLens);

  console.log(`✓ Loaded ${dbDrugs.length} drugs from database`);

  const stats: PriceUpdateStats = {
    total_sfda: sfdaDrugs.length,
    total_db: dbDrugs.length,
    matched: 0,
    updated: 0,
    high_confidence: 0,
    medium_confidence: 0,
    low_confidence: 0,
    no_match: 0,
    price_changes: [],
  };

  console.log('🔍 Matching and updating prices...');

  for (let idx = 0; idx < sfdaDrugs.length; idx++) {
    if ((idx + 1) % 1000 === 0) {
      console.log(`  Progress: ${idx + 1}/${sfdaDrugs.length}`);
    }

    const sfdaDrug = sfdaDrugs[idx];
    const matchResult = findBestMatch(sfdaDrug, dbDrugs, 75);

    if (!matchResult) {
      stats.no_match++;
      continue;
    }

    stats.matched++;

    // Categorize confidence
    if (matchResult.score >= 95) {
      stats.high_confidence++;
    } else if (matchResult.score >= 85) {
      stats.medium_confidence++;
    } else {
      stats.low_confidence++;
    }

    // Get current price from DB
    const currentDb = dbDrugs.find((d: any) => d.id === matchResult.dbId);
    const currentPrice = currentDb?.price || null;
    const newPrice = String(sfdaDrug.price);

    // Update if price is different
    if (currentPrice !== newPrice) {
      await db
        .update(drugLens)
        .set({
          price: newPrice,
          updatedAt: new Date(),
        })
        .where(eq(drugLens.id, matchResult.dbId));

      stats.updated++;
      stats.price_changes.push({
        id: matchResult.dbId,
        scientific_name: sfdaDrug.scientific_name,
        trade_name: sfdaDrug.trade_name,
        old_price: currentPrice,
        new_price: newPrice,
        match_type: matchResult.matchType,
        confidence: Math.round(matchResult.score),
      });
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📋 UPDATE REPORT');
  console.log('='.repeat(80));
  console.log(`\nTotal SFDA drugs: ${stats.total_sfda}`);
  console.log(`Total DB drugs: ${stats.total_db}`);
  console.log(
    `\n✓ Matched: ${stats.matched} (${((stats.matched / stats.total_sfda) * 100).toFixed(1)}%)`
  );
  console.log(`  - High confidence (≥95%): ${stats.high_confidence}`);
  console.log(`  - Medium confidence (85-95%): ${stats.medium_confidence}`);
  console.log(`  - Low confidence (75-85%): ${stats.low_confidence}`);
  console.log(`\n✓ Price updates: ${stats.updated}`);
  console.log(
    `✗ No match found: ${stats.no_match} (${((stats.no_match / stats.total_sfda) * 100).toFixed(1)}%)`
  );

  return stats;
}
