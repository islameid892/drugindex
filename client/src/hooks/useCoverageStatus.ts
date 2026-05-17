import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';

// Cache the non-covered codes in memory to avoid repeated API calls
let coverageCache: Set<string> | null = null;
let cacheLoadPromise: Promise<void> | null = null;

async function loadCoverageCache(): Promise<void> {
  if (coverageCache) return;
  if (cacheLoadPromise) return cacheLoadPromise;

  cacheLoadPromise = (async () => {
    try {
      const response = await fetch('/api/trpc/data.nonCoveredCodes.getAll', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        const json = await response.json();
        const data = json?.result?.data ?? [];
        coverageCache = new Set(data.map((item: { code: string }) => item.code));
      } else {
        coverageCache = new Set();
      }
    } catch (error) {
      console.error('Error loading coverage status from API:', error);
      coverageCache = new Set();
    }
  })();

  return cacheLoadPromise;
}

export function useCoverageStatus(icd10Codes: string) {
  const [isCovered, setIsCovered] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkCoverage = async () => {
      try {
        await loadCoverageCache();

        // فحص جميع الأكواد في هذا الدواء - مطابقة دقيقة فقط (exact match)
        const allCodes = icd10Codes
          .split(',')
          .map((code: string) => code.trim());
        
        // البحث عن أي كود مطابق تماماً في قائمة الأكواد غير المغطاة
        const hasNonCovered = allCodes.some((code: string) => {
          return coverageCache!.has(code);
        });

        setIsCovered(!hasNonCovered);
      } catch (error) {
        console.error('Error checking coverage status:', error);
        setIsCovered(true);
      } finally {
        setLoading(false);
      }
    };

    checkCoverage();
  }, [icd10Codes]);

  return { isCovered, loading };
}
