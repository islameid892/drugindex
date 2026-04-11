import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'icd10db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

console.log('🔍 البحث عن الصفوف المزدوجة (Case-Insensitive)...\n');

try {
  // البحث في جدول drug_entries
  console.log('📋 جدول drug_entries:');
  const [drugDuplicates] = await connection.execute(`
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

  if (drugDuplicates.length > 0) {
    console.log(`✅ وجدت ${drugDuplicates.length} مجموعة من الصفوف المزدوجة:\n`);
    drugDuplicates.forEach((dup, idx) => {
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
  const [codeDuplicates] = await connection.execute(`
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

  if (codeDuplicates.length > 0) {
    console.log(`✅ وجدت ${codeDuplicates.length} مجموعة من الصفوف المزدوجة:\n`);
    codeDuplicates.forEach((dup, idx) => {
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
  const [branchDuplicates] = await connection.execute(`
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

  if (branchDuplicates.length > 0) {
    console.log(`✅ وجدت ${branchDuplicates.length} مجموعة من الصفوف المزدوجة:\n`);
    branchDuplicates.forEach((dup, idx) => {
      console.log(`${idx + 1}. عدد الصفوف: ${dup.count}`);
      console.log(`   IDs: ${dup.ids}`);
      console.log(`   Codes: ${dup.codes}`);
      console.log('');
    });
  } else {
    console.log('❌ لم يتم العثور على صفوف مزدوجة في icd_branches\n');
  }

} catch (error) {
  console.error('❌ خطأ:', error.message);
}

await connection.end();
console.log('✅ انتهى البحث!');
