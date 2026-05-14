import { getDb } from "../db";
import { bupaPrerequisites, bupaPrerequisiteCodes, bupaCodeBranches, icdCodes, icdBranches } from "../../drizzle/schema";
import { eq, inArray } from "drizzle-orm";

/**
 * Populate Bupa Prerequisites ICD Code Links
 * 
 * This script:
 * 1. Reads all Bupa prerequisites with their comma-separated ICD codes
 * 2. Parses the ICD codes and matches them to the icd_codes table
 * 3. Creates entries in bupa_prerequisite_codes junction table
 * 4. For each code, finds all related branches and creates entries in bupa_code_branches
 */

async function populateBupaIcdLinks() {
  console.log("🔗 Starting Bupa-ICD linking process...\n");

  try {
    const db = await getDb();
    
    // Step 1: Get all Bupa prerequisites
    const allBupaPrereqs = await db.select().from(bupaPrerequisites);
    console.log(`📋 Found ${allBupaPrereqs.length} Bupa prerequisites\n`);

    let totalCodesLinked = 0;
    let totalBranchesLinked = 0;
    let totalErrors = 0;

    for (const bupa of allBupaPrereqs) {
      console.log(`\n📌 Processing: ${bupa.serviceName}`);
      console.log(`   Raw codes: ${bupa.icdCodes}`);

      // Parse comma-separated codes
      const codesToProcess = bupa.icdCodes
        .split(",")
        .map((c: string) => c.trim())
        .filter((c: string) => c.length > 0);

      console.log(`   Parsed ${codesToProcess.length} codes`);

      for (const codeStr of codesToProcess) {
        try {
          // Step 2: Find the ICD code in the database
          const [icdCodeRecord] = await db
            .select()
            .from(icdCodes)
            .where(eq(icdCodes.code, codeStr))
            .limit(1);

          if (!icdCodeRecord) {
            console.log(`   ⚠️  Code "${codeStr}" not found in icd_codes table`);
            totalErrors++;
            continue;
          }

          console.log(`   ✓ Found code: ${codeStr} (ID: ${icdCodeRecord.id}) - ${icdCodeRecord.description}`);

          // Step 3: Create junction entry in bupa_prerequisite_codes
          const [existingLink] = await db
            .select()
            .from(bupaPrerequisiteCodes)
            .where(
              inArray(
                bupaPrerequisiteCodes.bupaPrerequisiteId,
                [bupa.id]
              )
            )
            .limit(1);

          let bupaCodeId: number;

          if (existingLink && existingLink.icdCodeId === icdCodeRecord.id) {
            // Link already exists
            bupaCodeId = existingLink.id;
            console.log(`     └─ Link already exists (ID: ${bupaCodeId})`);
          } else {
            // Create new link
            const [newLink] = await db
              .insert(bupaPrerequisiteCodes)
              .values({
                bupaPrerequisiteId: bupa.id,
                icdCodeId: icdCodeRecord.id,
              })
              .$returningId();

            bupaCodeId = newLink.id;
            totalCodesLinked++;
            console.log(`     └─ Created link (ID: ${bupaCodeId})`);
          }

          // Step 4: Find and link all branches for this code
          const branches = await db
            .select()
            .from(icdBranches)
            .where(eq(icdBranches.parentCodeId, icdCodeRecord.id));

          if (branches.length > 0) {
            console.log(`     └─ Found ${branches.length} branches`);

            for (const branch of branches) {
              // Check if branch link already exists
              const [existingBranchLink] = await db
                .select()
                .from(bupaCodeBranches)
                .where(
                  inArray(bupaCodeBranches.bupaCodeId, [bupaCodeId])
                )
                .limit(1);

              if (!existingBranchLink || existingBranchLink.icdBranchId !== branch.id) {
                await db.insert(bupaCodeBranches).values({
                  bupaCodeId: bupaCodeId,
                  icdBranchId: branch.id,
                });

                totalBranchesLinked++;
                console.log(
                  `        • ${branch.branchCode}: ${branch.branchDescription}`
                );
              }
            }
          }
        } catch (error) {
          console.error(`   ❌ Error processing code "${codeStr}":`, error);
          totalErrors++;
        }
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Bupa-ICD Linking Complete!");
    console.log("=".repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   • Total Bupa prerequisites processed: ${allBupaPrereqs.length}`);
    console.log(`   • Total codes linked: ${totalCodesLinked}`);
    console.log(`   • Total branches linked: ${totalBranchesLinked}`);
    console.log(`   • Errors encountered: ${totalErrors}`);
    console.log("=".repeat(60));

    process.exit(0);
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

// Run the script
populateBupaIcdLinks();
