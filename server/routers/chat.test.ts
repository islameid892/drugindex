import { describe, it, expect, vi, beforeEach } from "vitest";
import { chatRouter } from "./chat";
import { invokeLLM } from "../_core/llm";

// Mock the dependencies
vi.mock("../_core/llm");
vi.mock("../db", () => ({
  getDb: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([
      {
        code: "M23",
        description: "Unspecified internal derangement of knee",
      },
    ]),
  })),
}));

describe("Chat Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendMessage", () => {
    it("should send a message and get a response", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: "This is a test response about ICD codes.",
            },
          },
        ],
      };

      vi.mocked(invokeLLM).mockResolvedValueOnce(mockResponse as any);

      const caller = chatRouter.createCaller({} as any);

      const result = await caller.sendMessage({
        message: "What is ICD code M23?",
        conversationHistory: [],
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe("This is a test response about ICD codes.");
      expect(invokeLLM).toHaveBeenCalled();
    });

    it("should handle conversation history", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: "Following up on your previous question...",
            },
          },
        ],
      };

      vi.mocked(invokeLLM).mockResolvedValueOnce(mockResponse as any);

      const caller = chatRouter.createCaller({} as any);

      const result = await caller.sendMessage({
        message: "Tell me more",
        conversationHistory: [
          {
            role: "user",
            content: "What is ICD code M23?",
          },
          {
            role: "assistant",
            content: "M23 is about knee derangement.",
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe("Following up on your previous question...");
    });

    it("should handle errors gracefully", async () => {
      vi.mocked(invokeLLM).mockRejectedValueOnce(
        new Error("LLM service unavailable")
      );

      const caller = chatRouter.createCaller({} as any);

      const result = await caller.sendMessage({
        message: "What is ICD code M23?",
        conversationHistory: [],
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("خطأ");
    });

    it("should validate message length", async () => {
      const caller = chatRouter.createCaller({} as any);

      try {
        await caller.sendMessage({
          message: "", // Empty message
          conversationHistory: [],
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
      }
    });

    it("should include database context in system prompt", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: "Response with database context",
            },
          },
        ],
      };

      vi.mocked(invokeLLM).mockResolvedValueOnce(mockResponse as any);

      const caller = chatRouter.createCaller({} as any);

      await caller.sendMessage({
        message: "What codes are available?",
        conversationHistory: [],
      });

      const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
      const systemMessage = callArgs.messages[0];

      expect(systemMessage.role).toBe("system");
      expect(systemMessage.content).toContain("ICD-10");
      expect(systemMessage.content).toContain("Bupa");
    });

    it("should handle missing LLM response", async () => {
      vi.mocked(invokeLLM).mockResolvedValueOnce({
        choices: [{ message: { content: null } }],
      } as any);

      const caller = chatRouter.createCaller({} as any);

      const result = await caller.sendMessage({
        message: "Test message",
        conversationHistory: [],
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("عذراً");
    });
  });
});
