import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

const parseDbUrl = () => {
  const url = process.env.DATABASE_URL || '';
  const baseUrl = url.split('?')[0];
  const match = baseUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) { console.error('❌ Invalid DATABASE_URL'); process.exit(1); }
  return { user: match[1], password: match[2], host: match[3], port: parseInt(match[4]), database: match[5] };
};

const connection = await mysql.createConnection({
  ...parseDbUrl(),
  ssl: { rejectUnauthorized: false },
});

// Load missing records
const missing = JSON.parse(readFileSync('/home/ubuntu/missing_drugs.json', 'utf-8'));
console.log(`📊 Total missing records to import: ${missing.length}\n`);

// Get all existing ICD codes (main codes only - drug_entry_codes.code_id references icd_codes.id)
const [existingCodes] = await connection.execute(`SELECT id, code FROM icd_codes`);
const codeMap = new Map(existingCodes.map(r => [r.code.trim().toUpperCase(), r.id]));
console.log(`📊 Existing ICD main codes in DB: ${codeMap.size}`);

// Get all existing ICD branches (for lookup - to find parent code)
const [existingBranches] = await connection.execute(`SELECT id, branch_code, parent_code_id FROM icd_branches`);
const branchMap = new Map(existingBranches.map(r => [r.branch_code.trim().toUpperCase(), { id: r.id, parentCodeId: r.parent_code_id }]));
console.log(`📊 Existing ICD branches in DB: ${branchMap.size}\n`);

let imported = 0;
let newCodes = 0;
let errors = 0;

const BATCH_SIZE = 100;
const startTime = Date.now();

for (let i = 0; i < missing.length; i += BATCH_SIZE) {
  const batch = missing.slice(i, i + BATCH_SIZE);
  
  for (const record of batch) {
    try {
      // Insert drug entry
      const [result] = await connection.execute(
        `INSERT INTO drug_entries (scientific_name, trade_name, indication, icd_codes_raw, createdAt) VALUES (?, ?, ?, ?, NOW())`,
        [record.scientific_name, record.trade_name, record.indication || '', record.icd_codes || '']
      );
      const drugId = result.insertId;
      
      // Parse ICD codes (may be comma-separated)
      const rawCodes = record.icd_codes || '';
      const codes = rawCodes.split(',').map(c => c.trim()).filter(c => c.length > 0);
      
      for (const code of codes) {
        const codeUpper = code.toUpperCase();
        let codeId = null;
        
        if (codeMap.has(codeUpper)) {
          // It's a main code
          codeId = codeMap.get(codeUpper);
        } else if (branchMap.has(codeUpper)) {
          // It's a branch code - use the parent code id
          codeId = branchMap.get(codeUpper).parentCodeId;
        } else {
          // Create new ICD main code
          try {
            const [newCode] = await connection.execute(
              `INSERT INTO icd_codes (code, description, branch_count, createdAt, updatedAt) VALUES (?, ?, 0, NOW(), NOW()) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
              [code, `Code ${code}`]
            );
            codeId = newCode.insertId;
            codeMap.set(codeUpper, codeId);
            newCodes++;
          } catch (e) {
            // Code might already exist (race condition), try to get it
            const [existing] = await connection.execute(`SELECT id FROM icd_codes WHERE code = ?`, [code]);
            if (existing.length > 0) {
              codeId = existing[0].id;
              codeMap.set(codeUpper, codeId);
            }
          }
        }
        
        // Insert drug_entry_codes link
        if (codeId) {
          await connection.execute(
            `INSERT IGNORE INTO drug_entry_codes (drug_entry_id, code_id) VALUES (?, ?)`,
            [drugId, codeId]
          );
        }
      }
      
      imported++;
    } catch (err) {
      errors++;
      if (errors <= 5) console.error(`❌ Error: ${err.message} | Record: ${record.scientific_name}`);
    }
  }
  
  // Progress update every 1000 records
  if ((i + BATCH_SIZE) % 1000 === 0 || i + BATCH_SIZE >= missing.length) {
    const progress = Math.min(i + BATCH_SIZE, missing.length);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`⏳ Progress: ${progress}/${missing.length} (${Math.round(progress/missing.length*100)}%) | Imported: ${imported} | Errors: ${errors} | Time: ${elapsed}s`);
  }
}

console.log(`\n✅ Import Complete!`);
console.log(`📊 Imported: ${imported}`);
console.log(`📊 New ICD codes created: ${newCodes}`);
console.log(`📊 Errors: ${errors}`);

// Final count
const [totalDrugs] = await connection.execute(`SELECT COUNT(*) as count FROM drug_entries`);
const [totalRefs] = await connection.execute(`SELECT COUNT(*) as count FROM drug_entry_codes`);
const [totalCodes] = await connection.execute(`SELECT COUNT(*) as count FROM icd_codes`);
console.log(`\n📊 Total drugs in DB now: ${totalDrugs[0].count}`);
console.log(`📊 Total code references: ${totalRefs[0].count}`);
console.log(`📊 Total ICD codes: ${totalCodes[0].count}`);

await connection.end();
