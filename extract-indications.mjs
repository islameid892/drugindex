import { getDb } from './server/db.ts';
import { drugEntries } from './drizzle/schema.ts';
import { sql } from 'drizzle-orm';
import { createWriteStream } from 'fs';

async function extractIndications() {
  try {
    const db = await getDb();
    
    // Get all indications that have no ICD codes
    const results = await db
      .selectDistinct({ indication: drugEntries.indication })
      .from(drugEntries)
      .where(
        sql`(${drugEntries.icdCodesRaw} = '' OR ${drugEntries.icdCodesRaw} IS NULL) 
            AND ${drugEntries.indication} IS NOT NULL 
            AND ${drugEntries.indication} != ''`
      )
      .orderBy(drugEntries.indication);

    // Create CSV file
    const stream = createWriteStream('/home/ubuntu/indications_without_codes.csv');
    
    // Write header
    stream.write('indication\n');
    
    // Write data
    results.forEach(row => {
      stream.write(`"${row.indication.replace(/"/g, '""')}"\n`);
    });
    
    stream.end();
    
    console.log(`✅ Extracted ${results.length} indications without ICD codes`);
    console.log(`📁 File saved to: /home/ubuntu/indications_without_codes.csv`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

extractIndications();
