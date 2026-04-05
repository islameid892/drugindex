import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'localhost',
  user: 'root',
  password: '',
  database: process.env.DATABASE_URL?.split('/').pop() || 'icd10',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
});

try {
  const [rows] = await connection.execute('SELECT COUNT(*) as count FROM non_covered_codes');
  console.log('Total non-covered codes in database:', rows[0].count);
  
  // Also check first 5 codes
  const [sample] = await connection.execute('SELECT code, description FROM non_covered_codes LIMIT 5');
  console.log('\nFirst 5 non-covered codes:');
  sample.forEach(row => {
    console.log(`  ${row.code}: ${row.description}`);
  });
} finally {
  await connection.end();
}
