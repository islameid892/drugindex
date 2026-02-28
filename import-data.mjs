/**
 * Comprehensive data import script for ICD-10 Search Engine
 * 
 * Imports data from Excel files into the new normalized schema:
 * 1. ICD codes + branches from codes.xlsx
 * 2. Non-covered codes from Non-CoveredICD-10(2).xlsx
 * 3. Drug entries from APPROVAL_Clean.xlsx
 * 4. Links drug entries to ICD codes
 */

import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const conn = await createConnection(dbUrl);
console.log('✓ Connected to database');

// ─── STEP 1: Import ICD Codes + Branches ──────────────────────────────────────
console.log('\n=== Step 1: Importing ICD Codes + Branches ===');

// Clear existing data
await conn.execute('DELETE FROM icd_branches');
await conn.execute('DELETE FROM icd_codes');
console.log('✓ Cleared existing ICD data');

const codesWb = XLSX.readFile('/home/ubuntu/codes.xlsx');

// Import main codes from TREE SUMMERY sheet
const summaryWs = codesWb.Sheets['TREE SUMMERY'];
const summaryData = XLSX.utils.sheet_to_json(summaryWs, { header: 1 });
// Skip header row
const mainCodes = summaryData.slice(1).filter(row => row[0] && row[1]);

console.log(`Importing ${mainCodes.length} main ICD codes...`);

// Batch insert main codes
const codeMap = new Map(); // code -> id
const BATCH = 500;

for (let i = 0; i < mainCodes.length; i += BATCH) {
  const batch = mainCodes.slice(i, i + BATCH);
  const values = batch.map(row => [
    String(row[0]).trim(),
    String(row[1]).trim(),
    parseInt(row[2]) || 0
  ]);
  
  await conn.query(
    'INSERT INTO icd_codes (code, description, branch_count) VALUES ?',
    [values]
  );
  
  if ((i + BATCH) % 1000 === 0 || i + BATCH >= mainCodes.length) {
    process.stdout.write(`\r  Progress: ${Math.min(i + BATCH, mainCodes.length)}/${mainCodes.length}`);
  }
}
console.log('\n✓ Main codes imported');

// Load all code IDs into map
const [codeRows] = await conn.execute('SELECT id, code FROM icd_codes');
for (const row of codeRows) {
  codeMap.set(row.code, row.id);
}
console.log(`✓ Loaded ${codeMap.size} code IDs`);

// Import branches from ICD-10 CODE TREE sheet
const treeWs = codesWb.Sheets['ICD-10 CODE TREE'];
const treeData = XLSX.utils.sheet_to_json(treeWs, { header: 1 });
// Skip header, filter rows with branch codes
const branchRows = treeData.slice(1).filter(row => row[0] && row[2] && row[3]);

console.log(`\nImporting ${branchRows.length} branch codes...`);

let branchBatch = [];
let branchCount = 0;
let skippedBranches = 0;

for (const row of branchRows) {
  const parentCode = String(row[0]).trim();
  const branchCode = String(row[2]).trim();
  const branchDesc = String(row[3]).trim();
  
  const parentId = codeMap.get(parentCode);
  if (!parentId) {
    skippedBranches++;
    continue;
  }
  
  branchBatch.push([parentId, branchCode, branchDesc]);
  
  if (branchBatch.length >= BATCH) {
    await conn.query(
      'INSERT INTO icd_branches (parent_code_id, branch_code, branch_description) VALUES ?',
      [branchBatch]
    );
    branchCount += branchBatch.length;
    branchBatch = [];
    process.stdout.write(`\r  Progress: ${branchCount}/${branchRows.length}`);
  }
}

if (branchBatch.length > 0) {
  await conn.query(
    'INSERT INTO icd_branches (parent_code_id, branch_code, branch_description) VALUES ?',
    [branchBatch]
  );
  branchCount += branchBatch.length;
}

console.log(`\n✓ ${branchCount} branches imported (${skippedBranches} skipped - parent not found)`);

// ─── STEP 2: Import Non-Covered Codes ─────────────────────────────────────────
console.log('\n=== Step 2: Importing Non-Covered Codes ===');

await conn.execute('DELETE FROM non_covered_codes');

const ncWb = XLSX.readFile('/home/ubuntu/upload/Non-CoveredICD-10(2).xlsx');
const ncWs = ncWb.Sheets[ncWb.SheetNames[0]];
const ncData = XLSX.utils.sheet_to_json(ncWs, { header: 1 });
const ncRows = ncData.slice(1).filter(row => row[0]);

console.log(`Importing ${ncRows.length} non-covered codes...`);

let ncBatch = [];
let ncCount = 0;

for (const row of ncRows) {
  const code = String(row[0]).trim();
  const desc = String(row[1] || '').trim();
  ncBatch.push([code, desc]);
  
  if (ncBatch.length >= BATCH) {
    await conn.query(
      'INSERT INTO non_covered_codes (code, description) VALUES ?',
      [ncBatch]
    );
    ncCount += ncBatch.length;
    ncBatch = [];
  }
}

if (ncBatch.length > 0) {
  await conn.query(
    'INSERT INTO non_covered_codes (code, description) VALUES ?',
    [ncBatch]
  );
  ncCount += ncBatch.length;
}

console.log(`✓ ${ncCount} non-covered codes imported`);

// ─── STEP 3: Import Drug Entries ───────────────────────────────────────────────
console.log('\n=== Step 3: Importing Drug Entries ===');

await conn.execute('DELETE FROM drug_entry_codes');
await conn.execute('DELETE FROM drug_entries');

const approvalWb = XLSX.readFile('/home/ubuntu/upload/APPROVAL_Clean.xlsx');
const approvalWs = approvalWb.Sheets['Sheet1'];
const approvalData = XLSX.utils.sheet_to_json(approvalWs, { header: 1 });
const drugRows = approvalData.slice(1).filter(row => row[0] && row[1] && row[2]);

console.log(`Importing ${drugRows.length} drug entries...`);

let drugBatch = [];
let drugCount = 0;

for (const row of drugRows) {
  const scientificName = String(row[0] || '').trim();
  const tradeName = String(row[1] || '').trim();
  const indication = String(row[2] || '').trim();
  const icdCodesRaw = String(row[3] || '').trim();
  
  if (!scientificName || !tradeName || !indication) continue;
  
  drugBatch.push([scientificName, tradeName, indication, icdCodesRaw]);
  
  if (drugBatch.length >= BATCH) {
    await conn.query(
      'INSERT INTO drug_entries (scientific_name, trade_name, indication, icd_codes_raw) VALUES ?',
      [drugBatch]
    );
    drugCount += drugBatch.length;
    drugBatch = [];
    process.stdout.write(`\r  Progress: ${drugCount}/${drugRows.length}`);
  }
}

if (drugBatch.length > 0) {
  await conn.query(
    'INSERT INTO drug_entries (scientific_name, trade_name, indication, icd_codes_raw) VALUES ?',
    [drugBatch]
  );
  drugCount += drugBatch.length;
}

console.log(`\n✓ ${drugCount} drug entries imported`);

// ─── STEP 4: Link Drug Entries to ICD Codes ────────────────────────────────────
console.log('\n=== Step 4: Linking Drug Entries to ICD Codes ===');

// Load all drug entries with their raw codes
const [drugEntries] = await conn.execute(
  'SELECT id, icd_codes_raw FROM drug_entries WHERE icd_codes_raw != ""'
);

console.log(`Processing ${drugEntries.length} drug entries with ICD codes...`);

// Also build a branch-to-parent map for branch codes
const [allBranches] = await conn.execute(
  'SELECT branch_code, parent_code_id FROM icd_branches'
);
const branchToParentId = new Map();
for (const b of allBranches) {
  branchToParentId.set(b.branch_code, b.parent_code_id);
}

let linkBatch = [];
let linkCount = 0;
let notFoundCodes = new Set();

for (const entry of drugEntries) {
  // Parse ICD codes: "E11, E28, O24" or "E11" or "E11,E28"
  const rawCodes = entry.icd_codes_raw;
  const codes = rawCodes.split(/[,;]/).map(c => c.trim()).filter(c => c);
  
  for (const code of codes) {
    // Try exact match first
    let codeId = codeMap.get(code);
    
    // If not found, try as branch code (get parent)
    if (!codeId) {
      codeId = branchToParentId.get(code);
    }
    
    if (!codeId) {
      notFoundCodes.add(code);
      continue;
    }
    
    linkBatch.push([entry.id, codeId]);
    
    if (linkBatch.length >= 1000) {
      // Use INSERT IGNORE to skip duplicates
      await conn.query(
        'INSERT IGNORE INTO drug_entry_codes (drug_entry_id, code_id) VALUES ?',
        [linkBatch]
      );
      linkCount += linkBatch.length;
      linkBatch = [];
      process.stdout.write(`\r  Links created: ${linkCount}`);
    }
  }
}

if (linkBatch.length > 0) {
  await conn.query(
    'INSERT IGNORE INTO drug_entry_codes (drug_entry_id, code_id) VALUES ?',
    [linkBatch]
  );
  linkCount += linkBatch.length;
}

console.log(`\n✓ ${linkCount} drug-code links created`);
if (notFoundCodes.size > 0) {
  console.log(`  Note: ${notFoundCodes.size} codes not found in ICD tree: ${[...notFoundCodes].slice(0, 10).join(', ')}...`);
}

// ─── FINAL: Statistics ─────────────────────────────────────────────────────────
console.log('\n=== Final Statistics ===');

const [[{ drugCount: totalDrugs }]] = await conn.execute('SELECT COUNT(*) as drugCount FROM drug_entries');
const [[{ codeCount }]] = await conn.execute('SELECT COUNT(*) as codeCount FROM icd_codes');
const [[{ branchTotal }]] = await conn.execute('SELECT COUNT(*) as branchTotal FROM icd_branches');
const [[{ ncTotal }]] = await conn.execute('SELECT COUNT(*) as ncTotal FROM non_covered_codes');
const [[{ linkTotal }]] = await conn.execute('SELECT COUNT(*) as linkTotal FROM drug_entry_codes');

console.log(`Drug Entries:    ${totalDrugs.toLocaleString()}`);
console.log(`ICD Main Codes:  ${codeCount.toLocaleString()}`);
console.log(`ICD Branches:    ${branchTotal.toLocaleString()}`);
console.log(`Non-Covered:     ${ncTotal.toLocaleString()}`);
console.log(`Drug-Code Links: ${linkTotal.toLocaleString()}`);

await conn.end();
console.log('\n✅ Import complete!');
