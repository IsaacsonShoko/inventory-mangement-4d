import { useState, useRef, useEffect } from "react";
import { n8nService } from "@/integrations/n8n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Bot, User, Loader2, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
  sources?: { title: string; url?: string }[];
}

export const SystemGuideBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "bot",
      text: "Hello! I'm your 4D System Guide. I can help you with workflows, troubleshooting, and system features based on the documentation.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input;
    const userMsg: Message = { id: Date.now().toString(), role: "user", text: userText };
    
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await n8nService.chatWithAssistant(userText);
      const botText = response.answer || response.output || response.text || "I'm not sure, please check the system documentation.";
      
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
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "bot", text: "I'm having trouble reaching the knowledge base right now." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end space-y-4 font-sans">
      {isOpen && (
        <Card className="w-[380px] h-[600px] shadow-2xl flex flex-col border-primary/20 animate-in slide-in-from-bottom-5 fade-in duration-300 bg-background/95 backdrop-blur-sm">
          <CardHeader className="bg-primary text-primary-foreground p-4 rounded-t-lg flex flex-row items-center justify-between space-y-0 shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <div>
                <CardTitle className="text-base">System Guide</CardTitle>
                <p className="text-xs text-primary-foreground/80 font-normal">Powered by Project Docs</p>
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
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-1">
                          {msg.sources.map((source, idx) => (
                            <span key={idx} className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-full border"><BookOpen className="h-3 w-3" />{source.title}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 self-start max-w-[90%]">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 border"><Bot className="h-4 w-4" /></div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm p-4 flex items-center shadow-sm"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /><span className="ml-2 text-xs text-muted-foreground">Searching knowledge base...</span></div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>
            <div className="p-4 border-t bg-background/50 backdrop-blur supports-[backdrop-filter]:bg-background/50">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="How do I return stock?..." className="flex-1 shadow-sm" disabled={isLoading} />
                <Button type="submit" size="icon" disabled={isLoading || !input.trim()}><Send className="h-4 w-4" /></Button>
              </form>
            </div>
          </CardContent>
        </Card>
      )}
      {!isOpen && (
        <Button onClick={() => setIsOpen(true)} size="icon" className="h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-all duration-300 bg-primary hover:bg-primary/90">
          <MessageCircle className="h-7 w-7" />
          <span className="sr-only">Open System Guide</span>
        </Button>
      )}
    </div>
  );
};