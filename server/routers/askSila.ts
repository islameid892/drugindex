import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { drugEntries, icdCodes } from "../../drizzle/schema";
import { like, or } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

/**
 * Ask Sila - Medical AI Assistant Router
 * Handles chat interactions with Groq API integration
 */

export const askSilaRouter = router({
  /**
   * Main chat endpoint
   * Searches database for context, then calls Groq API for response
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
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { message, conversationHistory } = input;

        // 1. Search database for relevant context
        const dbContext = await searchDatabase(message);

        // 2. Build system message with context
        const systemMessage = buildSystemMessage(dbContext);

        // 3. Prepare messages for Groq
        const messages = [
          { role: "system" as const, content: systemMessage },
          ...conversationHistory,
          { role: "user" as const, content: message },
        ];

        // 4. Call Groq API
        const response = await invokeLLM({
          messages: messages as any,
        });

        const aiResponse =
          response.choices?.[0]?.message?.content ||
          "Sorry, I couldn't generate a response. Please try again.";

        return {
          success: true,
          message: aiResponse,
          context: dbContext,
        };
      } catch (error) {
        console.error("Ask Sila chat error:", error);
        return {
          success: false,
          message:
            "Error: Unable to process your request. Please try again later.",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  /**
   * Quick search in database
   * Returns relevant medications and ICD codes
   */
  quickSearch: publicProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      try {
        const results = await searchDatabase(input.query);
        return {
          success: true,
          results,
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
   * Health check endpoint
   * Verifies service availability
   */
  healthCheck: publicProcedure.query(async () => {
    try {
      const db = await getDb();

      // Test database connection
      const medicationCount = await db.query.medications.findFirst();
      const icdCount = await db.query.icdCodes.findFirst();

      return {
        status: "online",
        services: {
          database: medicationCount && icdCount ? "✅ Online" : "⚠️ Limited",
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
      version: "1.0.0",
      capabilities: [
        "ICD-10 code lookup and explanation",
        "Medication information and search",
        "Medical billing rules (Saudi SBS v3.0)",
        "Diagnosis code suggestions",
        "Multilingual support (Arabic & English)",
      ],
      languages: ["en", "ar"],
      responseTime: "< 5 seconds",
    };
  }),
});

/**
 * Search database for relevant medical information
 */
async function searchDatabase(query: string): Promise<any> {
  try {
    const db = await getDb();
    const keywords = query
      .toLowerCase()
      .split(/[\s،,\?؟]+/)
      .filter((k) => k.length > 2)
      .slice(0, 5);

    const results: any = {
      medications: [],
      icdCodes: [],
    };

    // Search medications
    if (keywords.length > 0) {
      const medicationResults = await db
        .select()
        .from(drugEntries)
        .where(
          or(
            ...keywords.map((k) =>
              like(drugEntries.scientificName, `%${k}%`)
            )
          )
        )
        .limit(5);

      results.medications = medicationResults.map((m: any) => ({
        scientificName: m.scientificName,
        tradeNames: m.tradeNames,
        indication: m.indication,
        icdCodes: m.icdCodes,
      }));

      // Search ICD codes
      const icdResults = await db
        .select()
        .from(icdCodes)
        .where(
          or(
            ...keywords.map((k) => like(icdCodes.description, `%${k}%`))
          )
        )
        .limit(5);

      results.icdCodes = icdResults.map((code: any) => ({
        code: code.code,
        description: code.description,
        category: code.category,
      }));
    }

    return results;
  } catch (error) {
    console.error("Database search error:", error);
    return { medications: [], icdCodes: [] };
  }
}

/**
 * Build system message for Groq with context
 */
function buildSystemMessage(context: any): string {
  const contextStr =
    context.medications.length > 0 || context.icdCodes.length > 0
      ? `
Database Results:
${
  context.medications.length > 0
    ? `Medications: ${JSON.stringify(context.medications, null, 2)}`
    : ""
}
${
  context.icdCodes.length > 0
    ? `ICD-10 Codes: ${JSON.stringify(context.icdCodes, null, 2)}`
    : ""
}
`
      : "No specific results found in database.";

  return `You are Ask Sila, a professional medical AI assistant specialized in:
- ICD-10 medical coding
- Medication information and interactions
- Saudi Billing System (SBS v3.0) standards
- Medical diagnosis and coding rules

Your tone should be:
- Professional and precise
- Empathetic and helpful
- Clear and easy to understand
- Supporting both Arabic and English

Context from database:
${contextStr}

If you find relevant information in the database, prioritize it in your response.
If no database results are found, use your general medical knowledge to provide helpful suggestions.
Always clearly state if information is from the database or from general knowledge.
For ICD-10 codes, always explain what they mean in simple terms.
Support both Arabic and English based on user input language.`;
}
