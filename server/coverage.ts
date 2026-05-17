/**
 * Hierarchical Coverage Logic
 * 
 * Business Rules:
 * 1. If a parent code (e.g., L70) is NOT COVERED → all children (L70.0, L70.1, etc.) are NOT COVERED
 * 2. If a child code (e.g., F41.1) is NOT COVERED → only that code is NOT COVERED
 * 3. Parent and sibling codes remain unaffected
 */

import { getDb } from "./db";
import { nonCoveredCodes } from "../drizzle/schema";
import { inArray } from "drizzle-orm";

// Cache for parent code coverage lookups
const parentCoverageCache = new Map<string, boolean>();

/**
 * Extract parent code prefixes from an ICD code
 * 
 * Examples:
 * - L70.1 → [L70]
 * - F41.1.2 → [F41, F41.1]
 * - E11 → []
 */
export function getParentCodes(code: string): string[] {
  const parents: string[] = [];
  const parts = code.split(".");
  
  // Build parent prefixes
  for (let i = 1; i < parts.length; i++) {
    parents.push(parts.slice(0, i).join("."));
  }
  
  return parents;
}

/**
 * Check if a code is covered (respecting hierarchy)
 * 
 * Algorithm:
 * 1. Get all parent codes
 * 2. If any parent is NOT COVERED → return false
 * 3. Check if the exact code is NOT COVERED
 * 4. Default = true (covered)
 */
export async function isCovered(code: string): Promise<boolean> {
  const db = await getDb();
  
  // Get all parent codes
  const parents = getParentCodes(code);
  
  // Check if any parent is not covered
  if (parents.length > 0) {
    // Check cache first
    for (const parent of parents) {
      if (parentCoverageCache.has(parent)) {
        const isCov = parentCoverageCache.get(parent);
        if (!isCov) return false; // Parent is not covered
      }
    }
    
    // Check database for uncached parents
    const uncachedParents = parents.filter(p => !parentCoverageCache.has(p));
    if (uncachedParents.length > 0) {
      const result = await db
        .select({ code: nonCoveredCodes.code })
        .from(nonCoveredCodes)
        .where(inArray(nonCoveredCodes.code, uncachedParents));
      
      const notCoveredParents = new Set((result as Array<{ code: string }>).map(r => r.code));
      
      // Update cache
      for (const parent of uncachedParents) {
        parentCoverageCache.set(parent, !notCoveredParents.has(parent));
      }
      
      // Check if any parent is not covered
      if (notCoveredParents.size > 0) return false;
    }
  }
  
  // Check if the exact code is not covered
  if (parentCoverageCache.has(code)) {
    return parentCoverageCache.get(code)!;
  }
  
  const result = await db
    .select({ code: nonCoveredCodes.code })
    .from(nonCoveredCodes)
    .where(inArray(nonCoveredCodes.code, [code]));
  
  const isCov = result.length === 0; // true if NOT found in non_covered_codes
  parentCoverageCache.set(code, isCov);
  
  return isCov;
}

/**
 * Check multiple codes at once (optimized)
 * Returns a map of code → isCovered
 */
export async function checkCoverageMultiple(codes: string[]): Promise<Map<string, boolean>> {
  const db = await getDb();
  const result = new Map<string, boolean>();
  
  // Collect all codes to check (including parents)
  const allCodesToCheck = new Set<string>();
  const codeToParents = new Map<string, string[]>();
  
  for (const code of codes) {
    allCodesToCheck.add(code);
    const parents = getParentCodes(code);
    codeToParents.set(code, parents);
    parents.forEach(p => allCodesToCheck.add(p));
  }
  
  // Check cache first
  const uncachedCodes = Array.from(allCodesToCheck).filter(c => !parentCoverageCache.has(c));
  
  // Query database for uncached codes
  if (uncachedCodes.length > 0) {
    const dbResult = await db
      .select({ code: nonCoveredCodes.code })
      .from(nonCoveredCodes)
      .where(inArray(nonCoveredCodes.code, uncachedCodes));
    
    const notCoveredSet = new Set((dbResult as Array<{ code: string }>).map(r => r.code));
    
    // Update cache
    for (const code of uncachedCodes) {
      const isCov = !notCoveredSet.has(code);
      parentCoverageCache.set(code, isCov);
    }
  }
  
  // Determine coverage for each code
  for (const code of codes) {
    const parents = codeToParents.get(code) || [];
    
    // Check if any parent is not covered
    let isCov = true;
    for (const parent of parents) {
      if (!parentCoverageCache.get(parent)) {
        isCov = false;
        break;
      }
    }
    
    // Check the code itself
    if (isCov && !parentCoverageCache.get(code)) {
      isCov = false;
    }
    
    result.set(code, isCov);
  }
  
  return result;
}

/**
 * Clear the coverage cache (useful for testing or after updates)
 */
export function clearCoverageCache(): void {
  parentCoverageCache.clear();
}

/**
 * Get cache statistics (for debugging)
 */
export function getCoverageStats(): { size: number; entries: Array<[string, boolean]> } {
  return {
    size: parentCoverageCache.size,
    entries: Array.from(parentCoverageCache.entries()),
  };
}
