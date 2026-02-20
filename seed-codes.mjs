import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BATCH_SIZE = 500;

async function seedCodes() {
  try {
    // Read tree_data.json
    const treeDataPath = path.join(__dirname, 'client/public/data/tree_data.json');
    const treeData = JSON.parse(fs.readFileSync(treeDataPath, 'utf8'));
    
    // Read non_covered_codes_full.json
    const nonCoveredPath = path.join(__dirname, 'client/public/data/non_covered_codes_full.json');
    const nonCoveredData = JSON.parse(fs.readFileSync(nonCoveredPath, 'utf8'));
    
    // Connect to database
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    
    console.log('Starting to seed codes...');
    
    // Clear existing codes
    await connection.execute('DELETE FROM codes');
    await connection.execute('DELETE FROM nonCoveredCodes');
    
    console.log('Cleared existing codes');
    
    // Insert codes in batches
    let insertedCount = 0;
    for (let i = 0; i < treeData.length; i += BATCH_SIZE) {
      const batch = treeData.slice(i, i + BATCH_SIZE);
      const values = batch.map(code => [
        code.code,
        code.description || '',
        JSON.stringify(code.branches || []),
        '[]'
      ]);
      
      const placeholders = batch.map(() => '(?, ?, ?, ?)').join(',');
      const flatValues = values.flat();
      
      try {
        await connection.execute(
          `INSERT INTO codes (code, description, branches, relatedMedications) VALUES ${placeholders}`,
          flatValues
        );
        insertedCount += batch.length;
        console.log(`Inserted ${insertedCount}/${treeData.length} codes...`);
      } catch (error) {
        console.error(`Error inserting batch at ${i}:`, error.message);
      }
    }
    
    console.log(`Total codes inserted: ${insertedCount}`);
    
    // Insert non-covered codes in batches
    let nonCoveredCount = 0;
    for (let i = 0; i < nonCoveredData.length; i += BATCH_SIZE) {
      const batch = nonCoveredData.slice(i, i + BATCH_SIZE);
      const values = batch.map(code => [
        code.code,
        code.description || '',
        JSON.stringify(code.branches || []),
        '[]'
      ]);
      
      const placeholders = batch.map(() => '(?, ?, ?, ?)').join(',');
      const flatValues = values.flat();
      
      try {
        await connection.execute(
          `INSERT INTO nonCoveredCodes (code, description, branches, relatedMedications) VALUES ${placeholders}`,
          flatValues
        );
        nonCoveredCount += batch.length;
        console.log(`Inserted ${nonCoveredCount}/${nonCoveredData.length} non-covered codes...`);
      } catch (error) {
        console.error(`Error inserting non-covered batch at ${i}:`, error.message);
      }
    }
    
    // Verify
    const [codesCount] = await connection.execute('SELECT COUNT(*) as count FROM codes');
    const [nonCoveredCount2] = await connection.execute('SELECT COUNT(*) as count FROM nonCoveredCodes');
    
    console.log(`\nFinal counts:`);
    console.log(`  Codes: ${codesCount[0].count}`);
    console.log(`  Non-covered codes: ${nonCoveredCount2[0].count}`);
    
    await connection.end();
    console.log('\nSeeding completed successfully!');
  } catch (error) {
    console.error('Error seeding codes:', error);
    process.exit(1);
  }
}

seedCodes();
