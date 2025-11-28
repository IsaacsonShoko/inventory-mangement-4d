import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';

interface UseSessionTimeoutOptions {
  /**
   * Timeout duration in milliseconds
   * Default: 30 minutes (1800000ms)
   */
  timeout?: number;

  /**
   * Warning time before logout in milliseconds
   * Default: 2 minutes (120000ms)
   */
  warningTime?: number;

  /**
   * Whether session timeout is enabled
   * Default: true
   */
  enabled?: boolean;
}

interface UseSessionTimeoutReturn {
  /** Whether the warning dialog should be shown */
  showWarning: boolean;
  /** Time remaining until auto-logout (in seconds) */
  timeRemaining: number;
  /** Extend the session (reset the timer) */
  extendSession: () => void;
  /** Logout immediately */
  logout: () => void;
}

/**
 * Hook to handle session timeout with inactivity detection
 *
 * Monitors user activity (mouse, keyboard, touch) and automatically
 * logs out users after a period of inactivity. Shows a warning dialog
 * before the timeout expires.
 *
 * @example
 * ```tsx
 * const { showWarning, timeRemaining, extendSession, logout } = useSessionTimeout({
 *   timeout: 30 * 60 * 1000, // 30 minutes
 *   warningTime: 2 * 60 * 1000, // 2 minutes warning
 * });
 * ```
 */
export function useSessionTimeout(options: UseSessionTimeoutOptions = {}): UseSessionTimeoutReturn {
  const {
    timeout = 30 * 60 * 1000, // 30 minutes default
    warningTime = 2 * 60 * 1000, // 2 minutes warning default
    enabled = true,
  } = options;

  const { user, signOut } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningTimeoutRef = useRef<NodeJS.Timeout>();
  const countdownRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<number>(Date.now());

  /**
   * Reset the inactivity timer
   */
  const resetTimer = useCallback(() => {
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    // Hide warning if shown
    setShowWarning(false);

    // Update last activity time
    lastActivityRef.current = Date.now();

    if (!enabled || !user) return;

    // Set warning timer (timeout - warningTime)
    const warningDelay = timeout - warningTime;
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(true);
      setTimeRemaining(Math.floor(warningTime / 1000));

      // Start countdown
      countdownRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, warningDelay);

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, timeout);
  }, [enabled, user, timeout, warningTime]);

  /**
   * Handle user logout
   */
  const handleLogout = useCallback(async () => {
    // Clear all timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    // Sign out
    await signOut();
  }, [signOut]);

  /**
   * Extend session (reset timer)
   */
  const extendSession = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  /**
   * Handle activity events
   */
  const handleActivity = useCallback(() => {
    // Only reset if enough time has passed (debounce - 1 second)
    const now = Date.now();
    if (now - lastActivityRef.current > 1000) {
      resetTimer();
    }
  }, [resetTimer]);

  // Set up activity listeners
  useEffect(() => {
    if (!enabled || !user) return;

    // Start initial timer
    resetTimer();

    // Activity events to monitor
    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [enabled, user, handleActivity, resetTimer]);

  return {
    showWarning,
    timeRemaining,
    extendSession,
    logout: handleLogout,
  };
}
