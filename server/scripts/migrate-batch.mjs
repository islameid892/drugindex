import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse DATABASE_URL
function parseConnectionString(connectionString) {
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  try {
    const url = new URL(connectionString);
    
    let ssl = false;
    if (url.searchParams.has('ssl')) {
      try {
        ssl = JSON.parse(url.searchParams.get('ssl'));
      } catch {
        ssl = url.searchParams.get('ssl') === 'true';
      }
    }

    return {
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      ssl: ssl || { rejectUnauthorized: true },
    };
  } catch (error) {
    console.error('Failed to parse DATABASE_URL:', error.message);
    throw error;
  }
}

// Load JSON files
function loadJsonFile(filePath) {
  try {
    const possiblePaths = [
      path.join(__dirname, '../../client/public/data', filePath),
      path.join(__dirname, '../../public/data', filePath),
    ];
    
    for (const fullPath of possiblePaths) {
      if (fs.existsSync(fullPath)) {
        console.log(`  ✓ Found ${filePath}`);
        const data = fs.readFileSync(fullPath, 'utf-8');
        return JSON.parse(data);
      }
    }
    
    console.error(`Error loading ${filePath}: File not found`);
    return null;
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
    return null;
  }
}

// Batch insert function
async function batchInsert(connection, table, columns, values, batchSize = 500) {
  let inserted = 0;
  
  for (let i = 0; i < values.length; i += batchSize) {
    const batch = values.slice(i, i + batchSize);
    
    if (batch.length === 0) continue;
    
    const placeholders = batch.map(() => `(${columns.map(() => '?').join(',')})`).join(',');
    const flatValues = batch.flat();
    
    try {
      await connection.execute(
        `INSERT INTO ${table} (${columns.join(',')}) VALUES ${placeholders}`,
        flatValues
      );
      inserted += batch.length;
      
      if (inserted % 5000 === 0) {
        console.log(`  ✓ ${inserted} records inserted...`);
      }
    } catch (error) {
      console.warn(`  ⚠️  Batch insert error:`, error.message);
    }
  }
  
  return inserted;
}

// Main migration
async function migrate() {
  let connection;
  
  try {
    console.log('🔄 Starting optimized data migration...\n');
    
    // Parse connection
    console.log('📋 Parsing database connection...');
    const dbConfig = parseConnectionString(process.env.DATABASE_URL);
    console.log(`✅ Connecting to: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}\n`);

    // Connect
    console.log('🔗 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected\n');

    // Load data
    console.log('📂 Loading JSON files...');
    const medicationsData = loadJsonFile('main_data.json');
    const treeData = loadJsonFile('tree_data.json');
    const nonCoveredData = loadJsonFile('non_covered_codes_full.json');

    if (!medicationsData || !treeData) {
      throw new Error('Failed to load required JSON files');
    }
    console.log('✅ All files loaded\n');

    // Clear tables
    console.log('🗑️  Clearing existing data...');
    await connection.execute('DELETE FROM nonCoveredCodes');
    await connection.execute('DELETE FROM codes');
    await connection.execute('DELETE FROM conditions');
    await connection.execute('DELETE FROM medications');
    console.log('✅ Database cleared\n');

    // Migrate medications using batch insert
    console.log(`📝 Migrating ${medicationsData.length} medications...`);
    const medValues = medicationsData.map(med => [
      med.scientificName || '',
      Array.isArray(med.tradeNames) ? JSON.stringify(med.tradeNames) : '[]',
      med.indication || '',
      Array.isArray(med.icdCodes) ? JSON.stringify(med.icdCodes) : '[]',
      med.coverageStatus || 'COVERED'
    ]);
    
    const medInserted = await batchInsert(
      connection,
      'medications',
      ['scientificName', 'tradeNames', 'indication', 'icdCodes', 'coverageStatus'],
      medValues,
      500
    );
    console.log(`✅ Migrated ${medInserted} medications\n`);

    // Migrate conditions
    console.log('📝 Migrating conditions...');
    const uniqueConditions = [...new Set(medicationsData.map(m => m.indication).filter(Boolean))];
    const condValues = uniqueConditions.map(cond => [cond, '', '[]', '[]']);
    
    const condInserted = await batchInsert(
      connection,
      'conditions',
      ['name', 'description', 'relatedMedications', 'relatedCodes'],
      condValues,
      500
    );
    console.log(`✅ Migrated ${condInserted} conditions\n`);

    // Migrate codes
    console.log(`📝 Migrating ${treeData.length} codes...`);
    const codeValues = treeData.map(code => [
      code.code || '',
      code.name || '',
      Array.isArray(code.branches) ? JSON.stringify(code.branches) : '[]',
      '[]'
    ]);
    
    const codeInserted = await batchInsert(
      connection,
      'codes',
      ['code', 'description', 'branches', 'relatedMedications'],
      codeValues,
      500
    );
    console.log(`✅ Migrated ${codeInserted} codes\n`);

    // Migrate non-covered codes
    if (nonCoveredData && Array.isArray(nonCoveredData)) {
      console.log(`📝 Migrating ${nonCoveredData.length} non-covered codes...`);
      const ncValues = nonCoveredData.map(code => [
        code.code || '',
        code.name || '',
        Array.isArray(code.branches) ? JSON.stringify(code.branches) : '[]',
        '[]'
      ]);
      
      const ncInserted = await batchInsert(
        connection,
        'nonCoveredCodes',
        ['code', 'description', 'branches', 'relatedMedications'],
        ncValues,
        500
      );
      console.log(`✅ Migrated ${ncInserted} non-covered codes\n`);
    }

    console.log('✅ Migration completed successfully!\n');
    console.log(`Summary:
  - Medications: ${medInserted}
  - Conditions: ${condInserted}
  - Codes: ${codeInserted}
  - Non-Covered Codes: ${nonCoveredData ? nonCoveredData.length : 0}`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrate();
