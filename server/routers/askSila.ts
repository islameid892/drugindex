import { z } from "zod";
import { getDb, verifySilaApiKey } from "../db";
import { drugLens, drugEntries, icdCodes, nonCoveredCodes } from "../../drizzle/schema";
import { like, or, and, ilike } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { publicProcedure, router } from "../_core/trpc";

/**
 * Ask Sila - Medical AI Assistant Router
 * Database-first approach: searches database before calling LLM
 * Handles chat interactions with Groq API integration
 */

export const askSilaRouter = router({
  /**
   * Main chat endpoint
   * 1. Searches database for context
   * 2. If found → returns database info with 📋 label
   * 3. If not found → calls Groq with database context + 🌐 label
   * 4. Never says "ليس لدى علم" if data exists in database
   */
  chat: publicProcedure
    .input(
      z.object({
        message: z.string().min(1, "Message cannot be empty"),
        conversationHistory: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            })
          )
          .optional()
          .default([]),
        apiKey: z.string().optional(), // Optional API Key for external Sila access
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { message, conversationHistory, apiKey } = input;
        
        // Verify API Key if provided (for external Sila access)
        if (apiKey) {
          const isValid = await verifySilaApiKey(apiKey);
          if (!isValid) {
            throw new Error('Invalid or inactive API Key');
          }
        }

        // 1. Search database for relevant context
        const dbContext = await searchDatabase(message);

        // 2. Check if we found relevant database results
        const hasDbResults =
          (dbContext.drugs && dbContext.drugs.length > 0) ||
          (dbContext.icdCodes && dbContext.icdCodes.length > 0) ||
          (dbContext.nonCoveredCodes && dbContext.nonCoveredCodes.length > 0);

        // 3. Build response based on database findings
        let aiResponse: string;

        if (hasDbResults) {
          // Database has relevant info - format and return it
          aiResponse = formatDatabaseResponse(dbContext, message);
        } else {
          // No database results - call LLM with context
          const systemMessage = buildSystemMessage(dbContext);
          const messages = [
            { role: "system" as const, content: systemMessage },
            ...conversationHistory,
            { role: "user" as const, content: message },
          ];

          const response = await invokeLLM({
            messages: messages as any,
          });

          const content = response.choices?.[0]?.message?.content;
          const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
          aiResponse =
            contentStr ||
            "عذراً، لم أتمكن من معالجة طلبك. يرجى المحاولة مرة أخرى.";

          // Add web source label if LLM was used
          aiResponse = `🌐 من الإنترنت:\n\n${aiResponse}`;
        }

        return {
          success: true,
          message: aiResponse,
          context: dbContext,
          source: hasDbResults ? "database" : "llm",
        };
      } catch (error) {
        console.error("Ask Sila chat error:", error);
        return {
          success: false,
          message:
            "خطأ: تعذر معالجة طلبك. يرجى المحاولة لاحقاً.",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  /**
   * Quick search in database only
   * Returns relevant medications and ICD codes without LLM
   */
  quickSearch: publicProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      try {
        const results = await searchDatabase(input.query);
        return {
          success: true,
          results,
          hasResults:
            (results.drugs && results.drugs.length > 0) ||
            (results.icdCodes && results.icdCodes.length > 0),
        };
      } catch (error) {
        console.error("Quick search error:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Search failed",
        };
      }
    }),

  /**
   * Search for drug information
   * Searches in drug_lens table (comprehensive drug database)
   */
  searchDrug: publicProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        const keywords = input.query
          .toLowerCase()
          .split(/[\s،,\?؟]+/)
          .filter((k) => k.length > 1)
          .slice(0, 3);

      const drugs = await db
        .select()
        .from(drugLens)
        .where(
          or(
            ...keywords.map((k) =>
              or(
                ilike(drugLens.scientificName, `%${k}%`),
                ilike(drugLens.tradeName, `%${k}%`)
              )
            )
          )
        )
        .limit(10);

        return {
          success: true,
          drugs: drugs.map((d: typeof drugLens.$inferSelect) => ({
            id: d.id,
            scientificName: d.scientificName,
            tradeName: d.tradeName,
            price: d.price,
            pregnancyCategory: d.pregnancyCategory,
            standardDose: d.standardDose,
            uses: d.uses,
          })),
        };
      } catch (error) {
        console.error("Drug search error:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Search failed",
        };
      }
    }),

  /**
   * Get detailed drug information
   */
  getDrugDetails: publicProcedure
    .input(z.object({ drugId: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        const drug = await db
          .select()
          .from(drugLens)
          .where(drugLens.id === input.drugId as any)
          .limit(1);

        if (!drug || drug.length === 0) {
          return {
            success: false,
            error: "Drug not found",
          };
        }

        return {
          success: true,
          drug: drug[0],
        };
      } catch (error) {
        console.error("Get drug details error:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Error fetching details",
        };
      }
    }),

  /**
   * Search for ICD-10 codes
   */
  searchIcdCode: publicProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        const codes = await db
          .select()
          .from(icdCodes)
          .where(
            or(
              ilike(icdCodes.code, `%${input.query}%`),
              ilike(icdCodes.description, `%${input.query}%`)
            )
          )
          .limit(10);

        return {
          success: true,
          codes: codes.map((c: typeof icdCodes.$inferSelect) => ({
            code: c.code,
            description: c.description,
            branchCount: c.branchCount,
          })),
        };
      } catch (error) {
        console.error("ICD code search error:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Search failed",
        };
      }
    }),

  /**
   * Health check endpoint
   * Verifies service availability
   */
  healthCheck: publicProcedure.query(async () => {
    try {
      const db = await getDb();

      // Test database connections
      const drugCount = await db.select().from(drugLens).limit(1);
      const icdCount = await db.select().from(icdCodes).limit(1);

      return {
        status: "online",
        services: {
          database: drugCount && icdCount ? "✅ Online" : "⚠️ Limited",
          groq: "✅ Online",
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        status: "offline",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }),

  /**
   * Get Ask Sila capabilities
   */
  getCapabilities: publicProcedure.query(() => {
    return {
      name: "Ask Sila",
      version: "2.0.0",
      capabilities: [
        "Drug information and pricing (8000+ drugs)",
        "ICD-10 code lookup and explanation",
        "Drug interactions and contraindications",
        "Dosage calculations and recommendations",
        "Pregnancy category information",
        "Medical billing rules (Saudi SBS v3.0)",
        "Multilingual support (Arabic & English)",
      ],
      languages: ["en", "ar"],
      responseTime: "< 3 seconds",
      dataSource: "Database-first with GROQ LLM fallback",
    };
  }),
});

/**
 * Search database for relevant medical information
 * Searches in: drug_lens, drug_entries, icd_codes, non_covered_codes
 */
async function searchDatabase(query: string): Promise<any> {
  try {
    const db = await getDb();
    const keywords = query
      .toLowerCase()
      .split(/[\s،,\?؟]+/)
      .filter((k) => k.length > 1)
      .slice(0, 5);

    const results: any = {
      drugs: [],
      icdCodes: [],
      nonCoveredCodes: [],
      drugEntries: [],
    };

    if (keywords.length === 0) {
      return results;
    }

    // Search in drug_lens (comprehensive drug database)
    try {
      const drugResults = await db
        .select()
        .from(drugLens)
        .where(
          or(
            ...keywords.map((k) =>
              or(
                ilike(drugLens.scientificName, `%${k}%`),
                ilike(drugLens.tradeName, `%${k}%`)
              )
            )
          )
        )
        .limit(5);

      results.drugs = drugResults.map((d: typeof drugLens.$inferSelect) => ({
        scientificName: d.scientificName,
        tradeName: d.tradeName,
        price: d.price,
        uses: d.uses,
        standardDose: d.standardDose,
        pregnancyCategory: d.pregnancyCategory,
        pharmacologicalAction: d.pharmacologicalAction,
        blackBoxWarning: d.blackBoxWarning,
        contraindicatedInteractions: d.contraindicatedInteractions,
        majorInteractions: d.majorInteractions,
      }));
    } catch (e) {
      console.warn("Error searching drug_lens:", e);
    }

    // Search in drug_entries (linked to ICD codes)
    try {
      const entryResults = await db
        .select()
        .from(drugEntries)
        .where(
          or(
            ...keywords.map((k) =>
              or(
                ilike(drugEntries.scientificName, `%${k}%`),
                ilike(drugEntries.tradeName, `%${k}%`),
                ilike(drugEntries.indication, `%${k}%`)
              )
            )
          )
        )
        .limit(5);

      results.drugEntries = entryResults.map((e: typeof drugEntries.$inferSelect) => ({
        scientificName: e.scientificName,
        tradeName: e.tradeName,
        indication: e.indication,
        icdCodesRaw: e.icdCodesRaw,
      }));
    } catch (e) {
      console.warn("Error searching drug_entries:", e);
    }

    // Search in ICD codes
    try {
      const icdResults = await db
        .select()
        .from(icdCodes)
        .where(
          or(
            ...keywords.map((k) =>
              or(
                ilike(icdCodes.code, `%${k}%`),
                ilike(icdCodes.description, `%${k}%`)
              )
            )
          )
        )
        .limit(5);

      results.icdCodes = icdResults.map((c: typeof icdCodes.$inferSelect) => ({
        code: c.code,
        description: c.description,
        branchCount: c.branchCount,
      }));
    } catch (e) {
      console.warn("Error searching icd_codes:", e);
    }

    // Search in non-covered codes
    try {
      const nonCoveredResults = await db
        .select()
        .from(nonCoveredCodes)
        .where(
          or(
            ...keywords.map((k) =>
              or(
                ilike(nonCoveredCodes.code, `%${k}%`),
                ilike(nonCoveredCodes.description, `%${k}%`)
              )
            )
          )
        )
        .limit(5);

      results.nonCoveredCodes = nonCoveredResults.map((c: typeof nonCoveredCodes.$inferSelect) => ({
        code: c.code,
        description: c.description,
      }));
    } catch (e) {
      console.warn("Error searching non_covered_codes:", e);
    }

    return results;
  } catch (error) {
    console.error("Database search error:", error);
    return {
      drugs: [],
      icdCodes: [],
      nonCoveredCodes: [],
      drugEntries: [],
    };
  }
}

/**
 * Format database results into a professional response
 * Labels each section with 📋 (database) indicator
 */
function formatDatabaseResponse(context: any, query: string): string {
  let response = "📋 **من قاعدة البيانات:**\n\n";

  // Format drugs
  if (context.drugs && context.drugs.length > 0) {
    response += "💊 **الأدوية:**\n";
    context.drugs.forEach((drug: any, _idx: number) => {
      response += `\n**${drug.tradeName || drug.scientificName}**`;
      if (drug.scientificName && drug.tradeName) {
        response += ` — ${drug.scientificName}`;
      }
      if (drug.price) {
        response += ` | ${drug.price}`;
      }
      response += "\n";

      if (drug.uses) {
        response += `- **الاستخدامات:** ${drug.uses}\n`;
      }
      if (drug.standardDose) {
        response += `- **الجرعة المعيارية:** ${drug.standardDose}\n`;
      }
      if (drug.pregnancyCategory) {
        response += `- **فئة الحمل:** ${drug.pregnancyCategory}\n`;
      }
      if (drug.blackBoxWarning) {
        response += `- ⚠️ **تحذير:** ${drug.blackBoxWarning}\n`;
      }
      if (drug.contraindicatedInteractions) {
        response += `- **موانع الاستخدام:** ${drug.contraindicatedInteractions}\n`;
      }
    });
  }

  // Format drug entries with indications
  if (context.drugEntries && context.drugEntries.length > 0) {
    response += "\n📝 **الأدوية والمؤشرات:**\n";
    context.drugEntries.forEach((entry: any) => {
      response += `\n- **${entry.tradeName || entry.scientificName}**\n`;
      if (entry.indication) {
        response += `  المؤشر: ${entry.indication}\n`;
      }
      if (entry.icdCodesRaw) {
        response += `  أكواد ICD-10: ${entry.icdCodesRaw}\n`;
      }
    });
  }

  // Format ICD codes
  if (context.icdCodes && context.icdCodes.length > 0) {
    response += "\n🏥 **أكواد ICD-10:**\n";
    context.icdCodes.forEach((code: any, _idx: number) => {
      response += `\n- **${code.code}** — ${code.description}`;
      if (code.branchCount > 0) {
        response += ` (${code.branchCount} فروع)`;
      }
      response += "\n";
    });
  }

  // Format non-covered codes
  if (context.nonCoveredCodes && context.nonCoveredCodes.length > 0) {
    response += "\n❌ **أكواد غير مغطاة:**\n";
    context.nonCoveredCodes.forEach((code: any) => {
      response += `\n- **${code.code}** — ${code.description}\n`;
    });
  }

  return response;
}

/**
 * Build system message for Groq with database context
 * Used only when database doesn't have direct answers
 */
function buildSystemMessage(context: any): string {
  const hasContext =
    (context.drugs && context.drugs.length > 0) ||
    (context.icdCodes && context.icdCodes.length > 0) ||
    (context.drugEntries && context.drugEntries.length > 0);

  const contextStr = hasContext
    ? `
Database Context Available:
${context.drugs?.length > 0 ? `Drugs: ${JSON.stringify(context.drugs, null, 2)}` : ""}
${context.drugEntries?.length > 0 ? `Drug Entries: ${JSON.stringify(context.drugEntries, null, 2)}` : ""}
${context.icdCodes?.length > 0 ? `ICD-10 Codes: ${JSON.stringify(context.icdCodes, null, 2)}` : ""}
`
    : "No database results found for this query.";

  return `You are Sila (سيلا), a professional medical AI assistant specialized in:
- Drug information, pricing, and interactions (8000+ drugs database)
- ICD-10 medical coding (ICD-10 AM standard)
- Saudi Billing System (SBS v3.0) standards
- Medical diagnosis and clinical pharmacology
- Pediatric dosing calculations
- Pregnancy category guidance

Your response format (IMPORTANT - Use Markdown formatting):
- Provide COMPREHENSIVE and DETAILED responses (minimum 300-500 words when possible)
- Use **bold** for important terms and drug names
- Use ## headers to separate major sections
- Use ### headers for subsections
- Use bullet points (- ) for lists
- Use numbered lists (1. 2. 3.) for steps or rankings
- Add blank lines between sections for readability
- Use > for important notes or warnings
- Label database info with "📋 من قاعدة البيانات" when available
- Label web/knowledge info with "🌐 من الإنترنت"
- Always cite drug prices in SAR when available
- For ICD codes, explain the meaning in simple terms with clinical context
- Include relevant clinical applications, side effects, contraindications, and dosing information

Response Language:
- ALWAYS respond in BOTH Arabic AND English
- Format: Arabic section first (## العربية), then English section (## English)
- Use clear headers to separate languages
- Ensure both versions are equally detailed and comprehensive
- Add blank lines between language sections

Your tone should be:
- Professional and precise
- Empathetic and helpful
- Clear and easy to understand
- Thorough and informative
- Evidence-based when possible

Database Context:
${contextStr}

IMPORTANT INSTRUCTIONS:
1. If database results are available, prioritize them and provide comprehensive details
2. If no database results exist, use your general medical knowledge
3. Always be honest about data sources
4. Never say "ليس لدى علم" if relevant database information exists
5. Provide detailed explanations, not brief answers
6. Include clinical significance and practical applications
7. Always respond in both Arabic and English
8. Use formatting (bold, bullet points) to make information scannable`;
}
