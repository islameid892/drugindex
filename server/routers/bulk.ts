import { router, publicProcedure } from '../_core/trpc';
import { z } from 'zod';
import {
  searchCodes,
  searchNonCoveredCodes,
} from '../db';

export const bulkRouter = router({
  suggestions: publicProcedure
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().min(1).max(20).default(10)
    }))
    .query(async ({ input }) => {
      if (!input.query || input.query.length === 0) return [];
      
      const searchQuery = input.query.toUpperCase();
      try {
        const codes = await searchCodes(searchQuery);
        return codes
          .slice(0, input.limit)
          .map(code => ({
            code: code.code,
            description: code.description
          }));
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        return [];
      }
    }),

  verifyBatch: publicProcedure
    .input(z.object({
      items: z.array(z.string()),
    }))
    .mutation(async ({ input }) => {
      const results = [];

      for (const item of input.items) {
        const result: any = {
          input: item,
          type: 'code',
          found: false,
          isCovered: false,
          details: {}
        };

        // Validate it's a valid ICD-10 code format (e.g., D07.28, E11.9, A01)
        const isValidCode = /^[A-Z]\d{2}(\.\d{1,2})?$/i.test(item);

        if (isValidCode) {
          try {
            // Search for code
            const codes = await searchCodes(item);
            if (codes && codes.length > 0) {
              const code = codes[0];
              result.found = true;
              result.details.name = code.description;
              
              // Check if code is covered
              const nonCoveredCodes = await searchNonCoveredCodes(item);
              result.isCovered = nonCoveredCodes.length === 0;
            }
          } catch (error) {
            console.error('Error querying code:', error);
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
        type: z.enum(['code']),
        found: z.boolean(),
        isCovered: z.boolean(),
        details: z.object({
          name: z.string().optional(),
        })
      })),
      format: z.enum(['csv', 'json'])
    }))
    .query(({ input }) => {
      const { results, format } = input;

      if (format === 'csv') {
        const headers = ['Code', 'Found', 'Coverage Status', 'Code Name'];
        const rows = results.map(r => [
          r.input,
          r.found ? 'Yes' : 'No',
          r.found ? (r.isCovered ? 'Covered' : 'Not Covered') : 'N/A',
          r.details.name || ''
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
