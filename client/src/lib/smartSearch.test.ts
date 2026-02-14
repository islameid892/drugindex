import { describe, it, expect } from 'vitest';
import {
  levenshteinDistance,
  fuzzyMatchScore,
  getSpellCorrections,
  getAutocompleteSuggestions,
  normalizeText,
  suggestCorrection,
} from './smartSearch';

describe('Smart Search Utilities', () => {
  describe('levenshteinDistance', () => {
    it('should calculate distance between identical strings as 0', () => {
      expect(levenshteinDistance('test', 'test')).toBe(0);
    });

    it('should calculate distance for single character difference', () => {
      expect(levenshteinDistance('cat', 'bat')).toBe(1);
    });

    it('should calculate distance for multiple differences', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    });
  });

  describe('fuzzyMatchScore', () => {
    it('should return 1 for exact match', () => {
      expect(fuzzyMatchScore('panadol', 'panadol')).toBe(1);
    });

    it('should return 0.9 for contains match', () => {
      const score = fuzzyMatchScore('pana', 'panadol');
      expect(score).toBeGreaterThan(0.85);
    });

    it('should handle case insensitivity', () => {
      const score = fuzzyMatchScore('PANADOL', 'panadol');
      expect(score).toBe(1);
    });

    it('should return positive score for similar strings', () => {
      const score = fuzzyMatchScore('panadol', 'panadole');
      expect(score).toBeGreaterThan(0.7);
    });
  });

  describe('getSpellCorrections', () => {
    const candidates = [
      'panadol',
      'paracetamol',
      'ibuprofen',
      'aspirin',
      'gemcitabine',
    ];

    it('should suggest corrections for typos', () => {
      const corrections = getSpellCorrections('panadol', candidates);
      expect(corrections).toContain('panadol');
    });

    it('should suggest similar words', () => {
      const corrections = getSpellCorrections('panodol', candidates);
      expect(corrections.length).toBeGreaterThan(0);
      expect(corrections[0]).toBe('panadol');
    });

    it('should return empty array for very different query', () => {
      const corrections = getSpellCorrections('xyz', candidates, 0.9);
      expect(corrections.length).toBe(0);
    });
  });

  describe('getAutocompleteSuggestions', () => {
    const items = [
      { name: 'Panadol', id: '1' },
      { name: 'Paracetamol', id: '2' },
      { name: 'Ibuprofen', id: '3' },
      { name: 'Aspirin', id: '4' },
    ];

    it('should return empty array for empty query', () => {
      const suggestions = getAutocompleteSuggestions('', items);
      expect(suggestions).toEqual([]);
    });

    it('should prioritize prefix matches', () => {
      const suggestions = getAutocompleteSuggestions('pan', items);
      expect(suggestions[0].name).toMatch(/^pan/i);
    });

    it('should respect limit parameter', () => {
      const suggestions = getAutocompleteSuggestions('a', items, 2);
      expect(suggestions.length).toBeLessThanOrEqual(2);
    });

    it('should include score in results', () => {
      const suggestions = getAutocompleteSuggestions('pana', items);
      expect(suggestions[0]).toHaveProperty('score');
      expect(suggestions[0].score).toBeGreaterThan(0);
    });
  });

  describe('normalizeText', () => {
    it('should convert to lowercase', () => {
      expect(normalizeText('PANADOL')).toBe('panadol');
    });

    it('should trim whitespace', () => {
      expect(normalizeText('  panadol  ')).toBe('panadol');
    });

    it('should normalize multiple spaces', () => {
      expect(normalizeText('pana   dol')).toBe('pana dol');
    });

    it('should remove special characters', () => {
      expect(normalizeText('pana-dol!')).toBe('panadol');
    });
  });

  describe('suggestCorrection', () => {
    const candidates = [
      'panadol',
      'paracetamol',
      'ibuprofen',
      'aspirin',
    ];

    it('should suggest correction for typo', () => {
      const correction = suggestCorrection('panodol', candidates);
      expect(correction).toBe('panadol');
    });

    it('should return null for exact match', () => {
      const correction = suggestCorrection('panadol', candidates);
      expect(correction).toBeNull();
    });

    it('should return null for very different query', () => {
      const correction = suggestCorrection('xyz', candidates);
      expect(correction).toBeNull();
    });
  });
});
