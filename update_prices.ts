import * as XLSX from 'xlsx';
import { getDb } from './server/db';
import { drugLens } from './drizzle/schema';
import { eq } from 'drizzle-orm';

async function updatePrices() {
  try {
    // Load Excel file
    const file = XLSX.readFile('/home/ubuntu/upload/APPROVALFinalv15(3).xlsx');
    const ws = file.Sheets[file.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws);
    
    const db = await getDb();
    let updated = 0;
    let notFound = 0;
    
    // Iterate through rows
    for (const row of data) {
      const scientificName = row['SCIENTIFIC NAME'];
      const tradeName = row['TRADE NAME'];
      const price = row['PRICE (SAR)'];
      
      if (!tradeName || !price) continue;
      
      // Try to find drug by trade name first
      let result = await db
        .select()
        .from(drugLens)
        .where(eq(drugLens.tradeName, tradeName as string))
        .limit(1);
      
      if (!result.length && scientificName) {
        result = await db
          .select()
          .from(drugLens)
          .where(eq(drugLens.scientificName, scientificName as string))
          .limit(1);
      }
      
      if (result.length > 0) {
        // Update price - store as number only, no "SAR" suffix
        const priceValue = typeof price === 'number' ? price.toString() : price;
        await db
          .update(drugLens)
          .set({ price: priceValue })
          .where(eq(drugLens.id, result[0].id));
        updated++;
        console.log(`✓ Updated: ${tradeName} - ${priceValue}`);
      } else {
        notFound++;
        console.log(`✗ Not found: ${tradeName}`);
      }
    }
    
    console.log(`\nSummary: ${updated} updated, ${notFound} not found`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

updatePrices();
