import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'icd10_search',
};

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
        const data = fs.readFileSync(fullPath, 'utf-8');
        return JSON.parse(data);
      }
    }
    
    console.error(`Error loading ${filePath}: File not found in any expected location`);
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
    console.log('🔄 Starting data migration...');
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Load JSON data
    console.log('📂 Loading JSON files...');
    const medicationsData = loadJsonFile('main_data.json');
    const treeData = loadJsonFile('tree_data.json');
    const nonCoveredData = loadJsonFile('non_covered_codes_full.json');

    if (!medicationsData || !treeData) {
      throw new Error('Failed to load required JSON files');
    }

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await connection.execute('DELETE FROM non_covered_codes');
    await connection.execute('DELETE FROM codes');
    await connection.execute('DELETE FROM conditions');
    await connection.execute('DELETE FROM medications');

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
    console.log(`✅ Migrated ${medicationCount} medications`);

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
        console.warn(`  ⚠️  Failed to migrate condition:`, error.message);
      }
    }
    console.log(`✅ Migrated ${conditionCount} conditions`);

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
        console.warn(`  ⚠️  Failed to migrate code:`, error.message);
      }
    }
    console.log(`✅ Migrated ${codeCount} codes`);

    // Migrate non-covered codes
    if (nonCoveredData && Array.isArray(nonCoveredData)) {
      console.log(`📝 Migrating ${nonCoveredData.length} non-covered codes...`);
      let nonCoveredCount = 0;
      for (const code of nonCoveredData) {
        try {
          const branches = Array.isArray(code.branches) ? JSON.stringify(code.branches) : '[]';
          
          await connection.execute(
            'INSERT INTO non_covered_codes (code, name, branches) VALUES (?, ?, ?)',
            [
              code.code || '',
              code.name || '',
              branches
            ]
          );
          nonCoveredCount++;
        } catch (error) {
          console.warn(`  ⚠️  Failed to migrate non-covered code:`, error.message);
        }
      }
      console.log(`✅ Migrated ${nonCoveredCount} non-covered codes`);
    }

    console.log('\n✅ Migration completed successfully!');
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
