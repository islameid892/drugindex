import openpyxl from 'openpyxl';
import { getDb } from './server/db.ts';
import { drugLens } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

async function updatePrices() {
  try {
    // Load Excel file
    const wb = openpyxl.load_workbook('/home/ubuntu/upload/APPROVALFinalv15(3).xlsx');
    const ws = wb.active;
    
    const db = await getDb();
    let updated = 0;
    let notFound = 0;
    
    // Iterate through rows (skip header)
    for (let rowNum = 2; rowNum <= ws.max_row; rowNum++) {
      const scientificName = ws.cell(rowNum, 1).value;
      const tradeName = ws.cell(rowNum, 2).value;
      const price = ws.cell(rowNum, 3).value;
      
      if (!tradeName || !price) continue;
      
      // Try to find drug by trade name first, then scientific name
      let result = await db
        .select()
        .from(drugLens)
        .where(eq(drugLens.tradeName, tradeName))
        .limit(1);
      
      if (!result.length && scientificName) {
        result = await db
          .select()
          .from(drugLens)
          .where(eq(drugLens.scientificName, scientificName))
          .limit(1);
      }
      
      if (result.length > 0) {
        // Update price
        await db
          .update(drugLens)
          .set({ price: `${price} SAR` })
          .where(eq(drugLens.id, result[0].id));
        updated++;
        console.log(`✓ Updated: ${tradeName} - ${price} SAR`);
      } else {
        notFound++;
        console.log(`✗ Not found: ${tradeName}`);
      }
    }
    
    console.log(`\nSummary: ${updated} updated, ${notFound} not found`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

updatePrices();
