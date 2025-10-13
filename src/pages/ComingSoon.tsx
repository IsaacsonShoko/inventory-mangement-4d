import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Sparkles } from "lucide-react";

interface ComingSoonProps {
  title: string;
  icon: React.ReactNode;
}

const ComingSoon = ({ title, icon }: ComingSoonProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-white/10 backdrop-blur-lg border-white/20">
        <CardContent className="p-12 text-center">
          <div className="mb-8 inline-block rounded-full bg-white/20 p-6">
            <div className="text-white">{icon}</div>
          </div>
          
          <h1 className="mb-4 text-4xl font-bold text-white">
            {title}
          </h1>
          
          <div className="mb-8 flex items-center justify-center gap-2 text-2xl text-white/90">
            <Sparkles className="h-6 w-6" />
            <span>Coming Soon</span>
            <Sparkles className="h-6 w-6" />
          </div>
          
          <p className="mb-8 text-lg text-white/80">
            This feature is currently under development. We're working hard to bring you 
            an amazing experience. Stay tuned!
          </p>
          
          <Link to="/">
            <Button 
              size="lg" 
              className="bg-white text-primary hover:bg-white/90"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComingSoon;
