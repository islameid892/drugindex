/**
 * Periodic sync job to keep static JSON files in sync with database
 * Runs every 30 minutes or when database is modified
 */

import { getAllCodes, getAllMedications } from "../db";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "client", "public", "data");

export async function syncAllDataFiles() {
  try {
    console.log("[Sync Job] Starting data synchronization...");

    // Sync codes
    const codes = await getAllCodes();
    if (codes.length > 0) {
      // tree_data.json
      const treeData = codes.map((code: any) => {
        // Parse branches from JSON string
        let branches = [];
        try {
          if (typeof code.branches === 'string') {
            branches = JSON.parse(code.branches);
          } else if (Array.isArray(code.branches)) {
            branches = code.branches;
          }
        } catch (e) {
          branches = [];
        }
        return {
          code: code.code,
          description: code.description,
          branches: branches,
          relatedMedications: code.relatedMedications || [],
        };
      });
      fs.writeFileSync(
        path.join(DATA_DIR, "tree_data.json"),
        JSON.stringify(treeData, null, 0)
      );

      // code_map.json
      const codeMap: Record<
        string,
        { description: string; branch_count: number; branches: any[] }
      > = {};
      for (const code of codes) {
        // Parse branches from JSON string
        let branches = [];
        try {
          if (typeof code.branches === 'string') {
            branches = JSON.parse(code.branches);
          } else if (Array.isArray(code.branches)) {
            branches = code.branches;
          }
        } catch (e) {
          branches = [];
        }
        codeMap[code.code] = {
          description: code.description,
          branch_count: branches.length,
          branches: branches,
        };
      }
      fs.writeFileSync(
        path.join(DATA_DIR, "code_map.json"),
        JSON.stringify(codeMap, null, 0)
      );

      // summary_data.json
      const summaryData = codes.map((code: any) => {
        // Parse branches from JSON string
        let branches = [];
        try {
          if (typeof code.branches === 'string') {
            branches = JSON.parse(code.branches);
          } else if (Array.isArray(code.branches)) {
            branches = code.branches;
          }
        } catch (e) {
          branches = [];
        }
        return {
          code: code.code,
          description: code.description,
          branch_count: branches.length,
        };
      });
      fs.writeFileSync(
        path.join(DATA_DIR, "summary_data.json"),
        JSON.stringify(summaryData, null, 0)
      );

      console.log(`[Sync Job] ✓ Synced ${codes.length} codes`);
    }

    // Sync medications
    const medications = await getAllMedications();
    if (medications.length > 0) {
      const mainData = medications.map((med: any) => {
        const tradeNames = Array.isArray(med.tradeNames) ? med.tradeNames : [];
        const icdCodes = Array.isArray(med.icdCodes) ? med.icdCodes : [];
        return {
          id: med.id,
          scientificName: med.scientificName,
          tradeNames: tradeNames,
          indication: med.indication,
          icdCodes: icdCodes,
        };
      });
      fs.writeFileSync(
        path.join(DATA_DIR, "main_data.json"),
        JSON.stringify(mainData, null, 0)
      );
      console.log(`[Sync Job] ✓ Synced ${medications.length} medications`);
    }

    console.log("[Sync Job] Data synchronization completed successfully");
    return { success: true, timestamp: new Date().toISOString() };
  } catch (error) {
    console.error("[Sync Job] Error during synchronization:", error);
    return { success: false, error: String(error) };
  }
}

// Run sync job periodically (every 30 minutes)
export function startSyncJob() {
  // Run immediately on startup
  syncAllDataFiles();

  // Then run every 30 minutes
  setInterval(() => {
    syncAllDataFiles();
  }, 30 * 60 * 1000); // 30 minutes

  console.log("[Sync Job] Periodic sync job started (every 30 minutes)");
}
