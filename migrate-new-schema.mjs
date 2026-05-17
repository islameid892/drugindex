import { createConnection } from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL environment variable not set');
  process.exit(1);
}

console.log('Connecting to database...');
const conn = await createConnection(dbUrl);

// Drop old tables that are being replaced (in correct order due to FK)
const dropOld = [
  'DROP TABLE IF EXISTS drug_entry_codes',
  'DROP TABLE IF EXISTS drug_entries',
  'DROP TABLE IF EXISTS medication_codes',
  'DROP TABLE IF EXISTS medication_indications',
  'DROP TABLE IF EXISTS medication_trade_names',
  'DROP TABLE IF EXISTS medications',
  // Also drop old tables from previous schema versions
  'DROP TABLE IF EXISTS condition_codes',
  'DROP TABLE IF EXISTS condition_medications',
  'DROP TABLE IF EXISTS conditions',
  'DROP TABLE IF EXISTS codes',
  'DROP TABLE IF EXISTS user_sessions',
];

for (const sql of dropOld) {
  try {
    await conn.execute(sql);
    console.log('✓', sql);
  } catch(e) {
    console.log('Skip:', e.message.substring(0, 80));
  }
}

// Create new drug_entries table
try {
  await conn.execute(`CREATE TABLE IF NOT EXISTS drug_entries (
    id int AUTO_INCREMENT NOT NULL,
    scientific_name varchar(500) NOT NULL,
    trade_name varchar(500) NOT NULL,
    indication varchar(500) NOT NULL,
    icd_codes_raw varchar(1000) NOT NULL DEFAULT '',
    createdAt timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT drug_entries_pk PRIMARY KEY(id),
    INDEX idx_drug_sci_name (scientific_name(191)),
    INDEX idx_drug_trade_name (trade_name(191)),
    INDEX idx_drug_indication (indication(191))
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  console.log('✓ Created drug_entries table');
} catch(e) {
  console.log('Error creating drug_entries:', e.message);
}

// Create drug_entry_codes junction table
try {
  await conn.execute(`CREATE TABLE IF NOT EXISTS drug_entry_codes (
    id int AUTO_INCREMENT NOT NULL,
    drug_entry_id int NOT NULL,
    code_id int NOT NULL,
    CONSTRAINT drug_entry_codes_pk PRIMARY KEY(id),
    INDEX idx_dec_drug_entry_id (drug_entry_id),
    INDEX idx_dec_code_id (code_id),
    CONSTRAINT fk_dec_drug_entry FOREIGN KEY (drug_entry_id) REFERENCES drug_entries(id) ON DELETE CASCADE,
    CONSTRAINT fk_dec_code FOREIGN KEY (code_id) REFERENCES icd_codes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  console.log('✓ Created drug_entry_codes table');
} catch(e) {
  console.log('Error creating drug_entry_codes:', e.message);
}

// Verify tables exist
const [tables] = await conn.execute("SHOW TABLES");
console.log('\nCurrent tables:', tables.map(t => Object.values(t)[0]).join(', '));

await conn.end();
console.log('\nMigration complete!');
