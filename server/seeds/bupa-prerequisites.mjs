import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { bupaPrerequisites } from '../../drizzle/schema.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seedBupaPrerequisites() {
  try {
    // Read JSON data
    const dataPath = path.join(__dirname, '../../upload/bupa_data.json');
    const jsonData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    // Create database connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'icd10_search',
    });

    const db = drizzle(connection);

    console.log(`Starting to seed ${jsonData.length} Bupa prerequisites...`);

    // Insert data in batches
    const batchSize = 10;
    for (let i = 0; i < jsonData.length; i += batchSize) {
      const batch = jsonData.slice(i, i + batchSize);
      
      for (const record of batch) {
        await db.insert(bupaPrerequisites).values({
          serviceName: record.serviceName,
          icdCodes: record.icdCodes,
          requirements: record.requirements,
        }).catch(err => {
          console.warn(`Skipping duplicate: ${record.serviceName}`);
        });
      }

      console.log(`Inserted ${Math.min(i + batchSize, jsonData.length)} / ${jsonData.length}`);
    }

    console.log('✅ Bupa prerequisites seeded successfully!');
    await connection.end();
  } catch (error) {
    console.error('❌ Error seeding Bupa prerequisites:', error);
    process.exit(1);
  }
}

seedBupaPrerequisites();
