import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  source?: "database" | "llm";
}

export default function SilaChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosed, setIsClosed] = useState(() => {
    // Check localStorage to see if user closed the chatbot
    if (typeof window !== 'undefined') {
      return localStorage.getItem('silaChatbotClosed') === 'true';
    }
    return false;
  });
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "مرحباً! أنا سيلا، مساعدتك الافتراضية. كيف يمكنني مساعدتك اليوم؟ يمكنك السؤال عن الأدوية والأكواد الطبية والتغطية التأمينية.",
      timestamp: new Date(),
      source: "database",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // tRPC mutation for chat
  const chatMutation = trpc.askSila.chat.useMutation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleClose = () => {
    setIsClosed(true);
    localStorage.setItem('silaChatbotClosed', 'true');
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
      // Prepare conversation history for context
      const conversationHistory = messages
        .filter((msg) => msg.role !== "assistant" || msg.source === "database")
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

      // Call tRPC askSila.chat endpoint
      const response = await chatMutation.mutateAsync({
        message: input,
        conversationHistory: conversationHistory,
      });

      if (response.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: response.message,
          timestamp: new Date(),
          source: response.source as "database" | "llm",
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: response.message || "عذراً، حدث خطأ في معالجة طلبك. يرجى المحاولة لاحقاً.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Error calling askSila.chat:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "عذراً، حدث خطأ في الاتصال بخدمة المساعد الافتراضي. يرجى التأكد من اتصالك بالإنترنت والمحاولة لاحقاً.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if user closed the chatbot
  if (isClosed) {
    return null;
  }

  return (
    <>
      {/* Floating Action Button - Simple Text Label */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-full bg-gradient-to-br from-sky-500 to-sky-600 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group text-white font-bold text-sm hover:scale-110"
        title="سيلا - مساعدتك الافتراضية"
      >
        {isOpen ? "✕" : "💬 سيلا"}
      </button>

      {/* Chatbot Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-96 max-w-[calc(100vw-2rem)] h-[600px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col border border-sky-100 dark:border-sky-800">
          {/* Header */}
          <div className="bg-gradient-to-r from-sky-500 to-sky-600 dark:from-sky-700 dark:to-sky-800 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-white bg-white/20 flex items-center justify-center flex-shrink-0 text-lg">
                🤖
              </div>
              <div>
                <h3 className="font-bold">سيلا</h3>
                <p className="text-xs text-sky-100">مساعدتك الافتراضية</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 p-1 rounded-lg transition-colors"
                title="تصغير الشات"
              >
                <X className="h-5 w-5" />
              </button>
              <button
                onClick={handleClose}
                className="text-white hover:bg-red-500/30 p-1 rounded-lg transition-colors"
                title="إغلاق نهائياً (اضغط Reload لإعادة الفتح)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-800">
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
                      : "bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-sky-100 dark:border-sky-700 rounded-bl-none"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p
                      className={`text-xs ${
                        message.role === "user"
                          ? "text-sky-100"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString("ar-SA", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {message.source && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300">
                        {message.source === "database" ? "📋 قاعدة البيانات" : "🌐 الإنترنت"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-sky-100 dark:border-sky-700 px-4 py-2 rounded-lg rounded-bl-none flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
                  <span className="text-sm">جاري الكتابة...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Close Permanently Button */}
          <div className="px-4 py-2 bg-slate-100 dark:bg-slate-700 border-t border-sky-100 dark:border-sky-800 text-center">
            <button
              onClick={handleClose}
              className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold"
            >
              ✕ إغلاق نهائياً (حتى إعادة تحميل الموقع)
            </button>
          </div>

          {/* Input Area */}
          <form
            onSubmit={handleSendMessage}
            className="border-t border-sky-100 dark:border-sky-800 p-4 bg-white dark:bg-slate-900 rounded-b-2xl"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اكتب سؤالك هنا..."
                disabled={isLoading}
                className="flex-1 px-3 py-2 border border-sky-200 dark:border-sky-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-100 dark:disabled:bg-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-400"
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                size="sm"
                className="bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-700 text-white"
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
