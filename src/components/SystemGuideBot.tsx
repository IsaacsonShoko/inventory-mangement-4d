import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { n8nService } from "@/integrations/n8n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, X, Send, User, Loader2, ArrowRight, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
  sources?: { title: string; url?: string }[];
  rating?: number | null;
  ratingFeedback?: string;
  showRating?: boolean;
  logId?: string; // Database log ID for this interaction
}

interface NavigableLink {
  label: string;
  path: string;
}

interface ParsedMessage {
  parts: { type: 'text' | 'link'; content: string; link?: NavigableLink }[];
}

// Conversation memory constants
const STORAGE_KEY_PREFIX = "xlink-sage-chat-";
const MAX_HISTORY_MESSAGES = 5; // Store last 5 exchanges (10 messages total)

// Old Sage loading messages - mystical and wise
const SAGE_LOADING_MESSAGES = [
  "Unravelling ancient scrolls...",
  "Consulting the inventory archives...",
  "Deciphering warehouse wisdom...",
  "Reading the patterns in the data...",
  "Peering through the mists of knowledge...",
  "Searching the sacred texts...",
  "Contemplating the flow of inventory...",
  "Divining insights from the ledgers...",
  "Awakening dormant knowledge...",
  "Channeling the spirits of logistics...",
  "Parsing the runes of supply chain...",
  "Meditating on your query...",
];

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

// Parse bot message for navigable links
// Syntax: [NAVIGATE:Label|/path]
const parseMessageWithLinks = (text: string): ParsedMessage => {
  const linkRegex = /\[NAVIGATE:([^\]]+)\|([^\]]+)\]/g;
  const parts: ParsedMessage['parts'] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, match.index)
      });
    }

    // Add the link
    parts.push({
      type: 'link',
      content: match[1], // Label
      link: {
        label: match[1],
        path: match[2]
      }
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last link
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }

  // If no links found, return the whole text as a single part
  if (parts.length === 0) {
    parts.push({
      type: 'text',
      content: text
    });
  }

  return { parts };
};

export const SystemGuideBot = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId] = useState(() => generateSessionId());
  const [messages, setMessages] = useState<Message[]>(() => {
    const history = loadConversationHistory(sessionId);
    return [
      {
        id: "welcome",
        role: "bot",
        text: "Greetings. I am the Old Sage of Inventory Wisdom. The patterns of this realm reveal themselves to those who ask the right questions. What knowledge do you seek?",
      },
      ...history,
    ];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [ratingMessageId, setRatingMessageId] = useState<string | null>(null);
  const [ratingFeedback, setRatingFeedback] = useState("");
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

  // Cycle through loading messages while the Sage is thinking
  useEffect(() => {
    if (!isLoading) {
      setLoadingMessageIndex(0);
      return;
    }

    // Change loading message every 2 seconds
    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % SAGE_LOADING_MESSAGES.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input;
    const userMsg: Message = { id: Date.now().toString(), role: "user", text: userText };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const startTime = Date.now();

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

      // Prepare user context for role-specific responses
      const userContext = profile ? {
        email: profile.email,
        role: profile.role,
        company: profile.company || undefined,
        warehouse: profile.warehouse || undefined,
        fullName: profile.full_name || undefined
      } : undefined;

      let response;
      if (chatEndpoint) {
        // Use direct Netlify function with conversation history and user context
        const res = await fetch(chatEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userText,
            conversationHistory,
            userContext
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
      const responseTime = Date.now() - startTime;

      // Log usage to database
      let logId: string | undefined;
      try {
        // Fallback to user object if profile is not fully loaded
        const userId = profile?.id || user?.id || null;
        const userEmail = profile?.email || user?.email || null;
        // Default to 'user' role if authenticated but profile missing, otherwise use profile role
        const userRole = profile?.role || (user ? 'user' : null);

        const { data: logData, error: logError } = await supabase
          .from('bot_usage_logs')
          .insert({
            user_id: userId,
            user_email: userEmail,
            user_role: userRole,
            user_company: profile?.company || null,
            user_warehouse: profile?.warehouse || null,
            session_id: sessionId,
            query: userText,
            response: botText,
            sources: response.sources || [],
            response_time_ms: responseTime,
            is_work_related: true, // Default to true, can be improved with classification
          })
          .select('id')
          .single();

        if (!logError && logData) {
          logId = logData.id;
        } else if (logError) {
          console.error('Failed to log bot usage:', logError);
        }
      } catch (logError) {
        console.error('Failed to log bot usage:', logError);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "bot",
          text: botText,
          sources: response.sources,
          showRating: true,
          logId: logId
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

  const handleRating = async (messageId: string, rating: number) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || !message.logId) {
      toast.error("Unable to submit rating");
      return;
    }

    try {
      const { error } = await supabase
        .from('bot_usage_logs')
        .update({
          satisfaction_rating: rating,
          rated_at: new Date().toISOString(),
        })
        .eq('id', message.logId);

      if (error) throw error;

      // Update message in state
      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, rating, showRating: rating < 4 } // Show feedback only for ratings < 4
          : m
      ));

      setRatingMessageId(rating < 4 ? messageId : null);

      if (rating >= 4) {
        toast.success("Thank you for your feedback!");
      }
    } catch (error) {
      console.error('Failed to submit rating:', error);
      toast.error("Failed to submit rating");
    }
  };

  const handleRatingFeedback = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || !message.logId) {
      toast.error("Unable to submit feedback");
      return;
    }

    try {
      const { error } = await supabase
        .from('bot_usage_logs')
        .update({
          satisfaction_feedback: ratingFeedback,
        })
        .eq('id', message.logId);

      if (error) throw error;

      // Update message in state
      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, ratingFeedback, showRating: false }
          : m
      ));

      setRatingMessageId(null);
      setRatingFeedback("");
      toast.success("Thank you for your feedback!");
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast.error("Failed to submit feedback");
    }
  };

  const skipRating = (messageId: string) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId
        ? { ...m, showRating: false }
        : m
    ));
    setRatingMessageId(null);
    setRatingFeedback("");
  };

  // Only show bot to authenticated users
  if (!user) {
    return null;
  }

  return (
    // UPDATED Z-INDEX TO 9999 TO FORCE VISIBILITY
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end space-y-4 font-sans">
      {isOpen && (
        <Card className="w-[380px] max-h-[85vh] h-[500px] shadow-2xl flex flex-col border-primary/20 animate-in slide-in-from-bottom-5 fade-in duration-300 bg-background/95 backdrop-blur-sm">
          <CardHeader className="bg-primary text-primary-foreground p-3 rounded-t-lg flex flex-row items-center justify-between space-y-0 shrink-0">
            <div className="flex items-center gap-2">
              <div className="text-xl">🧙‍♂️</div>
              <div>
                <CardTitle className="text-base">Xlink-Sage</CardTitle>
                <p className="text-xs text-primary-foreground/80 font-normal">Old Sage of Inventory Wisdom</p>
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
                {messages.map((msg) => {
                  const parsed = msg.role === "bot" ? parseMessageWithLinks(msg.text) : null;

                  return (
                    <div key={msg.id} className={cn("flex gap-3 max-w-[90%]", msg.role === "user" ? "self-end flex-row-reverse" : "self-start")}>
                      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm text-base", msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
                        {msg.role === "user" ? <User className="h-4 w-4" /> : "🧙‍♂️"}
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className={cn("rounded-2xl p-2.5 text-xs shadow-sm", msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm")}>
                          {msg.role === "user" ? (
                            msg.text
                          ) : parsed ? (
                            <div className="flex flex-col gap-2">
                              {parsed.parts.map((part, idx) => {
                                if (part.type === 'text') {
                                  return <span key={idx}>{part.content}</span>;
                                } else if (part.type === 'link' && part.link) {
                                  return (
                                    <Button
                                      key={idx}
                                      variant="outline"
                                      size="sm"
                                      className="w-fit mt-1 bg-background/50 hover:bg-background"
                                      onClick={() => {
                                        navigate(part.link!.path);
                                        setIsOpen(false);
                                      }}
                                    >
                                      <ArrowRight className="h-3 w-3 mr-1" />
                                      {part.link.label}
                                    </Button>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          ) : (
                            msg.text
                          )}
                        </div>

                        {/* Rating UI - Only show for bot messages */}
                        {msg.role === "bot" && msg.showRating && !msg.rating && (
                          <div className="mt-2 p-3 bg-background/80 rounded-lg border border-primary/20">
                            <p className="text-xs text-muted-foreground mb-2">Was this answer helpful?</p>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((rating) => (
                                <Button
                                  key={rating}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-primary/10"
                                  onClick={() => handleRating(msg.id, rating)}
                                >
                                  <Star className={cn("h-4 w-4", rating <= 3 ? "text-muted-foreground" : "text-yellow-500")} />
                                </Button>
                              ))}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 h-6 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => skipRating(msg.id)}
                            >
                              Skip
                            </Button>
                          </div>
                        )}

                        {/* Feedback textarea - Show after rating < 4 */}
                        {msg.role === "bot" && msg.rating && msg.rating < 4 && ratingMessageId === msg.id && (
                          <div className="mt-2 p-3 bg-background/80 rounded-lg border border-primary/20">
                            <p className="text-xs text-muted-foreground mb-2">Tell us more (optional):</p>
                            <Textarea
                              value={ratingFeedback}
                              onChange={(e) => setRatingFeedback(e.target.value)}
                              placeholder="What could be improved?"
                              className="text-xs min-h-[60px] mb-2"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleRatingFeedback(msg.id)}
                                className="h-7 text-xs"
                              >
                                Submit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => skipRating(msg.id)}
                                className="h-7 text-xs"
                              >
                                Skip
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Rating submitted confirmation */}
                        {msg.role === "bot" && msg.rating && !msg.showRating && (
                          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            <span>Rated {msg.rating}/5</span>
                            {msg.ratingFeedback && <span className="ml-1">• Feedback provided</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {isLoading && (
                  <div className="flex gap-3 self-start max-w-[90%]">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 border text-base">🧙‍♂️</div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm p-3 flex items-center gap-2 shadow-sm">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground italic animate-pulse">
                        {SAGE_LOADING_MESSAGES[loadingMessageIndex]}
                      </span>
                    </div>
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
          <span className="sr-only">Open Xlink-Sage - Old Sage of Inventory Wisdom</span>
        </Button>
      )}
    </div>
  );
};
