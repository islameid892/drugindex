import { useEffect, useState } from 'react';

let coverageCache: string[] | null = null;

export function useCoverageStatus(icd10Codes: string) {
  const [isCovered, setIsCovered] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkCoverage = async () => {
      try {
        // تحميل البيانات من الـ cache أو من الملف
        if (!coverageCache) {
          const response = await fetch('/data/coverage_status.json');
          const data = await response.json();
          coverageCache = data.non_covered;
        }

        // فحص جميع الأكواد في هذا الدواء
        const allCodes = icd10Codes
          .split(',')
          .map((code: string) => code.trim().substring(0, 3));
        
        const hasNonCovered = allCodes.some((code: string) =>
          coverageCache!.includes(code)
        );

        setIsCovered(!hasNonCovered);
      } catch (error) {
        console.error('Error loading coverage status:', error);
        setIsCovered(true);
      } finally {
        setLoading(false);
      }
    };

    checkCoverage();
  }, [icd10Codes]);

  return { isCovered, loading };
}
