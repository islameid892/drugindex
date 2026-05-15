import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { icdCodes, bupaPrerequisites } from "../../drizzle/schema";
import { sql } from "drizzle-orm";

/**
 * Chat router for AI-powered medical information retrieval
 * Uses LLM (Sila) to answer questions about ICD codes, medications, and Bupa prerequisites
 */
export const chatRouter = router({
  /**
   * Send a message to the AI chat and get a response
   * The AI has context about ICD codes and Bupa prerequisites from the database
   */
  sendMessage: publicProcedure
    .input(
      z.object({
        message: z.string().min(1).max(2000),
        conversationHistory: z.array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          })
        ).optional().default([]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        
        // Get sample ICD codes for context (limit to avoid token overflow)
        let sampleCodes: any[] = [];
        try {
          sampleCodes = await db
            .select({
              code: icdCodes.code,
              description: icdCodes.description,
            })
            .from(icdCodes)
            .limit(30);
        } catch (e) {
          console.error("Error fetching ICD codes:", e);
        }

        // Get sample Bupa prerequisites for context
        let sampleBupa: any[] = [];
        try {
          sampleBupa = await db
            .select({
              serviceName: bupaPrerequisites.serviceName,
              icdCodes: bupaPrerequisites.icdCodes,
            })
            .from(bupaPrerequisites)
            .limit(15);
        } catch (e) {
          console.error("Error fetching Bupa prerequisites:", e);
        }

        // Build context for the AI
        const systemPrompt = `أنت سيلا، مساعد طبي ذكي متخصص في قاعدة بيانات ICD-10 ومتطلبات Bupa.

دورك هو مساعدة المستخدمين في:
1. البحث عن أكواد ICD-10 الطبية وشرح معانيها
2. معلومات عن الحالات الطبية والتشخيصات
3. متطلبات Bupa للخدمات الطبية
4. معلومات عن الأدوية والمؤشرات الطبية

إرشادات مهمة:
- استخدم أكواد ICD-10 AM حصراً
- قدم معلومات طبية دقيقة وموثوقة
- عند مناقشة المتطلبات، أشر إلى قاعدة بيانات Bupa
- صيغ الإجابات بوضوح باستخدام Markdown (غامق، نقاط، إلخ)
- اسمح بإجابات مفصلة عندما تتطلب الأسئلة إجابات شاملة
- إذا لم تكن لديك معلومات محددة، كن صريحاً بشأنها

قاعدة البيانات المتاحة:

أكواد ICD-10 (عينة):
${sampleCodes.map((c: any) => `- ${c.code}: ${c.description}`).join('\n')}

خدمات Bupa (عينة):
${sampleBupa.map((b: any) => `- ${b.serviceName} (الأكواد: ${b.icdCodes})`).join('\n')}

استخدم هذه المعلومات لتقديم إجابات دقيقة ومفيدة.`;

        // Prepare messages for LLM
        const messages: any[] = [
          { role: "system", content: systemPrompt },
          ...input.conversationHistory.map(msg => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          })),
          { role: "user", content: input.message },
        ];

        // Call LLM (Sila)
        const response = await invokeLLM({
          messages: messages as any,
        });

        const assistantMessage = response.choices?.[0]?.message?.content || 
          "عذراً، لم أتمكن من معالجة طلبك. يرجى المحاولة مرة أخرى.";

        return {
          success: true,
          message: assistantMessage,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("Chat error:", error);
        return {
          success: false,
          message: "عذراً، حدث خطأ في معالجة طلبك. يرجى المحاولة مرة أخرى.",
          timestamp: new Date(),
        };
      }
    }),
});
