import { useCallback } from 'react';
import { toast } from 'sonner';
import type { Message } from './useComponentShowcaseState';

interface UseComponentShowcaseHandlersProps {
  dialogInput: string;
  setDialogInput: (value: string) => void;
  setDialogOpen: (open: boolean) => void;
  chatMessages: Message[];
  setChatMessages: (messages: Message[]) => void;
  setIsChatLoading: (loading: boolean) => void;
}

export function useComponentShowcaseHandlers({
  dialogInput,
  setDialogInput,
  setDialogOpen,
  chatMessages,
  setChatMessages,
  setIsChatLoading,
}: UseComponentShowcaseHandlersProps) {
  const handleDialogSubmit = useCallback(() => {
    console.log("Dialog submitted with value:", dialogInput);
    toast.success("Submitted successfully", {
      description: `Input: ${dialogInput}`,
    });
    setDialogInput("");
    setDialogOpen(false);
  }, [dialogInput, setDialogInput, setDialogOpen]);

  const handleDialogKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.nativeEvent.isComposing) {
        e.preventDefault();
        handleDialogSubmit();
      }
    },
    [handleDialogSubmit]
  );

  const handleChatSend = useCallback(
    (content: string) => {
      // Add user message
      const newMessages: Message[] = [...chatMessages, { role: "user", content }];
      setChatMessages(newMessages);

      // Simulate AI response with delay
      setIsChatLoading(true);
      const timeoutId = setTimeout(() => {
        const aiResponse: Message = {
          role: "assistant",
          content: `This is a **demo response**. In a real app, you would call a tRPC mutation here:\n\n\`\`\`typescript\nconst chatMutation = trpc.ai.chat.useMutation({\n  onSuccess: (response) => {\n    setChatMessages(prev => [...prev, {\n      role: "assistant",\n      content: response.choices[0].message.content\n    }]);\n  }\n});\n\nchatMutation.mutate({ messages: newMessages });\n\`\`\`\n\nYour message was: "${content}"`,
        };
        setChatMessages([...newMessages, aiResponse]);
        setIsChatLoading(false);
      }, 1500);

      return () => clearTimeout(timeoutId);
    },
    [chatMessages, setChatMessages, setIsChatLoading]
  );

  return {
    handleDialogSubmit,
    handleDialogKeyDown,
    handleChatSend,
  };
}
