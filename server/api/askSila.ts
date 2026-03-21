import { Router } from "express";
import { getDb } from "../db";
import { drugEntries, icdCodes } from "../../drizzle/schema";
import { like } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

const router = Router();

/**
 * POST /api/askSila/chat
 * Main chat endpoint - search database and call Groq API
 */
router.post("/chat", async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Invalid input: message is required and must be a string",
      });
    }

    // 1. Search database for relevant context
    const searchTerms = message.split(" ").filter((w) => w.length > 2).slice(0, 3);
    let dbContext = "";

    if (searchTerms.length > 0) {
      const db = await getDb();
      // Search drugs
      const drugs = await db
        .select()
        .from(drugEntries)
        .where(like(drugEntries.scientificName, `%${searchTerms[0]}%`))
        .limit(5);

      // Search ICD codes
      const codes = await db
        .select()
        .from(icdCodes)
        .where(like(icdCodes.description, `%${searchTerms[0]}%`))
        .limit(5);

      if (drugs.length > 0 || codes.length > 0) {
        dbContext = `
Database Results:
${drugs.length > 0 ? `Drugs: ${JSON.stringify(drugs.slice(0, 3))}` : ""}
${codes.length > 0 ? `ICD Codes: ${JSON.stringify(codes.slice(0, 3))}` : ""}
`;
      }
    }

    // 2. Prepare messages for Groq
    const systemMessage = `You are Ask Sila, a medical AI assistant specialized in ICD-10 coding, medical informatics, and Saudi Billing System (SBS v3.0) standards.

Your expertise includes:
- ICD-10 medical coding and classification
- Medical conditions and diagnoses
- Billing and healthcare regulations
- Medication information and drug interactions

${dbContext ? `Here is relevant database information:\n${dbContext}` : ""}

Guidelines:
- Answer in the same language as the user (Arabic or English)
- Be professional, precise, and empathetic
- If you find relevant data in the database, use it to provide accurate answers
- If no database match is found, use your medical knowledge to suggest the most likely codes or information
- Always cite data sources when available
- For billing questions, reference SBS v3.0 standards when applicable`;

    const messages = [
      { role: "system" as const, content: systemMessage },
      ...conversationHistory,
      { role: "user" as const, content: message },
    ];

    // 3. Call Groq API
    const response = await invokeLLM({
      messages: messages as any,
    });

    const assistantMessage =
      response.choices?.[0]?.message?.content || "Unable to generate response";

    // 4. Return response
    res.json({
      message: assistantMessage,
      conversationHistory: [
        ...conversationHistory,
        { role: "user", content: message },
        { role: "assistant", content: assistantMessage },
      ],
    });
  } catch (error) {
    console.error("Ask Sila error:", error);
    res.status(500).json({
      error: "Failed to process request",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/askSila/health
 * Health check endpoint
 */
router.get("/health", (req, res) => {
  res.json({ status: "online", service: "Ask Sila" });
});

export default router;
