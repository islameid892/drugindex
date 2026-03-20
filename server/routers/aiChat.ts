import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const aiChatRouter = router({
  sendMessage: publicProcedure
    .input(
      z.object({
        messages: z.array(
          z.object({
            role: z.enum(["user", "assistant", "system"]),
            content: z.string(),
          })
        ),
        model: z.string().optional().default("gpt-4o-mini"),
        temperature: z.number().optional().default(0.7),
        max_tokens: z.number().optional().default(500),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Call the mse_ai_api server
        const response = await fetch("http://localhost:7777/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer change-secret-key-2026",
          },
          body: JSON.stringify({
            messages: input.messages,
            model: input.model,
            temperature: input.temperature,
            max_tokens: input.max_tokens,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("mse_ai_api error:", errorText);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to get AI response: ${response.status}`,
          });
        }

        const data = await response.json();
        return {
          success: true,
          content: data.choices?.[0]?.message?.content || "No response",
          data: data,
        };
      } catch (error) {
        console.error("AI Chat Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to connect to AI service",
        });
      }
    }),
});
