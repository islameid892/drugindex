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
          const response = await fetch('/data/non_covered_codes.json');
          coverageCache = await response.json();
        }

        // فحص جميع الأكواد في هذا الدواء - مطابقة دقيقة فقط (exact match)
        const allCodes = icd10Codes
          .split(',')
          .map((code: string) => code.trim());
        
        // البحث عن أي كود مطابق تماماً في قائمة الأكواد غير المغطاة
        const hasNonCovered = allCodes.some((code: string) => {
          return coverageCache!.includes(code);
        });

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
