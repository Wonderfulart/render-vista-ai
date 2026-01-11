import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SparkleButton } from '@/components/ui/SparkleButton';
import { Separator } from '@/components/ui/separator';
import { CreditPackageDialog } from './CreditPackageDialog';
import { format } from 'date-fns';
import { CreditCard, Plus, ArrowDownRight, ArrowUpRight, Clock, Loader2 } from 'lucide-react';

interface RightPanelProps {
  projectId: string;
}

export const RightPanel = ({ projectId }: RightPanelProps) => {
  const { profile } = useAuth();
  const { transactions, isLoading } = useCredits();
  const [showCreditDialog, setShowCreditDialog] = useState(false);

  const recentTransactions = transactions?.slice(0, 5) || [];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="h-5 w-5" />
          Credits & Queue
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col gap-4">
        {/* Credit Balance */}
        <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl">
          <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
          <p className="text-3xl font-bold text-primary">
            $<AnimatedCounter value={profile?.credits || 0} decimals={2} />
          </p>
          <SparkleButton
            onClick={() => setShowCreditDialog(true)}
            className="w-full mt-3 bg-rainbow-pastel text-foreground hover:opacity-90"
            sparkleCount={8}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Credits
          </SparkleButton>
        </div>

        <CreditPackageDialog open={showCreditDialog} onOpenChange={setShowCreditDialog} />

        {/* Generation Queue */}
        <div className="p-4 bg-secondary rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Generation Queue</span>
          </div>
          <p className="text-sm text-muted-foreground">
            No scenes in queue
          </p>
        </div>

        <Separator />

        {/* Recent Transactions */}
        <div className="flex-1 overflow-hidden">
          <p className="text-sm font-medium mb-2">Recent Transactions</p>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : recentTransactions.length > 0 ? (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      {tx.amount > 0 ? (
                        <ArrowDownRight className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-red-500" />
                      )}
                      <div>
                        <p className="text-xs font-medium truncate max-w-[120px]">
                          {tx.description || tx.transaction_type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(tx.created_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        tx.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No transactions yet
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
