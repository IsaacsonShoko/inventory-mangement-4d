import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Home, ArrowLeft, Search, Package, BarChart3, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const quickLinks = [
    { label: 'Dashboard', path: '/', icon: Home },
    { label: 'KPI Analytics', path: '/kpi', icon: BarChart3 },
    { label: 'Picking Queue', path: '/picking', icon: ClipboardList },
    { label: 'Asset Management', path: '/asset-management', icon: Package },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
      <Card className="max-w-md w-full animate-scale-in">
        <CardContent className="pt-12 pb-12 text-center">
          {/* Animated 404 */}
          <div className="mb-6 relative">
            <div className="text-9xl font-bold text-primary/20 dark:text-primary/30 animate-pulse-slow">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-6xl font-bold text-primary animate-count-up">
                404
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-2 animate-fade-in">Page Not Found</h1>
          <p className="text-muted-foreground mb-8 animate-fade-in" style={{ animationDelay: '100ms' }}>
            The page you're looking for doesn't exist or has been moved.
          </p>

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              className="button-press"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button
              onClick={() => navigate('/')}
              className="button-press"
            >
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>

          {/* Quick Links */}
          <div className="pt-6 border-t animate-fade-in" style={{ animationDelay: '300ms' }}>
            <p className="text-sm text-muted-foreground mb-4 flex items-center justify-center gap-2">
              <Search className="h-4 w-4" />
              Looking for something specific?
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {quickLinks.map((link, index) => {
                const Icon = link.icon;
                return (
                  <Button
                    key={link.path}
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(link.path)}
                    className="button-press animate-slide-in"
                    style={{ animationDelay: `${400 + index * 50}ms` }}
                  >
                    <Icon className="h-4 w-4 mr-1.5" />
                    {link.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Keyboard Shortcut Hint */}
          <p className="mt-6 text-xs text-muted-foreground animate-fade-in" style={{ animationDelay: '600ms' }}>
            Tip: Press <kbd className="px-1.5 py-0.5 text-xs border rounded bg-muted">⌘</kbd> + <kbd className="px-1.5 py-0.5 text-xs border rounded bg-muted">/</kbd> for shortcuts
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
