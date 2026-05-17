import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

const parseDbUrl = () => {
  const url = process.env.DATABASE_URL || '';
  const baseUrl = url.split('?')[0];
  const match = baseUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) { console.error('❌ Invalid DATABASE_URL'); process.exit(1); }
  return { user: match[1], password: match[2], host: match[3], port: parseInt(match[4]), database: match[5] };
};

// Create a pool for parallel connections
const pool = await mysql.createPool({
  ...parseDbUrl(),
  ssl: { rejectUnauthorized: false },
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
});

// Load missing records
const allMissing = JSON.parse(readFileSync('/home/ubuntu/missing_drugs.json', 'utf-8'));
console.log(`📊 Total records in missing_drugs.json: ${allMissing.length}`);

// Get already-imported records to avoid duplicates from partial import
const conn = await pool.getConnection();
const [existing] = await conn.execute(`SELECT scientific_name, trade_name, indication FROM drug_entries`);
const existingKeys = new Set(existing.map(r =>
  `${(r.scientific_name||'').trim().toUpperCase()}|||${(r.trade_name||'').trim().toUpperCase()}|||${(r.indication||'').trim().toUpperCase()}`
));
console.log(`📊 Already in DB: ${existing.length} (${existingKeys.size} unique)`);

// Filter only truly missing
const missing = allMissing.filter(record => {
  const key = `${record.scientific_name.trim().toUpperCase()}|||${record.trade_name.trim().toUpperCase()}|||${(record.indication||'').trim().toUpperCase()}`;
  return !existingKeys.has(key);
});
console.log(`📊 Still missing: ${missing.length}\n`);

// Get all ICD codes
const [existingCodes] = await conn.execute(`SELECT id, code FROM icd_codes`);
const codeMap = new Map(existingCodes.map(r => [r.code.trim().toUpperCase(), r.id]));

// Get all ICD branches
const [existingBranches] = await conn.execute(`SELECT id, branch_code, parent_code_id FROM icd_branches`);
const branchMap = new Map(existingBranches.map(r => [r.branch_code.trim().toUpperCase(), r.parent_code_id]));

conn.release();
console.log(`📊 ICD codes: ${codeMap.size}, branches: ${branchMap.size}\n`);

// Split work into chunks for parallel processing
const CHUNK_SIZE = 500;
const PARALLEL_WORKERS = 5;
const chunks = [];
for (let i = 0; i < missing.length; i += CHUNK_SIZE) {
  chunks.push(missing.slice(i, i + CHUNK_SIZE));
}
console.log(`🚀 Processing ${chunks.length} chunks with ${PARALLEL_WORKERS} parallel workers...\n`);

let totalImported = 0;
let totalErrors = 0;
let newCodes = 0;
const startTime = Date.now();

// Process a single chunk with bulk inserts
async function processChunk(chunk, chunkIndex) {
  const conn = await pool.getConnection();
  let imported = 0;
  let errors = 0;

  try {
    // Step 1: Bulk insert all drug entries at once
    const drugValues = chunk.map(r => [
      r.scientific_name,
      r.trade_name,
      r.indication || '',
      r.icd_codes || ''
    ]);

    const placeholders = drugValues.map(() => '(?, ?, ?, ?, NOW())').join(', ');
    const flatValues = drugValues.flat();

    const [insertResult] = await conn.execute(
      `INSERT INTO drug_entries (scientific_name, trade_name, indication, icd_codes_raw, createdAt) VALUES ${placeholders}`,
      flatValues
    );

    const firstId = insertResult.insertId;
    imported = insertResult.affectedRows;

    // Step 2: Build drug_entry_codes links
    const codeLinks = [];

    for (let i = 0; i < chunk.length; i++) {
      const drugId = firstId + i;
      const record = chunk[i];
      const rawCodes = record.icd_codes || '';
      const codes = rawCodes.split(',').map(c => c.trim()).filter(c => c.length > 0);

      for (const code of codes) {
        const codeUpper = code.toUpperCase();
        let codeId = null;

        if (codeMap.has(codeUpper)) {
          codeId = codeMap.get(codeUpper);
        } else if (branchMap.has(codeUpper)) {
          codeId = branchMap.get(codeUpper);
        }
        // Skip unknown codes for speed (no new code creation in parallel mode)

        if (codeId) {
          codeLinks.push([drugId, codeId]);
        }
      }
    }

    // Step 3: Bulk insert all code links
    if (codeLinks.length > 0) {
      const linkPlaceholders = codeLinks.map(() => '(?, ?)').join(', ');
      const linkValues = codeLinks.flat();
      await conn.execute(
        `INSERT IGNORE INTO drug_entry_codes (drug_entry_id, code_id) VALUES ${linkPlaceholders}`,
        linkValues
      );
    }

  } catch (err) {
    errors++;
    console.error(`❌ Chunk ${chunkIndex} error: ${err.message.substring(0, 100)}`);
    
    // Fallback: try one by one
    for (const record of chunk) {
      try {
        const [r] = await conn.execute(
          `INSERT INTO drug_entries (scientific_name, trade_name, indication, icd_codes_raw, createdAt) VALUES (?, ?, ?, ?, NOW())`,
          [record.scientific_name, record.trade_name, record.indication || '', record.icd_codes || '']
        );
        const drugId = r.insertId;
        const codes = (record.icd_codes || '').split(',').map(c => c.trim()).filter(c => c.length > 0);
        for (const code of codes) {
          const codeId = codeMap.get(code.toUpperCase()) || branchMap.get(code.toUpperCase());
          if (codeId) {
            await conn.execute(`INSERT IGNORE INTO drug_entry_codes (drug_entry_id, code_id) VALUES (?, ?)`, [drugId, codeId]);
          }
        }
        imported++;
      } catch (e) {
        errors++;
      }
    }
  } finally {
    conn.release();
  }

  return { imported, errors };
}

// Process chunks in parallel batches
for (let i = 0; i < chunks.length; i += PARALLEL_WORKERS) {
  const batch = chunks.slice(i, i + PARALLEL_WORKERS);
  const results = await Promise.all(batch.map((chunk, j) => processChunk(chunk, i + j)));
  
  results.forEach(r => {
    totalImported += r.imported;
    totalErrors += r.errors;
  });

  const progress = Math.min((i + PARALLEL_WORKERS) * CHUNK_SIZE, missing.length);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const rate = Math.round(totalImported / ((Date.now() - startTime) / 1000));
  console.log(`⏳ ${Math.min(progress, missing.length)}/${missing.length} | Imported: ${totalImported} | Errors: ${totalErrors} | ${rate} rec/s | ${elapsed}s`);
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\n✅ Import Complete in ${elapsed}s!`);
console.log(`📊 Imported: ${totalImported}`);
console.log(`📊 Errors: ${totalErrors}`);

// Final count
const finalConn = await pool.getConnection();
const [[totalDrugs]] = await finalConn.execute(`SELECT COUNT(*) as count FROM drug_entries`);
const [[totalRefs]] = await finalConn.execute(`SELECT COUNT(*) as count FROM drug_entry_codes`);
finalConn.release();

console.log(`\n📊 Total drugs in DB now: ${totalDrugs.count}`);
console.log(`📊 Total code references: ${totalRefs.count}`);

await pool.end();
