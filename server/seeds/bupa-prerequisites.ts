import fs from 'fs';
import path from 'path';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { bupaPrerequisites } from '../../drizzle/schema';

async function seedBupaPrerequisites() {
  try {
    // Read JSON data
    const dataPath = path.join(process.cwd(), 'upload/bupa_data.json');
    const jsonData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    // Create database connection
    const connection = await mysql.createConnection({
      host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DATABASE_URL?.split('/').pop() || 'icd10_search',
    });

    const db = drizzle(connection);

    console.log(`Starting to seed ${jsonData.length} Bupa prerequisites...`);

    // Clear existing data
    await db.delete(bupaPrerequisites);

    // Insert data in batches
    const batchSize = 10;
    for (let i = 0; i < jsonData.length; i += batchSize) {
      const batch = jsonData.slice(i, i + batchSize);
      
      for (const record of batch) {
        try {
          await db.insert(bupaPrerequisites).values({
            serviceName: record.serviceName,
            icdCodes: record.icdCodes,
            requirements: record.requirements,
          });
        } catch (err) {
          console.warn(`Warning: ${record.serviceName}`);
        }
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
