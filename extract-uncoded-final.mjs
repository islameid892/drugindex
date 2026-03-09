import { getDb } from './server/db.ts';
import { drugEntries } from './drizzle/schema.ts';
import { sql, inArray } from 'drizzle-orm';
import { createWriteStream } from 'fs';

async function extractUncodedIndications() {
  try {
    const db = await getDb();
    
    console.log('🔗 Connecting to database...');
    
    // Get all drug entries that have no codes in the junction table
    const allEntries = await db
      .select({
        id: drugEntries.id,
        indication: drugEntries.indication,
        scientificName: drugEntries.scientificName,
        tradeName: drugEntries.tradeName,
      })
      .from(drugEntries)
      .where(sql`${drugEntries.indication} IS NOT NULL 
        AND ${drugEntries.indication} != ''
        AND ${drugEntries.id} NOT IN (SELECT DISTINCT drug_entry_id FROM drug_entry_codes)`);

    console.log(`📊 Found ${allEntries.length} drug entries without codes`);

    // Group by indication and count
    const indicationMap = new Map();
    const drugsByIndication = new Map();
    
    allEntries.forEach(entry => {
      const indication = entry.indication.trim();
      
      if (!indicationMap.has(indication)) {
        indicationMap.set(indication, 0);
        drugsByIndication.set(indication, []);
      }
      
      indicationMap.set(indication, indicationMap.get(indication) + 1);
      drugsByIndication.get(indication).push({
        scientificName: entry.scientificName || '',
        tradeName: entry.tradeName || '',
      });
    });

    // Create CSV file
    const stream = createWriteStream('/home/ubuntu/indications_without_codes.csv');
    
    // Write header
    stream.write('indication,scientific_name,trade_name,medication_count\n');
    
    // Write data sorted by indication
    const sorted = Array.from(indicationMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));
    
    sorted.forEach(([indication, count]) => {
      const drugs = drugsByIndication.get(indication);
      
      // Write one row per drug
      drugs.forEach(drug => {
        const escapedIndication = (indication || '').replace(/"/g, '""');
        const escapedScientific = (drug.scientificName || '').replace(/"/g, '""');
        const escapedTrade = (drug.tradeName || '').replace(/"/g, '""');
        stream.write(`"${escapedIndication}","${escapedScientific}","${escapedTrade}",${count}\n`);
      });
    });
    
    stream.end();
    
    // Wait for stream to finish
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
    
    console.log(`\n✅ Extracted ${indicationMap.size} unique indications without codes`);
    console.log(`📁 File saved to: /home/ubuntu/indications_without_codes.csv`);
    console.log(`📊 Total medications without codes: ${allEntries.length}`);
    console.log(`\n📋 Top 10 indications without codes:`);
    
    sorted.slice(0, 10).forEach(([indication, count], idx) => {
      console.log(`  ${idx + 1}. ${indication} (${count} medications)`);
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

extractUncodedIndications();
