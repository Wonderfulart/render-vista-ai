import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CREDIT_PACKAGES } from '@/hooks/useCredits';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CreditCard, Sparkles } from 'lucide-react';

interface CreditPackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreditPackageDialog = ({ open, onOpenChange }: CreditPackageDialogProps) => {
  const [isLoading, setIsLoading] = useState<number | null>(null);

  const handleSelectPackage = async (pkg: typeof CREDIT_PACKAGES[number]) => {
    setIsLoading(pkg.price);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to purchase credits');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { price_cents: pkg.price * 100 },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Add Credits
          </DialogTitle>
          <DialogDescription>
            Select a credit package to purchase. Larger packages include bonus credits!
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-4">
          {CREDIT_PACKAGES.map((pkg) => (
            <Button
              key={pkg.price}
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-1 relative overflow-hidden"
              disabled={isLoading !== null}
              onClick={() => handleSelectPackage(pkg)}
            >
              {isLoading === pkg.price ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <span className="text-lg font-bold">{pkg.label}</span>
                  <span className="text-sm text-muted-foreground">
                    {pkg.credits} credits
                  </span>
                  {pkg.bonus > 0 && (
                    <span className="flex items-center gap-1 text-xs text-primary">
                      <Sparkles className="h-3 w-3" />
                      +{pkg.bonus} bonus
                    </span>
                  )}
                </>
              )}
            </Button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Secure payment powered by Stripe
        </p>
      </DialogContent>
    </Dialog>
  );
};
