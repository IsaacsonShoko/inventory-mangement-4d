import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface KeyboardShortcutsOptions {
  enabled?: boolean;
}

const SHORTCUTS_HELP = `
Keyboard Shortcuts:
⌘/Ctrl + K: Command palette (coming soon)
⌘/Ctrl + /: Show this help
⌘/Ctrl + 1: Go to Dashboard
⌘/Ctrl + 2: Go to KPI Analytics
⌘/Ctrl + 3: Go to Picking Queue
⌘/Ctrl + 4: Go to Dispatch Queue
⌘/Ctrl + 5: Go to Asset Management
⌘/Ctrl + 6: Go to Stock Counts
⌘/Ctrl + 7: Go to Stock Admin
`.trim();

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const { enabled = true } = options;
  const navigate = useNavigate();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only handle shortcuts with Cmd (Mac) or Ctrl (Windows/Linux)
    if (!e.metaKey && !e.ctrlKey) return;

    // Don't trigger shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    switch (e.key) {
      case 'k':
        e.preventDefault();
        toast.info('Command palette coming soon!', {
          description: 'Press ⌘/Ctrl + / for available shortcuts',
        });
        break;

      case '/':
        e.preventDefault();
        toast.info('Keyboard Shortcuts', {
          description: SHORTCUTS_HELP,
          duration: 8000,
        });
        break;

      case '1':
        e.preventDefault();
        navigate('/');
        toast.success('Navigated to Dashboard');
        break;

      case '2':
        e.preventDefault();
        navigate('/kpi');
        toast.success('Navigated to KPI Analytics');
        break;

      case '3':
        e.preventDefault();
        navigate('/picking');
        toast.success('Navigated to Picking Queue');
        break;

      case '4':
        e.preventDefault();
        navigate('/dispatching');
        toast.success('Navigated to Dispatch Queue');
        break;

      case '5':
        e.preventDefault();
        navigate('/asset-management');
        toast.success('Navigated to Asset Management');
        break;

      case '6':
        e.preventDefault();
        navigate('/stock-counts');
        toast.success('Navigated to Stock Counts');
        break;

      case '7':
        e.preventDefault();
        navigate('/stock-admin');
        toast.success('Navigated to Stock Admin');
        break;

      default:
        break;
    }
  }, [navigate]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  return {
    showHelp: () => {
      toast.info('Keyboard Shortcuts', {
        description: SHORTCUTS_HELP,
        duration: 8000,
      });
    },
  };
}
