import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { parse as parseUrl } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse DATABASE_URL
function parseConnectionString(connectionString) {
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  try {
    const url = new URL(connectionString);
    
    // Extract SSL config if present
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
      database: url.pathname.slice(1), // Remove leading /
      ssl: ssl || { rejectUnauthorized: true },
    };
  } catch (error) {
    console.error('Failed to parse DATABASE_URL:', error.message);
    throw error;
  }
}

// Helper function to load JSON files
function loadJsonFile(filePath) {
  try {
    // Try multiple possible paths
    const possiblePaths = [
      path.join(__dirname, '../../client/public/data', filePath),
      path.join(__dirname, '../../public/data', filePath),
      path.join(__dirname, '../../../public/data', filePath),
    ];
    
    for (const fullPath of possiblePaths) {
      if (fs.existsSync(fullPath)) {
        console.log(`  ✓ Found ${filePath} at ${fullPath}`);
        const data = fs.readFileSync(fullPath, 'utf-8');
        return JSON.parse(data);
      }
    }
    
    console.error(`Error loading ${filePath}: File not found in any expected location`);
    console.error('Searched paths:');
    possiblePaths.forEach(p => console.error(`  - ${p}`));
    return null;
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
    return null;
  }
}

// Main migration function
async function migrate() {
  let connection;
  
  try {
    console.log('🔄 Starting data migration...\n');
    
    // Parse connection string
    console.log('📋 Parsing database connection...');
    const dbConfig = parseConnectionString(process.env.DATABASE_URL);
    console.log(`✅ Connected to: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}\n`);

    // Connect to database
    console.log('🔗 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database\n');

    // Load JSON data
    console.log('📂 Loading JSON files...');
    const medicationsData = loadJsonFile('main_data.json');
    const treeData = loadJsonFile('tree_data.json');
    const nonCoveredData = loadJsonFile('non_covered_codes_full.json');

    if (!medicationsData || !treeData) {
      throw new Error('Failed to load required JSON files');
    }
    console.log('✅ All JSON files loaded\n');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await connection.execute('DELETE FROM nonCoveredCodes');
    await connection.execute('DELETE FROM codes');
    await connection.execute('DELETE FROM conditions');
    await connection.execute('DELETE FROM medications');
    console.log('✅ Database cleared\n');

    // Migrate medications
    console.log(`📝 Migrating ${medicationsData.length} medications...`);
    let medicationCount = 0;
    for (const med of medicationsData) {
      try {
        const tradeNames = Array.isArray(med.tradeNames) ? JSON.stringify(med.tradeNames) : '[]';
        const icdCodes = Array.isArray(med.icdCodes) ? JSON.stringify(med.icdCodes) : '[]';
        
        await connection.execute(
          'INSERT INTO medications (scientificName, tradeNames, indication, icdCodes, coverageStatus) VALUES (?, ?, ?, ?, ?)',
          [
            med.scientificName || '',
            tradeNames,
            med.indication || '',
            icdCodes,
            med.coverageStatus || 'covered'
          ]
        );
        medicationCount++;
        
        if (medicationCount % 5000 === 0) {
          console.log(`  ✓ ${medicationCount} medications migrated...`);
        }
      } catch (error) {
        console.warn(`  ⚠️  Failed to migrate medication:`, error.message);
      }
    }
    console.log(`✅ Migrated ${medicationCount} medications\n`);

    // Migrate conditions (unique indications from medications)
    console.log('📝 Migrating conditions...');
    const uniqueConditions = new Set(medicationsData.map(m => m.indication).filter(Boolean));
    let conditionCount = 0;
    for (const condition of uniqueConditions) {
      try {
        await connection.execute(
          'INSERT INTO conditions (name) VALUES (?)',
          [condition]
        );
        conditionCount++;
      } catch (error) {
        if (!error.message.includes('Duplicate entry')) {
          console.warn(`  ⚠️  Failed to migrate condition:`, error.message);
        }
      }
    }
    console.log(`✅ Migrated ${conditionCount} conditions\n`);

    // Migrate codes
    console.log(`📝 Migrating ${treeData.length} codes...`);
    let codeCount = 0;
    for (const code of treeData) {
      try {
        const branches = Array.isArray(code.branches) ? JSON.stringify(code.branches) : '[]';
        
        await connection.execute(
          'INSERT INTO codes (code, name, branches) VALUES (?, ?, ?)',
          [
            code.code || '',
            code.name || '',
            branches
          ]
        );
        codeCount++;
        
        if (codeCount % 5000 === 0) {
          console.log(`  ✓ ${codeCount} codes migrated...`);
        }
      } catch (error) {
        if (!error.message.includes('Duplicate entry')) {
          console.warn(`  ⚠️  Failed to migrate code:`, error.message);
        }
      }
    }
    console.log(`✅ Migrated ${codeCount} codes\n`);

    // Migrate non-covered codes
    if (nonCoveredData && Array.isArray(nonCoveredData)) {
      console.log(`📝 Migrating ${nonCoveredData.length} non-covered codes...`);
      let nonCoveredCount = 0;
      for (const code of nonCoveredData) {
        try {
          const branches = Array.isArray(code.branches) ? JSON.stringify(code.branches) : '[]';
          
        await connection.execute(
          'INSERT INTO nonCoveredCodes (code, description, branches, relatedMedications) VALUES (?, ?, ?, ?)',
            [
              code.code || '',
              code.name || '',
              branches
            ]
          );
          nonCoveredCount++;
        } catch (error) {
          if (!error.message.includes('Duplicate entry')) {
            console.warn(`  ⚠️  Failed to migrate non-covered code:`, error.message);
          }
        }
      }
      console.log(`✅ Migrated ${nonCoveredCount} non-covered codes\n`);
    }

    console.log('✅ Migration completed successfully!\n');
    console.log(`Summary:
  - Medications: ${medicationCount}
  - Conditions: ${conditionCount}
  - Codes: ${codeCount}
  - Non-Covered Codes: ${nonCoveredData ? nonCoveredData.length : 0}`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run migration
migrate();
