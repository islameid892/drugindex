import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mainDataPath = path.join(__dirname, '../../client/public/data/main_data.json');

/**
 * Expand combined ICD-10 codes like "C40-C41" into individual codes
 * Examples:
 * - "C40-C41" → ["C40", "C41"]
 * - "F20-F29" → ["F20", "F21", "F22", ..., "F29"]
 * - "C40.0-C40.2" → ["C40.0", "C40.1", "C40.2"]
 */
function expandCombinedCodes(code) {
  if (!code.includes('-')) {
    return [code];
  }

  const parts = code.split('-');
  if (parts.length !== 2) {
    return [code];
  }

  const [start, end] = parts;
  
  // Extract prefix and numbers
  const startMatch = start.match(/^([A-Z])(\d+(?:\.\d+)?)$/);
  const endMatch = end.match(/^([A-Z])?(\d+(?:\.\d+)?)$/);

  if (!startMatch || !endMatch) {
    return [code];
  }

  const prefix = startMatch[1];
  const endPrefix = endMatch[1] || prefix;

  // If prefixes don't match, return original
  if (prefix !== endPrefix) {
    return [code];
  }

  const startNum = parseFloat(startMatch[2]);
  const endNum = parseFloat(endMatch[2]);

  // Handle decimal codes (e.g., C40.0-C40.2)
  if (startMatch[2].includes('.') || endMatch[2].includes('.')) {
    const startParts = startMatch[2].split('.');
    const endParts = endMatch[2].split('.');
    
    const startMain = parseInt(startParts[0]);
    const startDec = parseInt(startParts[1] || '0');
    const endMain = parseInt(endParts[0]);
    const endDec = parseInt(endParts[1] || '0');

    if (startMain === endMain) {
      // Same main code, expand decimals (e.g., C40.0-C40.2)
      const codes = [];
      for (let i = startDec; i <= endDec; i++) {
        codes.push(`${prefix}${startMain}.${i}`);
      }
      return codes;
    } else {
      // Different main codes, return original
      return [code];
    }
  }

  // Handle integer codes (e.g., C40-C41 or F20-F29)
  const codes = [];
  for (let i = startNum; i <= endNum; i++) {
    codes.push(`${prefix}${i}`);
  }
  return codes;
}

console.log('🔧 Fixing combined ICD-10 codes...\n');

try {
  const mainData = JSON.parse(fs.readFileSync(mainDataPath, 'utf8'));

  let totalCombined = 0;
  let totalExpanded = 0;

  // Process each medication
  mainData.forEach((medication, index) => {
    if (medication.icdCodes && Array.isArray(medication.icdCodes)) {
      const newCodes = [];
      
      medication.icdCodes.forEach(code => {
        if (code.includes('-')) {
          totalCombined++;
          const expanded = expandCombinedCodes(code);
          newCodes.push(...expanded);
          totalExpanded += expanded.length;
        } else {
          newCodes.push(code);
        }
      });

      // Remove duplicates and sort
      medication.icdCodes = [...new Set(newCodes)].sort();
    }
  });

  // Save updated data
  fs.writeFileSync(mainDataPath, JSON.stringify(mainData, null, 2), 'utf8');

  console.log('✅ Fixed combined ICD-10 codes successfully!\n');
  console.log(`📊 Statistics:`);
  console.log(`   Combined codes found: ${totalCombined}`);
  console.log(`   Codes after expansion: ${totalExpanded}`);
  console.log(`   Medications processed: ${mainData.length}`);
  console.log(`\n✨ main_data.json updated!`);

} catch (error) {
  console.error('❌ Error fixing combined codes:', error.message);
  process.exit(1);
}
