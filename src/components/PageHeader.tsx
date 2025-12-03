import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /**
   * Navigation level determines which button to show:
   * - Level 2: HOME button (navigates to /)
   * - Level 3: BACK button (navigates to previous page)
   */
  level: 2 | 3;
  /**
   * Optional title to display next to the navigation button
   */
  title?: string;
  /**
   * Optional className for additional styling
   */
  className?: string;
}

/**
 * PageHeader component provides consistent navigation across the application.
 *
 * Usage:
 * - Level 2 pages (one level deep from home): <PageHeader level={2} title="Orders" />
 * - Level 3 pages (two levels deep): <PageHeader level={3} title="Order Details" />
 *
 * Examples:
 * - Home (/) - No PageHeader
 * - Stock Order (/stock-order) - Level 2 (shows HOME button)
 * - KPI Dashboard (/kpi) - Level 2 (shows HOME button)
 * - User Management (/user-management) - Level 2 (shows HOME button)
 * - Order Details (/stock-order/123) - Level 3 (shows BACK button)
 */
export const PageHeader = ({ level, title, className }: PageHeaderProps) => {
  const navigate = useNavigate();

  const handleNavigation = () => {
    if (level === 2) {
      // Navigate to home
      navigate("/");
    } else {
      // Navigate back
      navigate(-1);
    }
  };

  return (
    <div className={cn("flex items-center gap-3 mb-6", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleNavigation}
        className="gap-2"
      >
        {level === 2 ? (
          <>
            <Home className="h-4 w-4" />
            Home
          </>
        ) : (
          <>
            <ArrowLeft className="h-4 w-4" />
            Back
          </>
        )}
      </Button>
      {title && (
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      )}
    </div>
  );
};
