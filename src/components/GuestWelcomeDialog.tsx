import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Bot, Database, Zap } from 'lucide-react';

interface GuestWelcomeDialogProps {
  onOpenChatbot: () => void;
}

export function GuestWelcomeDialog({ onOpenChatbot }: GuestWelcomeDialogProps) {
  const { isGuest } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Show dialog for guest users on landing
    if (isGuest) {
      // Check if user has seen the welcome dialog this session
      const hasSeenWelcome = sessionStorage.getItem('guest_welcome_shown');

      if (!hasSeenWelcome) {
        // Small delay for smoother UX
        setTimeout(() => {
          setOpen(true);
          sessionStorage.setItem('guest_welcome_shown', 'true');
        }, 800);
      }
    }
  }, [isGuest]);

  const handleMeetSage = () => {
    setOpen(false);
    // Small delay before opening chatbot
    setTimeout(() => {
      onOpenChatbot();
    }, 300);
  };

  if (!isGuest) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-lg">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-2xl">
              Welcome to 4D Analytics Portfolio Demo
            </DialogTitle>
          </div>
          <DialogDescription className="text-base space-y-4 pt-4">
            <p className="text-foreground font-medium">
              👋 Hello, Recruiter! You're exploring a production-grade inventory management system
              built with advanced AI capabilities.
            </p>

            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wide">
                What makes this special?
              </p>

              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <Bot className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Advanced RAG Implementation</p>
                    <p className="text-sm text-muted-foreground">
                      Retrieval-Augmented Generation powered by vector similarity search
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Database className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Intelligent Knowledge Base</p>
                    <p className="text-sm text-muted-foreground">
                      OpenAI embeddings (text-embedding-3-small) + Supabase pgvector for semantic search
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Context-Aware AI Responses</p>
                    <p className="text-sm text-muted-foreground">
                      GPT-4o-mini chat completions with role-based personalization
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-accent/10 p-4 rounded-lg border border-primary/20">
              <p className="text-foreground font-medium mb-2">
                🧙‍♂️ Meet <span className="text-primary">4D-Sage</span> - Your AI-Powered Guide
              </p>
              <p className="text-sm text-muted-foreground">
                Instead of clicking through menus, simply ask 4D-Sage anything about the system.
                The AI assistant combines mystical charm with technical precision, retrieving
                relevant documentation via vector search and generating contextual responses.
              </p>
              <p className="text-sm text-muted-foreground mt-2 italic">
                "How do I create a stock order?" • "Explain the dispatch workflow" • "What's serialized inventory?"
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> You're in guest mode with read-only access. This demo showcases
              the RAG implementation, role-based access control, and modern React architecture.
            </p>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Explore on My Own
          </Button>
          <Button
            onClick={handleMeetSage}
            className="bg-gradient-to-r from-primary via-purple-500 to-accent hover:opacity-90"
          >
            <Bot className="mr-2 h-4 w-4" />
            Meet 4D-Sage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
