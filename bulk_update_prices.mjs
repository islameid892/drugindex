import fs from 'fs';
import { getDb } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function bulkUpdatePrices() {
  try {
    const db = await getDb();
    const sqlFile = fs.readFileSync('/tmp/update_prices.sql', 'utf-8');
    const statements = sqlFile.split('\n').filter(line => line.trim());
    
    console.log(`Executing ${statements.length} UPDATE statements...`);
    
    let updated = 0;
    for (const statement of statements) {
      try {
        const result = await db.execute(sql.raw(statement));
        updated++;
        if (updated % 500 === 0) {
          console.log(`✓ Updated ${updated}/${statements.length} drugs...`);
        }
      } catch (e) {
        console.error(`Error executing: ${statement}`, e.message);
      }
    }
    
    console.log(`\n✅ Successfully updated ${updated} drug prices!`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

bulkUpdatePrices();
