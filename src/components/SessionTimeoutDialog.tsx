import { useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, LogOut, Timer } from 'lucide-react';

interface SessionTimeoutDialogProps {
  open: boolean;
  timeRemaining: number;
  onExtend: () => void;
  onLogout: () => void;
}

export function SessionTimeoutDialog({
  open,
  timeRemaining,
  onExtend,
  onLogout,
}: SessionTimeoutDialogProps) {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  // Play alert sound when dialog opens (optional - you can add a sound file)
  useEffect(() => {
    if (open) {
      // Optional: Add audio alert
      // const audio = new Audio('/alert.mp3');
      // audio.play().catch(() => {});
    }
  }, [open]);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
              <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <AlertDialogTitle className="text-xl">Session Expiring Soon</AlertDialogTitle>
            </div>
          </div>
        </AlertDialogHeader>

        <AlertDialogDescription className="space-y-4">
          <p className="text-base">
            Your session will expire due to inactivity. You will be automatically logged out in:
          </p>

          <div className="flex items-center justify-center gap-2 rounded-lg bg-muted p-6">
            <Timer className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 tabular-nums">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </div>
              <div className="text-sm text-muted-foreground mt-1">minutes remaining</div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Click "Stay Logged In" to continue your session, or "Logout Now" to sign out immediately.
          </p>
        </AlertDialogDescription>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onLogout}
            className="w-full sm:w-auto"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout Now
          </Button>
          <AlertDialogAction
            onClick={onExtend}
            className="w-full sm:w-auto"
          >
            Stay Logged In
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
