import mysql from 'mysql2/promise';
import { readFile } from 'fs/promises';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

// Load Excel file
console.log('📂 Loading Excel file...');
const workbook = XLSX.readFile('/home/ubuntu/upload/APPROVALFinalv15(1).xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

console.log(`✅ Loaded ${data.length} rows from Excel`);
console.log('📋 Columns:', Object.keys(data[0]).join(', '));

// Connect to database
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  connectionLimit: 5,
  ssl: { rejectUnauthorized: true }
});

const conn = await pool.getConnection();
console.log('✅ Connected to database');

// Check current count
const [countRows] = await conn.query('SELECT COUNT(*) as cnt FROM drug_lens');
console.log(`Current drug_lens count: ${countRows[0].cnt}`);

if (countRows[0].cnt > 0) {
  console.log('⚠️  Table already has data. Clearing it first...');
  await conn.query('DELETE FROM drug_lens');
  console.log('✅ Cleared existing data');
}

// Prepare insert statement
const insertSQL = `INSERT INTO drug_lens (
  scientific_name, trade_name, price, pharmacological_action,
  black_box_warning, uses, pregnancy_category, standard_dose,
  adjusted_dose, neonatal_dose, dose_source,
  contraindicated_interactions, major_interactions,
  moderate_interactions, minor_interactions
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

// Insert in batches
const BATCH_SIZE = 50;
let inserted = 0;
let errors = 0;

for (let i = 0; i < data.length; i += BATCH_SIZE) {
  const batch = data.slice(i, i + BATCH_SIZE);
  
  for (const row of batch) {
    try {
      await conn.execute(insertSQL, [
        String(row['SCIENTIFIC NAME'] || '').substring(0, 500),
        String(row['TRADE NAME'] || '').substring(0, 500),
        String(row['PRICE (SAR)'] || '').substring(0, 100),
        String(row['PHARMACOLOGICAL ACTION'] || ''),
        String(row['BLACK BOX WARNING'] || ''),
        String(row['USES (Approved + Off-label)'] || ''),
        String(row['PREGNANCY CATEGORY (FDA)'] || '').substring(0, 50),
        String(row['STANDARD DOSE'] || ''),
        String(row['ADJUSTED DOSE (Renal/Hepatic)'] || ''),
        String(row['NEONATAL DOSE (NeoFax/BNF)'] || ''),
        String(row['DOSE SOURCE'] || ''),
        String(row['CONTRAINDICATED INTERACTIONS'] || ''),
        String(row['MAJOR INTERACTIONS'] || ''),
        String(row['MODERATE INTERACTIONS'] || ''),
        String(row['MINOR INTERACTIONS'] || ''),
      ]);
      inserted++;
    } catch (e) {
      errors++;
      if (errors <= 5) console.error(`❌ Error on row ${i}: ${e.message.substring(0, 100)}`);
    }
  }
  
  if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= data.length) {
    console.log(`✅ Progress: ${Math.min(inserted, data.length)}/${data.length} rows inserted...`);
  }
}

conn.release();
await pool.end();

console.log(`\n🎉 Import complete!`);
console.log(`✅ Successfully inserted: ${inserted} drugs`);
console.log(`❌ Errors: ${errors}`);
