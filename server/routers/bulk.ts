import { router, publicProcedure } from '../_core/trpc';
import { z } from 'zod';
import {
  searchMedications,
  searchCodes,
  searchNonCoveredCodes,
} from '../db';

export const bulkRouter = router({
  verifyBatch: publicProcedure
    .input(z.object({
      items: z.array(z.string()),
    }))
    .mutation(async ({ input }) => {
      const results = [];

      for (const item of input.items) {
        const result: any = {
          input: item,
          type: 'unknown',
          found: false,
          isCovered: false,
          details: {}
        };

        // Check if it's a code (starts with letter and contains dot or is 3-4 chars)
        const isCode = /^[A-Z]\d{2}(\.\d{1,2})?$/i.test(item);

        if (isCode) {
          result.type = 'code';
          
          try {
            // Search for code
            const codes = await searchCodes(item);
            if (codes && codes.length > 0) {
              const code = codes[0];
              result.found = true;
              result.details.name = code.description;
              result.details.codes = [item];
              
              // Check if code is covered
              const nonCoveredCodes = await searchNonCoveredCodes(item);
              result.isCovered = nonCoveredCodes.length === 0;
            }
          } catch (error) {
            console.error('Error querying code:', error);
          }
        } else {
          result.type = 'medication';
          
          try {
            // Search for medication
            const medications = await searchMedications(item);
            if (medications && medications.length > 0) {
              const medication = medications[0];
              result.found = true;
              result.details.name = medication.tradeNames?.[0] || medication.scientificName;
              result.details.scientificName = medication.scientificName;
              result.details.indication = medication.indication;
              result.details.codes = medication.icdCodes;
              
              // Check coverage status of all codes
              const codesArray = medication.icdCodes || [];
              let allCovered = true;
              for (const code of codesArray) {
                const nonCoveredCodes = await searchNonCoveredCodes(code);
                if (nonCoveredCodes.length > 0) {
                  allCovered = false;
                  break;
                }
              }
              
              result.isCovered = allCovered;
            }
          } catch (error) {
            console.error('Error querying medication:', error);
          }
        }

        results.push(result);
      }

      return results;
    }),

  exportResults: publicProcedure
    .input(z.object({
      results: z.array(z.object({
        input: z.string(),
        type: z.enum(['medication', 'code', 'unknown']),
        found: z.boolean(),
        isCovered: z.boolean(),
        details: z.object({
          name: z.string().optional(),
          scientificName: z.string().optional(),
          indication: z.string().optional(),
          codes: z.array(z.string()).optional(),
        })
      })),
      format: z.enum(['csv', 'json'])
    }))
    .query(({ input }) => {
      const { results, format } = input;

      if (format === 'csv') {
        const headers = ['Input', 'Type', 'Found', 'Coverage Status', 'Name', 'Details'];
        const rows = results.map(r => [
          r.input,
          r.type,
          r.found ? 'Yes' : 'No',
          r.found ? (r.isCovered ? 'Covered' : 'Not Covered') : 'N/A',
          r.details.name || '',
          r.details.scientificName || r.details.indication || ''
        ]);

        const csv = [
          headers.join(','),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        return {
          data: csv,
          filename: `bulk-verification-${new Date().toISOString().split('T')[0]}.csv`,
          mimeType: 'text/csv'
        };
      } else {
        return {
          data: JSON.stringify(results, null, 2),
          filename: `bulk-verification-${new Date().toISOString().split('T')[0]}.json`,
          mimeType: 'application/json'
        };
      }
    })
});
