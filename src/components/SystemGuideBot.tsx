import { useState, useRef, useEffect } from "react";
import { n8nService } from "@/integrations/n8n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
  sources?: { title: string; url?: string }[];
}

// Conversation memory constants
const STORAGE_KEY_PREFIX = "xlink-sage-chat-";
const MAX_HISTORY_MESSAGES = 5; // Store last 5 exchanges (10 messages total)

// Generate session ID
const generateSessionId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// Load conversation history from localStorage
const loadConversationHistory = (sessionId: string): Message[] => {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${sessionId}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load conversation history:", error);
  }
  return [];
};

// Save conversation history to localStorage
const saveConversationHistory = (sessionId: string, messages: Message[]) => {
  try {
    // Only store last N user+bot exchanges (exclude welcome message)
    const messagesToStore = messages.filter(m => m.id !== "welcome").slice(-MAX_HISTORY_MESSAGES * 2);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${sessionId}`, JSON.stringify(messagesToStore));
  } catch (error) {
    console.error("Failed to save conversation history:", error);
  }
};

export const SystemGuideBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId] = useState(() => generateSessionId());
  const [messages, setMessages] = useState<Message[]>(() => {
    const history = loadConversationHistory(sessionId);
    return [
      {
        id: "welcome",
        role: "bot",
        text: "I am Xlink-Sage. The inventory system has its patterns : Ask, and I'll help you read them.",
      },
      ...history,
    ];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Save conversation history whenever messages change
  useEffect(() => {
    saveConversationHistory(sessionId, messages);
  }, [messages, sessionId]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input;
    const userMsg: Message = { id: Date.now().toString(), role: "user", text: userText };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // Check if we have a direct chat endpoint (preferred) or use n8n
      const chatEndpoint = import.meta.env.VITE_CHAT_ENDPOINT;

      // Prepare conversation history (last 5 exchanges, excluding welcome message)
      const conversationHistory = messages
        .filter(m => m.id !== "welcome")
        .slice(-MAX_HISTORY_MESSAGES * 2)
        .map(m => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.text
        }));

      let response;
      if (chatEndpoint) {
        // Use direct Netlify function with conversation history
        const res = await fetch(chatEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userText,
            conversationHistory
          }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        response = await res.json();
      } else {
        // Fallback to n8n service
        response = await n8nService.chatWithAssistant(userText);
      }

      const botText = response.answer || response.output || "Please check the documentation.";

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "bot",
          text: botText,
          sources: response.sources
        },
      ]);
    } catch (error) {
      console.error("Chat error:", error);

      // Extract user-friendly error message
      let errorMessage = "I couldn't reach the knowledge base. Please try again or contact support.";

      if (error instanceof Error) {
        const errorText = error.message.toLowerCase();

        // Check for specific error types and provide helpful messages
        if (errorText.includes('quota exceeded') || errorText.includes('insufficient')) {
          errorMessage = "⚠️ The AI service has reached its usage quota. Please contact your system administrator to add credits at platform.openai.com";
        } else if (errorText.includes('rate limit')) {
          errorMessage = "⏱️ Too many requests at once. Please wait a moment and try again.";
        } else if (errorText.includes('invalid') && errorText.includes('api key')) {
          errorMessage = "🔑 The AI service is not properly configured. Please contact your system administrator.";
        } else if (errorText.includes('temporarily unavailable')) {
          errorMessage = "🔧 The AI service is temporarily down. Please try again in a few minutes.";
        } else if (error.message && !error.message.startsWith('HTTP')) {
          // Use the specific error message if it's not a generic HTTP error
          errorMessage = `⚠️ ${error.message}`;
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "bot",
          text: errorMessage
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // UPDATED Z-INDEX TO 9999 TO FORCE VISIBILITY
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end space-y-4 font-sans">
      {isOpen && (
        <Card className="w-[380px] h-[600px] shadow-2xl flex flex-col border-primary/20 animate-in slide-in-from-bottom-5 fade-in duration-300 bg-background/95 backdrop-blur-sm">
          <CardHeader className="bg-primary text-primary-foreground p-4 rounded-t-lg flex flex-row items-center justify-between space-y-0 shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <div>
                <CardTitle className="text-base">Xlink-Sage</CardTitle>
                <p className="text-xs text-primary-foreground/80 font-normal">Pattern Reader</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary/90 h-8 w-8"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden relative">
            <ScrollArea className="flex-1 p-4">
              <div className="flex flex-col gap-4 pb-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={cn("flex gap-3 max-w-[90%]", msg.role === "user" ? "self-end flex-row-reverse" : "self-start")}>
                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm", msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
                      {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className={cn("rounded-2xl p-3 text-sm shadow-sm", msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm")}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 self-start max-w-[90%]">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 border"><Bot className="h-4 w-4" /></div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm p-4 flex items-center shadow-sm"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>
            <div className="p-4 border-t bg-background/50 backdrop-blur supports-[backdrop-filter]:bg-background/50">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question..." className="flex-1 shadow-sm" disabled={isLoading} />
                <Button type="submit" size="icon" disabled={isLoading || !input.trim()}><Send className="h-4 w-4" /></Button>
              </form>
            </div>
          </CardContent>
        </Card>
      )}
      {!isOpen && (
        <Button onClick={() => setIsOpen(true)} size="icon" className="h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-all duration-300 bg-primary hover:bg-primary/90">
          <MessageCircle className="h-7 w-7" />
          <span className="sr-only">Open Xlink-Sage</span>
        </Button>
      )}
    </div>
  );
};
