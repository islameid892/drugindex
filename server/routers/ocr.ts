import { router, publicProcedure } from '../_core/trpc';
import { z } from 'zod';
import { invokeLLM } from '../_core/llm';
import { storagePut } from '../storage';

export const ocrRouter = router({
  extractCodes: publicProcedure
    .input(z.object({
      image: z.string().describe('Base64 encoded image'),
    }))
    .mutation(async ({ input }) => {
      try {
        // Upload the base64 image to S3 first
        const base64Data = input.image.split(',')[1] || input.image;
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Determine MIME type from base64 header
        let mimeType = 'image/jpeg';
        if (input.image.includes('data:image/png')) {
          mimeType = 'image/png';
        } else if (input.image.includes('data:image/webp')) {
          mimeType = 'image/webp';
        }

        const { url: imageUrl } = await storagePut(
          `ocr-uploads/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`,
          buffer,
          mimeType
        );

        console.log('Image uploaded to S3:', imageUrl);

        // Use LLM with vision to extract ICD-10 codes from the image
        const response = await invokeLLM({
          messages: [
            {
              role: 'system',
              content: 'You are an expert at extracting ICD-10 medical codes from images. Extract all ICD-10 codes you can find in the image. Return ONLY a JSON array of codes in format ["D07.28", "E11.9", etc]. If no codes found, return empty array [].'
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Please extract all ICD-10 codes from this image. Return only a JSON array of codes.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'icd10_codes',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  codes: {
                    type: 'array',
                    items: {
                      type: 'string',
                      pattern: '^[A-Z]\\d{2}(\\.\\d{1,2})?$'
                    },
                    description: 'Array of ICD-10 codes found in the image'
                  }
                },
                required: ['codes'],
                additionalProperties: false
              }
            }
          }
        });

        // Parse the response
        const content = response.choices[0]?.message?.content;
        if (!content || typeof content !== 'string') {
          return { codes: [] };
        }

        const parsed = JSON.parse(content);
        const codes = Array.isArray(parsed.codes) ? parsed.codes : [];
        
        // Validate codes format
        const validCodes = codes.filter((code: any) => 
          typeof code === 'string' && /^[A-Z]\d{2}(\.\d{1,2})?$/i.test(code)
        ).map((code: any) => code.toUpperCase());

        console.log('Extracted codes:', validCodes);
        return { codes: validCodes };
      } catch (error) {
        console.error('OCR extraction failed:', error);
        return { codes: [] };
      }
    })
});
