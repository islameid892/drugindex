#!/usr/bin/env node

/**
 * Smart Price Update Migration Script
 * Updates drug prices from SFDA official data using fuzzy matching
 * Run with: node migrate-prices.mjs
 */

import XLSX from 'xlsx';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

// Fuzzy matching function
function tokenSetRatio(str1, str2) {
  if (!str1 || !str2) return 0;

  const tokens1 = new Set(str1.split(/\s+/));
  const tokens2 = new Set(str2.split(/\s+/));

  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);

  return (intersection.size / union.size) * 100;
}

function normalizeName(name) {
  if (!name) return '';
  return String(name).trim().toUpperCase();
}

function findBestMatch(sfdaDrug, dbDrugs, threshold = 75) {
  const sfdaSci = normalizeName(sfdaDrug.scientific_name);
  const sfdaTrade = normalizeName(sfdaDrug.trade_name);

  let bestScore = 0;
  let bestMatch = null;
  let bestType = null;

  for (const dbDrug of dbDrugs) {
    const dbSci = normalizeName(dbDrug.scientificName);
    const dbTrade = normalizeName(dbDrug.tradeName);

    // Exact match on scientific name
    if (sfdaSci && dbSci && sfdaSci === dbSci) {
      return { dbId: dbDrug.id, score: 100, matchType: 'exact_scientific' };
    }

    // Exact match on trade name
    if (sfdaTrade && dbTrade && sfdaTrade === dbTrade) {
      return { dbId: dbDrug.id, score: 100, matchType: 'exact_trade' };
    }

    // Fuzzy match on scientific name
    if (sfdaSci && dbSci) {
      const sciScore = tokenSetRatio(sfdaSci, dbSci);
      if (sciScore > bestScore) {
        bestScore = sciScore;
        bestMatch = dbDrug.id;
        bestType = 'fuzzy_scientific';
      }
    }

    // Fuzzy match on trade name
    if (sfdaTrade && dbTrade) {
      const tradeScore = tokenSetRatio(sfdaTrade, dbTrade);
      if (tradeScore > bestScore) {
        bestScore = tradeScore;
        bestMatch = dbDrug.id;
        bestType = 'fuzzy_trade';
      }
    }

    // Combined fuzzy match
    if (sfdaSci && dbSci && sfdaTrade && dbTrade) {
      const combined =
        tokenSetRatio(sfdaSci, dbSci) * 0.6 +
        tokenSetRatio(sfdaTrade, dbTrade) * 0.4;
      if (combined > bestScore) {
        bestScore = combined;
        bestMatch = dbDrug.id;
        bestType = 'combined_fuzzy';
      }
    }
  }

  if (bestScore >= threshold && bestMatch) {
    return { dbId: bestMatch, score: bestScore, matchType: bestType };
  }

  return null;
}

async function updatePrices() {
  console.log('='.repeat(80));
  console.log('ICD-10 Drug Lens - Smart Price Update');
  console.log('='.repeat(80));

  // Load SFDA data
  console.log('\n📥 Loading SFDA price data...');
  const workbook = XLSX.readFile('/home/ubuntu/upload/sfda_drugs_full.xlsx');
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet);

  const sfdaDrugs = [];
  for (const row of data) {
    // Handle Arabic column names
    const price = parseFloat(row['السعر'] || row['Price'] || row['price']);
    const tradeName = row['الاسم التجاري'] || row['Trade Name'] || row['trade_name'];
    const scientificName = row['الاسم العلمي'] || row['Scientific Name'] || row['scientific_name'];

    if (!isNaN(price) && tradeName && scientificName) {
      sfdaDrugs.push({
        scientific_name: String(scientificName).trim(),
        trade_name: String(tradeName).trim(),
        strength: row['التركيز'] || row['Strength'] || '',
        pharmaceutical_form: row['الشكل الصيدلاني'] || row['Form'] || '',
        price,
      });
    }
  }
  console.log(`✓ Loaded ${sfdaDrugs.length} drugs from SFDA`);

  // Connect to database
  console.log('\n🔗 Connecting to database...');
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
  });

  // Fetch all drugs
  console.log('📊 Fetching database drugs...');
  const [dbDrugs] = await connection.execute(
    'SELECT id, scientific_name as scientificName, trade_name as tradeName, price FROM drug_lens'
  );

  console.log(`✓ Loaded ${dbDrugs.length} drugs from database`);

  // Convert result rows to objects with proper field names
  const dbDrugsNormalized = dbDrugs.map(drug => ({
    id: drug[0],
    scientificName: drug[1],
    tradeName: drug[2],
    price: drug[3],
  }));

  // Statistics
  const stats = {
    total_sfda: sfdaDrugs.length,
    total_db: dbDrugsNormalized.length,
    matched: 0,
    updated: 0,
    high_confidence: 0,
    medium_confidence: 0,
    low_confidence: 0,
    no_match: 0,
    price_changes: [],
  };

  // Process each SFDA drug
  console.log('\n🔍 Matching and updating prices...');
  for (let idx = 0; idx < sfdaDrugs.length; idx++) {
    if ((idx + 1) % 1000 === 0) {
      console.log(`  Progress: ${idx + 1}/${sfdaDrugs.length}`);
    }

    const sfdaDrug = sfdaDrugs[idx];
    const matchResult = findBestMatch(sfdaDrug, dbDrugsNormalized, 75);

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
    const currentDb = dbDrugsNormalized.find(d => d.id === matchResult.dbId);
    const currentPrice = currentDb?.price || null;
    const newPrice = String(sfdaDrug.price);

    // Update if price is different
    if (currentPrice !== newPrice) {
      await connection.execute(
        'UPDATE drug_lens SET price = ?, updatedAt = NOW() WHERE id = ?',
        [newPrice, matchResult.dbId]
      );

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

  // Print report
  console.log('\n' + '='.repeat(80));
  console.log('📋 UPDATE REPORT');
  console.log('='.repeat(80));
  console.log(`\nTotal SFDA drugs: ${stats.total_sfda}`);
  console.log(`Total DB drugs: ${dbDrugsNormalized.length}`);
  console.log(`\n✓ Matched: ${stats.matched} (${((stats.matched / stats.total_sfda) * 100).toFixed(1)}%)`);
  console.log(`  - High confidence (≥95%): ${stats.high_confidence}`);
  console.log(`  - Medium confidence (85-95%): ${stats.medium_confidence}`);
  console.log(`  - Low confidence (75-85%): ${stats.low_confidence}`);
  console.log(`\n✓ Price updates: ${stats.updated}`);
  console.log(
    `✗ No match found: ${stats.no_match} (${((stats.no_match / stats.total_sfda) * 100).toFixed(1)}%)`
  );

  // Sample price changes
  if (stats.price_changes.length > 0) {
    console.log('\n📊 Sample Price Changes (First 20):');
    console.log('─'.repeat(80));
    for (let i = 0; i < Math.min(20, stats.price_changes.length); i++) {
      const change = stats.price_changes[i];
      console.log(
        `${change.trade_name.substring(0, 40).padEnd(40)} | ${String(change.old_price).padEnd(10)} → ${String(change.new_price).padEnd(10)} | ${change.confidence}%`
      );
    }
  }

  console.log('\n✅ Price update completed successfully!');
  console.log(`\n📈 Summary: ${stats.updated} prices updated, ${stats.no_match} drugs not matched`);

  await connection.end();
}

updatePrices().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
