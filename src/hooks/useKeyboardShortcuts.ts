import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsOptions {
  enabled?: boolean;
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  onToggleExpand?: () => void;
  onGenerate?: () => void;
  onGenerateThumbnail?: () => void;
  onEscape?: () => void;
  onHelp?: () => void;
}

export const useKeyboardShortcuts = ({
  enabled = true,
  onNavigateUp,
  onNavigateDown,
  onToggleExpand,
  onGenerate,
  onGenerateThumbnail,
  onEscape,
  onHelp,
}: KeyboardShortcutsOptions) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignore if typing in an input or textarea
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      // Only allow Escape in inputs
      if (event.key === 'Escape') {
        onEscape?.();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        onNavigateUp?.();
        break;
      case 'ArrowDown':
        event.preventDefault();
        onNavigateDown?.();
        break;
      case 'Enter':
        event.preventDefault();
        onToggleExpand?.();
        break;
      case 'g':
      case 'G':
        if (!event.metaKey && !event.ctrlKey) {
          event.preventDefault();
          onGenerate?.();
        }
        break;
      case 't':
      case 'T':
        if (!event.metaKey && !event.ctrlKey) {
          event.preventDefault();
          onGenerateThumbnail?.();
        }
        break;
      case 'Escape':
        onEscape?.();
        break;
      case '?':
        event.preventDefault();
        onHelp?.();
        break;
    }
  }, [onNavigateUp, onNavigateDown, onToggleExpand, onGenerate, onGenerateThumbnail, onEscape, onHelp]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
};
