import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  { key: '↑ / ↓', description: 'Navigate between scenes' },
  { key: 'Enter', description: 'Expand/collapse selected scene' },
  { key: 'G', description: 'Generate selected scene' },
  { key: 'T', description: 'Generate thumbnail for selected scene' },
  { key: 'Escape', description: 'Collapse all scenes / close dialogs' },
  { key: '?', description: 'Show this help dialog' },
];

export const KeyboardShortcutsDialog = ({ open, onOpenChange }: KeyboardShortcutsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.key}
              className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg"
            >
              <span className="text-sm">{shortcut.description}</span>
              <kbd className="px-2 py-1 bg-background border border-border rounded text-xs font-mono">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
