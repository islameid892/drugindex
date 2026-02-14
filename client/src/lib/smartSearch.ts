/**
 * Smart Search Utility
 * Provides spell correction, fuzzy matching, and suggestion generation
 */

// Levenshtein distance for spell correction
export function levenshteinDistance(a: string, b: string): number {
  const aLen = a.length;
  const bLen = b.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= bLen; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= aLen; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bLen; i++) {
    for (let j = 1; j <= aLen; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[bLen][aLen];
}

// Fuzzy matching score (0-1, higher is better)
export function fuzzyMatchScore(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  if (t === q) return 1; // Exact match
  if (t.includes(q)) return 0.9; // Contains match
  if (q.includes(t)) return 0.8; // Query contains text

  const distance = levenshteinDistance(q, t);
  const maxLen = Math.max(q.length, t.length);
  const similarity = 1 - distance / maxLen;

  return Math.max(0, similarity);
}

// Get spell correction suggestions
export function getSpellCorrections(
  query: string,
  candidates: string[],
  threshold: number = 0.7
): string[] {
  return candidates
    .map(candidate => ({
      text: candidate,
      score: fuzzyMatchScore(query, candidate),
    }))
    .filter(item => item.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => item.text);
}

// Get autocomplete suggestions
export function getAutocompleteSuggestions(
  query: string,
  items: Array<{ name: string; id?: string }>,
  limit: number = 10
): Array<{ name: string; id?: string; score: number }> {
  if (!query.trim()) return [];

  const q = query.toLowerCase();

  return items
    .map(item => ({
      ...item,
      score: calculateSuggestionScore(q, item.name),
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Calculate suggestion score (prioritize exact prefix match)
function calculateSuggestionScore(query: string, text: string): number {
  const t = text.toLowerCase();

  if (t === query) return 100; // Exact match
  if (t.startsWith(query)) return 90; // Prefix match (highest priority)
  if (t.includes(query)) return 70; // Contains match

  const fuzzyScore = fuzzyMatchScore(query, t);
  return fuzzyScore > 0.6 ? fuzzyScore * 50 : 0; // Fuzzy match
}

// Normalize text for better matching
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, ''); // Remove special characters
}

// Check if query might have typo and suggest correction
export function suggestCorrection(
  query: string,
  candidates: string[]
): string | null {
  const normalized = normalizeText(query);
  const corrections = getSpellCorrections(normalized, candidates, 0.75);

  if (corrections.length > 0 && corrections[0] !== query) {
    return corrections[0];
  }

  return null;
}

// Batch search with smart matching
export interface SearchResult {
  id: string;
  name: string;
  type: 'medication' | 'condition' | 'code';
  score: number;
}

export function smartSearch(
  query: string,
  medications: Array<{ id: string; name: string; scientificName: string }>,
  conditions: Array<{ id: string; name: string }>,
  codes: Array<{ id: string; code: string }>,
  limit: number = 20
): SearchResult[] {
  if (!query.trim()) return [];

  const q = normalizeText(query);

  const medicationResults = medications
    .map(med => ({
      id: med.id,
      name: med.name,
      type: 'medication' as const,
      score: Math.max(
        calculateSuggestionScore(q, med.name),
        calculateSuggestionScore(q, med.scientificName)
      ),
    }))
    .filter(r => r.score > 0);

  const conditionResults = conditions
    .map(cond => ({
      id: cond.id,
      name: cond.name,
      type: 'condition' as const,
      score: calculateSuggestionScore(q, cond.name),
    }))
    .filter(r => r.score > 0);

  const codeResults = codes
    .map(code => ({
      id: code.id,
      name: code.code,
      type: 'code' as const,
      score: calculateSuggestionScore(q, code.code),
    }))
    .filter(r => r.score > 0);

  return [
    ...medicationResults,
    ...conditionResults,
    ...codeResults,
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
