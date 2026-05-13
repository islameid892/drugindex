import { getDb } from "../db";
import { bupaPrerequisites } from "../../drizzle/schema";
import fs from "fs";
import path from "path";

async function seedBupaData() {
  console.log("Starting Bupa prerequisites seed...");

  const db = await getDb();

  // Read JSON data
  const dataPath = path.join(process.cwd(), "upload", "bupa_data.json");
  
  // Try multiple paths
  const possiblePaths = [
    "/home/ubuntu/upload/bupa_data.json",
    path.join(process.cwd(), "upload", "bupa_data.json"),
    path.join(process.cwd(), "bupa_data.json"),
  ];

  let rawData: string | null = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      rawData = fs.readFileSync(p, "utf-8");
      console.log(`Found data at: ${p}`);
      break;
    }
  }

  if (!rawData) {
    console.error("Could not find bupa_data.json");
    process.exit(1);
  }

  const data: Array<{
    serviceName: string;
    icdCodes: string;
    requirements: string;
  }> = JSON.parse(rawData);

  console.log(`Loaded ${data.length} records from JSON`);

  // Clear existing data
  console.log("Clearing existing data...");
  await db.delete(bupaPrerequisites);

  // Insert in batches of 20
  const batchSize = 20;
  let totalInserted = 0;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    await db.insert(bupaPrerequisites).values(batch);
    totalInserted += batch.length;
    console.log(`Inserted ${totalInserted}/${data.length} records`);
  }

  console.log(`✅ Successfully seeded ${totalInserted} Bupa prerequisites`);
  process.exit(0);
}

seedBupaData().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
