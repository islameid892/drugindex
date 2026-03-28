#!/usr/bin/env node
/**
 * Batch update drug prices and data from Excel file
 * Uses parallel processing for speed
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Database connection pool
let pool;

async function initPool() {
  pool = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'drugindex',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
  console.log('✅ Database pool initialized');
}

async function readDrugsFromJSON(filePath) {
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

async function updateDrugBatch(drugs, batchSize = 50) {
  const conn = await pool.getConnection();
  
  try {
    let updated = 0;
    let inserted = 0;
    let skipped = 0;

    // Process in batches
    for (let i = 0; i < drugs.length; i += batchSize) {
      const batch = drugs.slice(i, i + batchSize);
      
      // Process each drug in parallel
      const promises = batch.map(async (drug) => {
        try {
          // Check if drug exists (by scientific_name + trade_name)
          const [existing] = await conn.query(
            'SELECT id FROM drug_lens WHERE scientific_name = ? AND trade_name = ? LIMIT 1',
            [drug.scientific_name, drug.trade_name]
          );

          if (existing.length > 0) {
            // Update existing drug
            await conn.query(
              `UPDATE drug_lens SET 
                price = ?,
                pharmacological_action = COALESCE(?, pharmacological_action),
                black_box_warning = COALESCE(?, black_box_warning),
                uses = COALESCE(?, uses),
                pregnancy_category = COALESCE(?, pregnancy_category),
                standard_dose = COALESCE(?, standard_dose),
                adjusted_dose = COALESCE(?, adjusted_dose),
                neonatal_dose = COALESCE(?, neonatal_dose),
                dose_source = COALESCE(?, dose_source),
                contraindicated_interactions = COALESCE(?, contraindicated_interactions),
                major_interactions = COALESCE(?, major_interactions),
                moderate_interactions = COALESCE(?, moderate_interactions),
                minor_interactions = COALESCE(?, minor_interactions),
                updatedAt = NOW()
              WHERE id = ?`,
              [
                drug.price,
                drug.pharmacological_action,
                drug.black_box_warning,
                drug.uses,
                drug.pregnancy_category,
                drug.standard_dose,
                drug.adjusted_dose,
                drug.neonatal_dose,
                drug.dose_source,
                drug.contraindicated_interactions,
                drug.major_interactions,
                drug.moderate_interactions,
                drug.minor_interactions,
                existing[0].id,
              ]
            );
            updated++;
          } else {
            // Insert new drug
            await conn.query(
              `INSERT INTO drug_lens (
                scientific_name, trade_name, price,
                pharmacological_action, black_box_warning, uses,
                pregnancy_category, standard_dose, adjusted_dose,
                neonatal_dose, dose_source,
                contraindicated_interactions, major_interactions,
                moderate_interactions, minor_interactions,
                createdAt, updatedAt
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
              [
                drug.scientific_name,
                drug.trade_name,
                drug.price,
                drug.pharmacological_action,
                drug.black_box_warning,
                drug.uses,
                drug.pregnancy_category,
                drug.standard_dose,
                drug.adjusted_dose,
                drug.neonatal_dose,
                drug.dose_source,
                drug.contraindicated_interactions,
                drug.major_interactions,
                drug.moderate_interactions,
                drug.minor_interactions,
              ]
            );
            inserted++;
          }
        } catch (err) {
          console.error(`Error processing drug ${drug.trade_name}:`, err.message);
          skipped++;
        }
      });

      await Promise.all(promises);
      
      const progress = Math.min(i + batchSize, drugs.length);
      console.log(`Progress: ${progress}/${drugs.length} (Updated: ${updated}, Inserted: ${inserted}, Skipped: ${skipped})`);
    }

    return { updated, inserted, skipped };
  } finally {
    conn.release();
  }
}

async function main() {
  try {
    console.log('🚀 Starting drug price update...\n');
    
    // Initialize database
    await initPool();
    
    // Read drugs from JSON
    const drugsFile = '/tmp/drugs_update.json';
    if (!fs.existsSync(drugsFile)) {
      throw new Error(`Drugs file not found: ${drugsFile}`);
    }
    
    console.log(`📖 Reading drugs from ${drugsFile}...`);
    const drugs = await readDrugsFromJSON(drugsFile);
    console.log(`✅ Loaded ${drugs.length} drugs\n`);
    
    // Update database
    console.log('⚡ Starting batch update with parallel processing...\n');
    const startTime = Date.now();
    
    const result = await updateDrugBatch(drugs, 100);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ Update completed in ${duration}s`);
    console.log(`   Updated: ${result.updated}`);
    console.log(`   Inserted: ${result.inserted}`);
    console.log(`   Skipped: ${result.skipped}`);
    console.log(`   Total: ${result.updated + result.inserted + result.skipped}`);
    
    // Verify
    const conn = await pool.getConnection();
    const [countResult] = await conn.query('SELECT COUNT(*) as count FROM drug_lens');
    conn.release();
    
    console.log(`\n📊 Database now contains: ${countResult[0].count} drugs`);
    
    // Check avotrene
    const conn2 = await pool.getConnection();
    const [avotrene] = await conn2.query(
      "SELECT scientific_name, trade_name, price FROM drug_lens WHERE trade_name LIKE '%avotrene%' ORDER BY trade_name"
    );
    conn2.release();
    
    console.log(`\n🔍 Avotrene entries: ${avotrene.length}`);
    avotrene.forEach(a => {
      console.log(`   ${a.scientific_name} - ${a.trade_name} - ${a.price}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

main();
