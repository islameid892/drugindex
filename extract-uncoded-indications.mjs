import { getDb } from './server/db.ts';
import { drugEntries } from './drizzle/schema.ts';
import { sql } from 'drizzle-orm';
import { createWriteStream } from 'fs';

async function extractUncodedIndications() {
  try {
    const db = await getDb();
    
    // Get all drug entries with their indications and ICD codes
    const allEntries = await db
      .select({
        id: drugEntries.id,
        indication: drugEntries.indication,
        icdCodesRaw: drugEntries.icdCodesRaw,
      })
      .from(drugEntries)
      .where(sql`${drugEntries.indication} IS NOT NULL AND ${drugEntries.indication} != ''`);

    // Filter for indications with no ICD codes (empty or no codes)
    const uncodedIndications = new Map();
    
    allEntries.forEach(entry => {
      // Check if icdCodesRaw is empty or only whitespace
      const hasNoCodes = !entry.icdCodesRaw || entry.icdCodesRaw.trim() === '';
      
      if (hasNoCodes) {
        const indication = entry.indication.trim();
        if (!uncodedIndications.has(indication)) {
          uncodedIndications.set(indication, 0);
        }
        uncodedIndications.set(indication, uncodedIndications.get(indication) + 1);
      }
    });

    // Create CSV file
    const stream = createWriteStream('/home/ubuntu/indications_without_codes.csv');
    
    // Write header
    stream.write('indication,medication_count\n');
    
    // Write data sorted by count descending
    const sorted = Array.from(uncodedIndications.entries())
      .sort((a, b) => b[1] - a[1]);
    
    sorted.forEach(([indication, count]) => {
      // Escape quotes in indication
      const escaped = indication.replace(/"/g, '""');
      stream.write(`"${escaped}",${count}\n`);
    });
    
    stream.end();
    
    console.log(`✅ Extracted ${sorted.length} indications without ICD codes`);
    console.log(`📁 File saved to: /home/ubuntu/indications_without_codes.csv`);
    console.log(`\n📊 Top 10 indications without codes:`);
    sorted.slice(0, 10).forEach(([indication, count], idx) => {
      console.log(`  ${idx + 1}. ${indication} (${count} medications)`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

extractUncodedIndications();
