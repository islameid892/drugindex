#!/usr/bin/env node

/**
 * Smart Medicine Import Script
 * Imports medicines from CSV with validation, duplicate detection, and intelligent merging
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';


// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_FILE = path.join(__dirname, 'import-data.csv');

// ─── Configuration ─────────────────────────────────────────────────────────

// Parse DATABASE_URL format: mysql://user:password@host:port/database?ssl=...
const parseDbUrl = () => {
  const url = process.env.DATABASE_URL || '';
  const baseUrl = url.split('?')[0];
  const match = baseUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) {
    console.error('❌ Invalid DATABASE_URL format');
    process.exit(1);
  }
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database: match[5],
  };
};

const DB_CONFIG = parseDbUrl();

// ─── Types ─────────────────────────────────────────────────────────────────

class ImportReport {
  constructor() {
    this.totalRows = 0;
    this.importedCount = 0;
    this.duplicateCount = 0;
    this.skippedCount = 0;
    this.errorCount = 0;
    this.newCodesCount = 0;
    this.linkedCodesCount = 0;
    this.errors = [];
    this.warnings = [];
    this.startTime = new Date();
  }

  addError(message) {
    this.errors.push(message);
    this.errorCount++;
  }

  addWarning(message) {
    this.warnings.push(message);
  }

  print() {
    const duration = ((new Date() - this.startTime) / 1000).toFixed(2);
    console.log('\n' + '='.repeat(80));
    console.log('📊 IMPORT REPORT');
    console.log('='.repeat(80));
    console.log(`\n✅ SUMMARY:`);
    console.log(`  • Total Rows Processed:    ${this.totalRows}`);
    console.log(`  • Successfully Imported:   ${this.importedCount}`);
    console.log(`  • Duplicates Detected:     ${this.duplicateCount}`);
    console.log(`  • Skipped:                 ${this.skippedCount}`);
    console.log(`  • Errors:                  ${this.errorCount}`);
    console.log(`  • New ICD Codes Added:     ${this.newCodesCount}`);
    console.log(`  • Code Links Created:      ${this.linkedCodesCount}`);
    console.log(`  • Duration:                ${duration}s`);

    if (this.warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS (${this.warnings.length}):`);
      this.warnings.slice(0, 10).forEach((w, i) => console.log(`  ${i + 1}. ${w}`));
      if (this.warnings.length > 10) {
        console.log(`  ... and ${this.warnings.length - 10} more`);
      }
    }

    if (this.errors.length > 0) {
      console.log(`\n❌ ERRORS (${this.errors.length}):`);
      this.errors.slice(0, 10).forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
      if (this.errors.length > 10) {
        console.log(`  ... and ${this.errors.length - 10} more`);
      }
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }
}

// ─── Database Connection ────────────────────────────────────────────────────

async function createConnection() {
  try {
    const connectionConfig = {
      ...DB_CONFIG,
      ssl: {
        rejectUnauthorized: false,
      },
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0,
    };
    const connection = await mysql.createConnection(connectionConfig);
    console.log('✅ Database connected');
    return connection;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

// ─── CSV Parser ────────────────────────────────────────────────────────────

function parseCSV() {
  try {
    let fileContent = fs.readFileSync(CSV_FILE, 'utf-8');
    // Remove BOM if present
    if (fileContent.charCodeAt(0) === 0xFEFF) {
      fileContent = fileContent.slice(1);
    }
    // Normalize line endings
    fileContent = fileContent.replace(/\r\n/g, '\n');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
    console.log(`✅ CSV parsed: ${records.length} rows`);
    return records;
  } catch (error) {
    console.error('❌ CSV parsing failed:', error.message);
    process.exit(1);
  }
}

// ─── Validation ────────────────────────────────────────────────────────────

function validateRow(row, index) {
  const errors = [];

  if (!row['SCIENTIFIC NAME']?.trim()) {
    errors.push(`Row ${index}: Missing SCIENTIFIC NAME`);
  }
  if (!row['TRADE NAME']?.trim()) {
    errors.push(`Row ${index}: Missing TRADE NAME`);
  }
  if (!row['INDICATION']?.trim()) {
    errors.push(`Row ${index}: Missing INDICATION`);
  }
  if (!row['ICD 10 CODE']?.trim()) {
    errors.push(`Row ${index}: Missing ICD 10 CODE`);
  }

  return errors;
}

// ─── Parse ICD Codes ────────────────────────────────────────────────────────

function parseIcdCodes(codesString) {
  return codesString
    .split(',')
    .map((code) => code.trim().toUpperCase())
    .filter((code) => code.length > 0);
}

// ─── Main Import Logic ──────────────────────────────────────────────────────

async function importMedicines() {
  const connection = await createConnection();
  const report = new ImportReport();

  try {
    // Parse CSV
    const records = parseCSV();
    report.totalRows = records.length;

    // Track processed combinations to detect duplicates
    const processedCombinations = new Set();

    console.log('\n📋 Starting import process...\n');

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 1;

      // Debug first few rows
      if (i < 3) {
        console.log(`Debug Row ${rowNum}:`, Object.keys(row), row);
      }

      // Validate row
      const validationErrors = validateRow(row, rowNum);
      if (validationErrors.length > 0) {
        if (i < 3) {
          console.log(`Validation errors for row ${rowNum}:`, validationErrors);
        }
        validationErrors.forEach((err) => report.addError(err));
        report.skippedCount++;
        continue;
      }

      const scientificName = row['SCIENTIFIC NAME'].trim();
      const tradeName = row['TRADE NAME'].trim();
      const indication = row['INDICATION'].trim();
      const icdCodesRaw = row['ICD 10 CODE'].trim();

      // Create combination key for duplicate detection
      const combinationKey = `${scientificName}|${tradeName}|${indication}|${icdCodesRaw}`;

      if (processedCombinations.has(combinationKey)) {
        report.duplicateCount++;
        continue;
      }

      processedCombinations.add(combinationKey);

      try {
        // Insert drug entry
        const [drugResult] = await connection.execute(
          `INSERT INTO drug_entries (scientific_name, trade_name, indication, icd_codes_raw)
           VALUES (?, ?, ?, ?)`,
          [scientificName, tradeName, indication, icdCodesRaw]
        );

        const drugEntryId = drugResult.insertId;

        // Parse and link ICD codes
        const icdCodes = parseIcdCodes(icdCodesRaw);

        for (const code of icdCodes) {
          // Check if code exists
          const [existingCode] = await connection.execute(
            `SELECT id FROM icd_codes WHERE code = ?`,
            [code]
          );

          let codeId;

          if (existingCode.length > 0) {
            codeId = existingCode[0].id;
          } else {
            // Create new ICD code
            const [newCodeResult] = await connection.execute(
              `INSERT INTO icd_codes (code, description, branch_count)
               VALUES (?, ?, 0)`,
              [code, `Code ${code} (imported)`]
            );
            codeId = newCodeResult.insertId;
            report.newCodesCount++;
          }

          // Link drug entry to ICD code
          await connection.execute(
            `INSERT INTO drug_entry_codes (drug_entry_id, code_id)
             VALUES (?, ?)`,
            [drugEntryId, codeId]
          );

          report.linkedCodesCount++;
        }

        report.importedCount++;

        // Progress indicator
        if (report.importedCount % 100 === 0) {
          console.log(`  ✓ Imported ${report.importedCount} medicines...`);
        }
      } catch (error) {
        report.addError(`Row ${rowNum}: ${error.message}`);
      }
    }

    // Print report
    report.print();

    // Save report to file
    const reportPath = path.join(__dirname, 'import-report.json');
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          summary: {
            totalRows: report.totalRows,
            importedCount: report.importedCount,
            duplicateCount: report.duplicateCount,
            skippedCount: report.skippedCount,
            errorCount: report.errorCount,
            newCodesCount: report.newCodesCount,
            linkedCodesCount: report.linkedCodesCount,
          },
          errors: report.errors,
          warnings: report.warnings,
        },
        null,
        2
      )
    );

    console.log(`📄 Report saved to: ${reportPath}`);
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// ─── Run Import ────────────────────────────────────────────────────────────

console.log('🚀 Starting Medicine Import Process\n');
importMedicines().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
