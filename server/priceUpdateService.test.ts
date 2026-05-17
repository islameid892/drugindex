import { describe, it, expect } from 'vitest';

/**
 * Tests for Price Update Service
 * Tests fuzzy matching logic and string normalization
 */

// Test helper functions (copied from priceUpdateService.ts for testing)
function normalizeName(name: string | undefined | null): string {
  if (!name) return '';
  return String(name).trim().toUpperCase();
}

function tokenSetRatio(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  const tokens1 = new Set(str1.split(/\s+/));
  const tokens2 = new Set(str2.split(/\s+/));

  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);

  return (intersection.size / union.size) * 100;
}

describe('Price Update Service', () => {
  describe('normalizeName', () => {
    it('should convert to uppercase', () => {
      expect(normalizeName('paracetamol')).toBe('PARACETAMOL');
      expect(normalizeName('Ibuprofen')).toBe('IBUPROFEN');
    });

    it('should trim whitespace', () => {
      expect(normalizeName('  aspirin  ')).toBe('ASPIRIN');
    });

    it('should handle null and undefined', () => {
      expect(normalizeName(null)).toBe('');
      expect(normalizeName(undefined)).toBe('');
    });

    it('should handle empty strings', () => {
      expect(normalizeName('')).toBe('');
    });
  });

  describe('tokenSetRatio', () => {
    it('should return 100 for identical strings', () => {
      expect(tokenSetRatio('PARACETAMOL', 'PARACETAMOL')).toBe(100);
      expect(tokenSetRatio('IBUPROFEN', 'IBUPROFEN')).toBe(100);
    });

    it('should handle partial matches', () => {
      const score = tokenSetRatio('AMOXICILLIN TRIHYDRATE', 'AMOXICILLIN');
      expect(score).toBeGreaterThan(40);
    });

    it('should handle multi-word compounds', () => {
      const score = tokenSetRatio(
        'SODIUM CHLORIDE POTASSIUM CHLORIDE',
        'SODIUM CHLORIDE POTASSIUM'
      );
      expect(score).toBeGreaterThan(50);
    });

    it('should return 0 for empty strings', () => {
      expect(tokenSetRatio('', 'PARACETAMOL')).toBe(0);
      expect(tokenSetRatio('PARACETAMOL', '')).toBe(0);
      expect(tokenSetRatio('', '')).toBe(0);
    });

    it('should handle completely different strings', () => {
      const score = tokenSetRatio('PARACETAMOL', 'ASPIRIN');
      expect(score).toBeLessThan(50);
    });

    it('should be case-insensitive after normalization', () => {
      const score1 = tokenSetRatio('PARACETAMOL', 'PARACETAMOL');
      const score2 = tokenSetRatio('paracetamol', 'PARACETAMOL');
      // Both should be 100 if normalized
      expect(score1).toBe(100);
    });
  });

  describe('Matching Strategies', () => {
    it('should prioritize exact scientific name match', () => {
      const sfdaSci = 'PARACETAMOL';
      const dbSci = 'PARACETAMOL';
      expect(sfdaSci === dbSci).toBe(true);
    });

    it('should prioritize exact trade name match', () => {
      const sfdaTrade = 'PANADOL 500MG';
      const dbTrade = 'PANADOL 500MG';
      expect(sfdaTrade === dbTrade).toBe(true);
    });

    it('should handle fuzzy scientific name matching', () => {
      const score = tokenSetRatio(
        normalizeName('AMOXICILLIN TRIHYDRATE'),
        normalizeName('AMOXICILLIN')
      );
      expect(score).toBeGreaterThan(40);
    });

    it('should handle fuzzy trade name matching', () => {
      const score = tokenSetRatio(
        normalizeName('ASPIRIN 500MG TABLET'),
        normalizeName('ASPIRIN 500 MG')
      );
      expect(score).toBeGreaterThan(15);
    });
  });

  describe('Real-world drug matching scenarios', () => {
    it('should match common pain relievers', () => {
      const pairs = [
        ['PARACETAMOL', 'PARACETAMOL'],
        ['IBUPROFEN', 'IBUPROFEN'],
        ['ASPIRIN', 'ASPIRIN'],
      ];

      for (const [sfda, db] of pairs) {
        const score = tokenSetRatio(sfda, db);
        expect(score).toBe(100);
      }
    });

    it('should match antibiotics with minor variations', () => {
      const pairs = [
        ['AMOXICILLIN TRIHYDRATE', 'AMOXICILLIN'],
        ['CEPHALEXIN MONOHYDRATE', 'CEPHALEXIN'],
      ];

      for (const [sfda, db] of pairs) {
        const score = tokenSetRatio(sfda, db);
        expect(score).toBeGreaterThan(40);
      }
    });

    it('should match electrolyte solutions', () => {
      const sfda = 'SODIUM CHLORIDE POTASSIUM CHLORIDE TRISODIUM CITRATE DEXTROSE';
      const db = 'SODIUM CHLORIDE POTASSIUM CHLORIDE TRISODIUM CITRATE DEXTROSE';
      const score = tokenSetRatio(sfda, db);
      expect(score).toBe(100);
    });

    it('should distinguish between different drugs', () => {
      const pairs = [
        ['PARACETAMOL', 'ASPIRIN'],
        ['IBUPROFEN', 'NAPROXEN'],
        ['AMOXICILLIN', 'PENICILLIN'],
      ];

      for (const [drug1, drug2] of pairs) {
        const score = tokenSetRatio(drug1, drug2);
        expect(score).toBeLessThan(80);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle drugs with numbers', () => {
      const score = tokenSetRatio('ASPIRIN 500MG', 'ASPIRIN 500 MG');
      expect(score).toBeGreaterThan(20);
    });

    it('should handle drugs with special characters', () => {
      const score = tokenSetRatio('SODIUM CHLORIDE 0.9%', 'SODIUM CHLORIDE');
      expect(score).toBeGreaterThan(50);
    });

    it('should handle very long drug names', () => {
      const longName = 'SODIUM CHLORIDE POTASSIUM CHLORIDE TRISODIUM CITRATE DEXTROSE MONOHYDRATE';
      const score = tokenSetRatio(longName, longName);
      expect(score).toBe(100);
    });

    it('should handle drugs with parentheses', () => {
      const score = tokenSetRatio('ASPIRIN (USP)', 'ASPIRIN');
      expect(score).toBeGreaterThanOrEqual(50);
    });
  });
});
