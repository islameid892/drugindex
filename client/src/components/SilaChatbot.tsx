import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function SilaChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "مرحباً! أنا سيلا، مساعدتك الافتراضية. كيف يمكنني مساعدتك اليوم؟ يمكنك السؤال عن أي شيء يتعلق بالموقع أو الأكواد الطبية.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Call mse_ai_api
      const response = await fetch("http://localhost:7777/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer change-secret-key-2026",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `أنت سيلا، مساعدة افتراضية ودية متخصصة في موقع ICD-10 Search Engine. 
              الموقع يوفر:
              - البحث عن الأدوية والعقاقير الطبية
              - البحث عن أكواز ICD-10 الطبية
              - البحث عن الحالات الطبية والتشخيصات
              - التحقق من الأكواز غير المغطاة بالتأمين السعودي
              - أدوات مساعدة مثل تحويل الصور إلى PDF ودمج ملفات PDF
              
              أجب على أسئلة المستخدمين بشكل ودي ومفيد. إذا كان السؤال عن الموقع، ساعد المستخدم.
              إذا كان السؤال عن معلومات طبية عامة، يمكنك الإجابة بشكل عام.
              رد باللغة العربية دائماً.`,
            },
            ...messages.map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
            {
              role: "user",
              content: input,
            },
          ],
          model: "gpt-4o-mini",
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          data.choices?.[0]?.message?.content ||
          "عذراً، حدث خطأ في الحصول على الرد. يرجى المحاولة لاحقاً.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error calling mse_ai_api:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "عذراً، حدث خطأ في الاتصال بخدمة الذكاء الاصطناعي. يرجى التأكد من أن الخادم يعمل بشكل صحيح.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button - Simple Text Label */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-full bg-gradient-to-br from-sky-500 to-sky-600 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group text-white font-bold text-sm"
        title="سيلا - مساعدتك الافتراضية"
      >
        {isOpen ? "✕" : "💬 سيلا"}
      </button>

      {/* Chatbot Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-96 max-w-[calc(100vw-2rem)] h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col border border-sky-100">
          {/* Header */}
          <div className="bg-gradient-to-r from-sky-500 to-sky-600 text-white p-4 rounded-t-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-white bg-white/20 flex items-center justify-center flex-shrink-0 text-lg">
              🤖
            </div>
            <div>
              <h3 className="font-bold">سيلا</h3>
              <p className="text-xs text-sky-100">مساعدتك الافتراضية</p>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    message.role === "user"
                      ? "bg-sky-500 text-white rounded-br-none"
                      : "bg-white text-slate-900 border border-sky-100 rounded-bl-none"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.role === "user"
                        ? "text-sky-100"
                        : "text-slate-400"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString("ar-SA", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-slate-900 border border-sky-100 px-4 py-2 rounded-lg rounded-bl-none flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
                  <span className="text-sm">جاري الكتابة...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form
            onSubmit={handleSendMessage}
            className="border-t border-sky-100 p-4 bg-white rounded-b-2xl"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اكتب سؤالك هنا..."
                disabled={isLoading}
                className="flex-1 px-3 py-2 border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-100"
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                size="sm"
                className="bg-sky-500 hover:bg-sky-600 text-white"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
