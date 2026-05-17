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

const CHATBOT_CLOSED_KEY = 'silaChatbotClosed';

export default function SilaChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosed, setIsClosed] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(CHATBOT_CLOSED_KEY);
      return stored === 'true';
    }
    return false;
  });
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "مرحباً! أنا سيلا، مساعدتك الافتراضية. كيف يمكنني مساعدتك اليوم؟ يمكنك السؤال عن الأدوية والأكواس الطبية والتغطية التأمينية.",
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

  // Handle close - completely hide the chatbot
  const handleClose = () => {
    console.log("Closing chatbot...");
    setIsClosed(true);
    setIsOpen(false);
    localStorage.setItem(CHATBOT_CLOSED_KEY, 'true');
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle send message
  const handleSendMessage = async () => {
    if (!input.trim()) return;

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
      const response = await chatMutation.mutateAsync({ message: input });
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.message || "عذراً، حدث خطأ في المعالجة.",
        timestamp: new Date(),
        source: "llm",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: "عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
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
      {/* Floating Action Button - Moved to Top */}
      <button
        onClick={() => {
          if (isOpen) {
            handleClose();
          } else {
            setIsOpen(true);
          }
        }}
        className="fixed top-6 right-6 z-40 px-4 py-3 rounded-full bg-gradient-to-br from-sky-500 to-sky-600 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group text-white font-bold text-sm hover:scale-110"
        title="سيلا - مساعدتك الافتراضية"
      >
        {isOpen ? "✕ إغلاق" : "💬 سيلا"}
      </button>

      {/* Chatbot Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-96 max-w-[calc(100vw-2rem)] h-[600px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col border border-sky-100 dark:border-sky-800">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-sky-100 dark:border-sky-800 bg-gradient-to-r from-sky-50 to-emerald-50 dark:from-slate-800 dark:to-slate-700 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center text-white text-sm font-bold">
                س
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">سيلا</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">مساعدتك الافتراضية</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded-full transition-colors"
              title="إغلاق"
            >
              <X className="w-5 h-5 text-red-500" />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-slate-900">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    message.role === "user"
                      ? "bg-sky-500 text-white rounded-br-none"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-none"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg rounded-bl-none">
                  <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-sky-100 dark:border-sky-800 bg-slate-50 dark:bg-slate-800 rounded-b-2xl">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="اكتب سؤالك..."
                className="flex-1 px-3 py-2 rounded-lg border border-sky-200 dark:border-sky-700 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !input.trim()}
                className="p-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
