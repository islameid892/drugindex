import { getDb } from './server/db.ts';
import { drugEntries } from './drizzle/schema.ts';
import { sql, isNull } from 'drizzle-orm';
import { createWriteStream } from 'fs';

async function extractUncodedIndications() {
  try {
    const db = await getDb();
    
    console.log('🔗 Connecting to database...');
    
    // Get all drug entries with their indications and ICD codes
    const allEntries = await db
      .select({
        id: drugEntries.id,
        indication: drugEntries.indication,
        icdCodesRaw: drugEntries.icdCodesRaw,
        scientificName: drugEntries.scientificName,
        tradeName: drugEntries.tradeName,
      })
      .from(drugEntries)
      .where(sql`${drugEntries.indication} IS NOT NULL AND ${drugEntries.indication} != ''`);

    console.log(`📊 Total drug entries: ${allEntries.length}`);

    // Filter for indications with no ICD codes (empty or only whitespace)
    const uncodedIndications = new Map();
    const uncodedDrugs = [];
    
    allEntries.forEach(entry => {
      // Check if icdCodesRaw is empty or only whitespace
      const hasNoCodes = !entry.icdCodesRaw || entry.icdCodesRaw.trim() === '';
      
      if (hasNoCodes) {
        const indication = entry.indication.trim();
        if (!uncodedIndications.has(indication)) {
          uncodedIndications.set(indication, 0);
        }
        uncodedIndications.set(indication, uncodedIndications.get(indication) + 1);
        
        uncodedDrugs.push({
          indication,
          scientificName: entry.scientificName || '',
          tradeName: entry.tradeName || '',
        });
      }
    });

    // Create CSV file
    const stream = createWriteStream('/home/ubuntu/indications_without_codes.csv');
    
    // Write header
    stream.write('indication,scientific_name,trade_name\n');
    
    // Write data sorted by indication
    uncodedDrugs
      .sort((a, b) => a.indication.localeCompare(b.indication))
      .forEach(drug => {
        const escapedIndication = (drug.indication || '').replace(/"/g, '""');
        const escapedScientific = (drug.scientificName || '').replace(/"/g, '""');
        const escapedTrade = (drug.tradeName || '').replace(/"/g, '""');
        stream.write(`"${escapedIndication}","${escapedScientific}","${escapedTrade}"\n`);
      });
    
    stream.end();
    
    console.log(`\n✅ Extracted ${uncodedIndications.size} unique indications without ICD codes`);
    console.log(`📁 File saved to: /home/ubuntu/indications_without_codes.csv`);
    console.log(`📊 Total medications without codes: ${uncodedDrugs.length}`);
    console.log(`\n📋 Top 10 indications without codes:`);
    
    const sorted = Array.from(uncodedIndications.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    sorted.forEach(([indication, count], idx) => {
      console.log(`  ${idx + 1}. ${indication} (${count} medications)`);
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

extractUncodedIndications();
