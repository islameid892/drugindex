import { useState, useEffect } from "react";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function Chat() {
  const [, navigate] = useLocation();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content: `You are Sila, a helpful medical information assistant for an ICD-10 search engine and Bupa prerequisites database.

Your role is to help users find information about:
1. ICD-10 medical codes and their meanings
2. Medical conditions and diagnoses
3. Bupa insurance prerequisites and requirements for medical services
4. Medications and their indications

Important guidelines:
- Always use ICD-10 AM codes exclusively
- Provide accurate, evidence-based medical information
- When discussing prerequisites, reference the Bupa database
- Format responses with clear structure using markdown (bold, bullets, etc.)
- Allow for detailed responses when questions require comprehensive answers
- If you don't have specific information, be honest about it

You have access to a comprehensive medical database with ICD-10 codes, medications, and Bupa insurance prerequisites. Use this knowledge to provide helpful and accurate responses.`,
    },
    {
      role: "assistant",
      content: `مرحباً! 👋 أنا سيلا، مساعدك الطبي الذكي.

يمكنني مساعدتك في:
- 🔍 البحث عن أكواد ICD-10 الطبية وشرح معانيها
- 💊 معلومات عن الأدوية والحالات الطبية
- 📋 متطلبات Bupa للخدمات الطبية
- 📚 معلومات طبية دقيقة وموثوقة

جرب أسئلة مثل:
- "ما هو الكود M23؟"
- "ما هي متطلبات Bupa للعلاج الطبيعي؟"
- "ابحث عن أكواد الآلام في الظهر"

كيف يمكنني مساعدتك؟`,
    },
  ]);

  const chatMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: (response: any) => {
      if (response.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: response.message,
          },
        ]);
      } else {
        toast.error("حدث خطأ في معالجة الرسالة");
      }
    },
    onError: (error: any) => {
      console.error("Chat error:", error);
      toast.error("فشل الاتصال بـ Sila. حاول مرة أخرى.");
    },
  });

  const handleSendMessage = (content: string) => {
    // Add user message
    const userMessage: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMessage]);

    // Send to backend (filter out system messages)
    const filteredHistory = messages
      .filter((m) => m.role !== "system")
      .map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    chatMutation.mutate({
      message: content,
      conversationHistory: filteredHistory,
    });
  };

  const suggestedPrompts = [
    "ما هو الكود M23؟",
    "ما هي متطلبات Bupa للعلاج الطبيعي؟",
    "ابحث عن أكواد الآلام في الظهر",
    "شرح الفرق بين E11 و E10",
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container h-16 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Sila - المساعد الطبي الذكي</h1>
            <p className="text-sm text-muted-foreground">
              اسأل عن الأكواد الطبية والمتطلبات
            </p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 container py-6">
        <AIChatBox
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={chatMutation.isPending}
          placeholder="اسأل عن الأكواد الطبية أو متطلبات Bupa..."
          height="calc(100vh - 200px)"
          emptyStateMessage="ابدأ محادثة مع Sila"
          suggestedPrompts={suggestedPrompts}
        />
      </div>

      {/* Footer Info */}
      <div className="border-t border-border bg-muted/50 py-4">
        <div className="container text-center text-sm text-muted-foreground">
          <p>
            Sila يستخدم قاعدة بيانات ICD-10 الشاملة ومتطلبات Bupa لتقديم
            معلومات دقيقة
          </p>
        </div>
      </div>
    </div>
  );
}
