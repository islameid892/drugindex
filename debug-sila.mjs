import mysql from 'mysql2/promise';
import 'dotenv/config';

const pool = mysql.createPool({ uri: process.env.DATABASE_URL, connectionLimit: 1 });
const conn = await pool.getConnection();

// Test Arabic query keyword extraction
const query = 'ما هو كود ICD-10 للسكري';
const rawWords = query
  .replace(/[\u061f?!،,\.]/g, ' ')
  .split(/\s+/)
  .filter(w => w.length >= 2);

console.log('Keywords from Arabic query:', rawWords);

// The database stores data in English (UPPERCASE), so Arabic won't match
// We need to detect if query is Arabic and map to English terms
const isArabic = /[\u0600-\u06FF]/.test(query);
console.log('Is Arabic query:', isArabic);

// Test English search for diabetes
const [diabetesRows] = await conn.execute(
  "SELECT code, description FROM icd_codes WHERE description LIKE '%diabetes%' LIMIT 3"
);
console.log('Diabetes ICD codes:', diabetesRows);

// Test drug search
const [drugRows] = await conn.execute(
  "SELECT trade_name, scientific_name, indication FROM drug_entries WHERE indication LIKE '%DIABET%' LIMIT 3"
);
console.log('Diabetes drugs:', drugRows);

conn.release();
await pool.end();
console.log('Done!');
