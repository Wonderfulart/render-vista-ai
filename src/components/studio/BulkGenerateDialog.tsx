import { VideoScene } from '@/types/database';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { GENERATION_COST } from '@/hooks/useCredits';
import { AlertTriangle, Zap } from 'lucide-react';

interface BulkGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingScenes: VideoScene[];
  credits: number;
  onConfirm: () => void;
}

export const BulkGenerateDialog = ({
  open,
  onOpenChange,
  pendingScenes,
  credits,
  onConfirm,
}: BulkGenerateDialogProps) => {
  const totalCost = pendingScenes.length * GENERATION_COST;
  const hasEnoughCredits = credits >= totalCost;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Generate All Scenes
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                This will generate {pendingScenes.length} pending scene{pendingScenes.length !== 1 ? 's' : ''}.
              </p>
              
              <div className="p-3 bg-secondary rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Scenes to generate:</span>
                  <span className="font-medium">{pendingScenes.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Cost per scene:</span>
                  <span className="font-medium">${GENERATION_COST.toFixed(2)}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold">
                  <span>Total cost:</span>
                  <span className="text-primary">${totalCost.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between text-sm">
                <span>Your balance:</span>
                <span className={hasEnoughCredits ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
                  ${credits.toFixed(2)}
                </span>
              </div>

              {!hasEnoughCredits && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>Insufficient credits. Please add more credits to continue.</span>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={!hasEnoughCredits}
            className="bg-rainbow-pastel text-foreground hover:opacity-90"
          >
            Generate All
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
