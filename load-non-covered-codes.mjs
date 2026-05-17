import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BATCH_SIZE = 500;

async function loadNonCoveredCodes() {
  try {
    // Read non_covered_codes.json
    const nonCoveredPath = path.join(__dirname, 'client/public/data/non_covered_codes.json');
    const nonCoveredCodes = JSON.parse(fs.readFileSync(nonCoveredPath, 'utf8'));
    
    console.log(`Found ${nonCoveredCodes.length} non-covered codes`);
    
    // Connect to database
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    
    // Clear existing non-covered codes
    await connection.execute('DELETE FROM non_covered_codes');
    console.log('Cleared existing non-covered codes');
    
    // Insert non-covered codes in batches
    let insertedCount = 0;
    for (let i = 0; i < nonCoveredCodes.length; i += BATCH_SIZE) {
      const batch = nonCoveredCodes.slice(i, i + BATCH_SIZE);
      const values = batch.map(code => [
        code,
        `Non-covered code: ${code}` // Default description
      ]);
      
      const placeholders = batch.map(() => '(?, ?)').join(',');
      const flatValues = values.flat();
      
      try {
        await connection.execute(
          `INSERT INTO non_covered_codes (code, description) VALUES ${placeholders}`,
          flatValues
        );
        insertedCount += batch.length;
        console.log(`Inserted ${insertedCount}/${nonCoveredCodes.length} non-covered codes...`);
      } catch (error) {
        console.error(`Error inserting batch at ${i}:`, error.message);
      }
    }
    
    // Verify
    const [result] = await connection.execute('SELECT COUNT(*) as count FROM non_covered_codes');
    console.log(`\nFinal count: ${result[0].count} non-covered codes inserted`);
    
    await connection.end();
    console.log('Loading completed successfully!');
  } catch (error) {
    console.error('Error loading non-covered codes:', error);
    process.exit(1);
  }
}

loadNonCoveredCodes();
