import express from "express";
import { getDb } from "../db";
import { drugLens } from "../../drizzle/schema";

const router = express.Router();

/**
 * POST /api/importDrugLens
 * Import drug data from Excel file (already loaded in memory)
 */
router.post("/importDrugLens", async (req, res) => {
  try {
    const { drugs } = req.body;

    if (!Array.isArray(drugs) || drugs.length === 0) {
      return res.status(400).json({ error: "No drugs data provided" });
    }

    // Insert drugs in batches
    const batchSize = 50;
    let inserted = 0;

    for (let i = 0; i < drugs.length; i += batchSize) {
      const batch = drugs.slice(i, i + batchSize);

      const insertData = batch.map((drug: any) => ({
        scientificName: drug["SCIENTIFIC NAME"] || "",
        tradeName: drug["TRADE NAME"] || "",
        price: drug["PRICE (SAR)"] || "",
        pharmacologicalAction: drug["PHARMACOLOGICAL ACTION"] || "",
        blackBoxWarning: drug["BLACK BOX WARNING"] || "",
        uses: drug["USES (Approved + Off-label)"] || "",
        pregnancyCategory: drug["PREGNANCY CATEGORY (FDA)"] || "",
        standardDose: drug["STANDARD DOSE"] || "",
        adjustedDose: drug["ADJUSTED DOSE (Renal/Hepatic)"] || "",
        neonatalDose: drug["NEONATAL DOSE (NeoFax/BNF)"] || "",
        doseSource: drug["DOSE SOURCE"] || "",
        contraindicatedInteractions: drug["CONTRAINDICATED INTERACTIONS"] || "",
        majorInteractions: drug["MAJOR INTERACTIONS"] || "",
        moderateInteractions: drug["MODERATE INTERACTIONS"] || "",
        minorInteractions: drug["MINOR INTERACTIONS"] || "",
      }));

      const db = await getDb();
      await db.insert(drugLens).values(insertData);
      inserted += batch.length;
      console.log(`✅ Inserted ${inserted}/${drugs.length} drugs`);
    }

    return res.json({
      success: true,
      message: `Successfully imported ${inserted} drugs`,
      count: inserted,
    });
  } catch (error) {
    console.error("Error importing drug lens data:", error);
    return res.status(500).json({
      error: "Failed to import drug lens data",
      details: (error as Error).message,
    });
  }
});

export default router;
