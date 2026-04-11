import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { sql } from 'drizzle-orm';
import * as schema from './drizzle/schema.ts';
import dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema });

console.log('🔍 البحث عن الصفوف المزدوجة (Case-Insensitive)...\n');

// البحث في جدول drug_entries باستخدام SQL خام
console.log('📋 جدول drug_entries:');
const drugDuplicates = await connection.execute(`
  SELECT 
    LOWER(scientific_name) as sci_lower,
    LOWER(trade_name) as trade_lower,
    LOWER(indication) as indication_lower,
    COUNT(*) as count,
    GROUP_CONCAT(id ORDER BY id) as ids,
    GROUP_CONCAT(DISTINCT scientific_name) as sci_names,
    GROUP_CONCAT(DISTINCT trade_name) as trade_names,
    GROUP_CONCAT(DISTINCT indication) as indications
  FROM drug_entries
  GROUP BY 
    LOWER(scientific_name),
    LOWER(trade_name),
    LOWER(indication)
  HAVING COUNT(*) > 1
  ORDER BY count DESC
  LIMIT 50
`);

if (drugDuplicates[0].length > 0) {
  console.log(`✅ وجدت ${drugDuplicates[0].length} مجموعة من الصفوف المزدوجة:\n`);
  drugDuplicates[0].forEach((dup, idx) => {
    console.log(`${idx + 1}. عدد الصفوف: ${dup.count}`);
    console.log(`   IDs: ${dup.ids}`);
    console.log(`   Scientific Names: ${dup.sci_names}`);
    console.log(`   Trade Names: ${dup.trade_names}`);
    console.log(`   Indications: ${dup.indications}`);
    console.log('');
  });
} else {
  console.log('❌ لم يتم العثور على صفوف مزدوجة في drug_entries\n');
}

// البحث في جدول icd_codes
console.log('\n📋 جدول icd_codes:');
const codeDuplicates = await connection.execute(`
  SELECT 
    LOWER(code) as code_lower,
    COUNT(*) as count,
    GROUP_CONCAT(id ORDER BY id) as ids,
    GROUP_CONCAT(DISTINCT code) as codes
  FROM icd_codes
  GROUP BY LOWER(code)
  HAVING COUNT(*) > 1
  ORDER BY count DESC
  LIMIT 50
`);

if (codeDuplicates[0].length > 0) {
  console.log(`✅ وجدت ${codeDuplicates[0].length} مجموعة من الصفوف المزدوجة:\n`);
  codeDuplicates[0].forEach((dup, idx) => {
    console.log(`${idx + 1}. عدد الصفوف: ${dup.count}`);
    console.log(`   IDs: ${dup.ids}`);
    console.log(`   Codes: ${dup.codes}`);
    console.log('');
  });
} else {
  console.log('❌ لم يتم العثور على صفوف مزدوجة في icd_codes\n');
}

// البحث في جدول icd_branches
console.log('\n📋 جدول icd_branches:');
const branchDuplicates = await connection.execute(`
  SELECT 
    LOWER(code) as code_lower,
    COUNT(*) as count,
    GROUP_CONCAT(id ORDER BY id) as ids,
    GROUP_CONCAT(DISTINCT code) as codes
  FROM icd_branches
  GROUP BY LOWER(code)
  HAVING COUNT(*) > 1
  ORDER BY count DESC
  LIMIT 50
`);

if (branchDuplicates[0].length > 0) {
  console.log(`✅ وجدت ${branchDuplicates[0].length} مجموعة من الصفوف المزدوجة:\n`);
  branchDuplicates[0].forEach((dup, idx) => {
    console.log(`${idx + 1}. عدد الصفوف: ${dup.count}`);
    console.log(`   IDs: ${dup.ids}`);
    console.log(`   Codes: ${dup.codes}`);
    console.log('');
  });
} else {
  console.log('❌ لم يتم العثور على صفوف مزدوجة في icd_branches\n');
}

await connection.end();
console.log('✅ انتهى البحث!');
