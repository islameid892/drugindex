#!/usr/bin/env node
/**
 * Bulk update drug prices via TRPC
 * Call the admin.bulkUpdateDrugs procedure with drug data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function bulkUpdateDrugs() {
  try {
    console.log('🚀 Starting bulk drug price update via TRPC...\n');
    
    // Read drugs from JSON
    const drugsFile = '/tmp/drugs_update.json';
    if (!fs.existsSync(drugsFile)) {
      throw new Error(`Drugs file not found: ${drugsFile}`);
    }
    
    console.log(`📖 Reading drugs from ${drugsFile}...`);
    const drugsData = fs.readFileSync(drugsFile, 'utf-8');
    const drugs = JSON.parse(drugsData);
    console.log(`✅ Loaded ${drugs.length} drugs\n`);
    
    // Prepare TRPC request
    const apiUrl = process.env.API_URL || 'http://localhost:3000/api/trpc/admin.bulkUpdateDrugs';
    const payload = {
      json: {
        drugs,
        batchSize: 100,
      },
    };
    
    console.log(`⚡ Sending request to ${apiUrl}...`);
    console.log(`📦 Payload size: ${JSON.stringify(payload).length} bytes\n`);
    
    const startTime = Date.now();
    
    const response = await globalThis.fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
    
    const result = await response.json();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ Update completed in ${duration}s`);
    console.log(`   Result:`, result);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

bulkUpdateDrugs();
