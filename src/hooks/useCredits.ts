import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CreditTransaction } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useCredits() {
  const { user, profile, updateCredits } = useAuth();
  const queryClient = useQueryClient();

  const transactionsQuery = useQuery({
    queryKey: ['credit-transactions', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as CreditTransaction[];
    },
    enabled: !!user,
  });

  const deductCreditsMutation = useMutation({
    mutationFn: async ({
      amount,
      type,
      description,
      referenceId,
    }: {
      amount: number;
      type: CreditTransaction['transaction_type'];
      description?: string;
      referenceId?: string;
    }) => {
      if (!user || !profile) throw new Error('Not authenticated');

      // Use atomic RPC function instead of read-modify-write
      const { data, error } = await supabase.rpc('deduct_credits', {
        p_user_id: user.id,
        p_amount: amount,
        p_type: type,
        p_description: description || null,
        p_reference_id: referenceId || null,
      });

      if (error) throw error;

      const result = data?.[0];
      if (!result?.success) {
        throw new Error(result?.error_message || 'Insufficient credits');
      }

      updateCredits(result.new_balance);
      return result.new_balance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-transactions'] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const addCreditsMutation = useMutation({
    mutationFn: async ({
      amount,
      type,
      description,
      stripePaymentIntentId,
    }: {
      amount: number;
      type: CreditTransaction['transaction_type'];
      description?: string;
      stripePaymentIntentId?: string;
    }) => {
      if (!user || !profile) throw new Error('Not authenticated');

      // Use atomic RPC function instead of read-modify-write
      const { data, error } = await supabase.rpc('add_credits', {
        p_user_id: user.id,
        p_amount: amount,
        p_type: type,
        p_description: description || null,
        p_stripe_payment_intent_id: stripePaymentIntentId || null,
      });

      if (error) throw error;

      const result = data?.[0];
      if (!result?.success) {
        throw new Error('Failed to add credits');
      }

      updateCredits(result.new_balance);
      return result.new_balance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-transactions'] });
      toast.success('Credits added!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return {
    credits: profile?.credits ?? 0,
    transactions: transactionsQuery.data ?? [],
    isLoading: transactionsQuery.isLoading,
    deductCredits: deductCreditsMutation.mutateAsync,
    addCredits: addCreditsMutation.mutateAsync,
    isDeducting: deductCreditsMutation.isPending,
    isAdding: addCreditsMutation.isPending,
  };
}

// Credit packages with bonuses
export const CREDIT_PACKAGES = [
  { price: 10, credits: 10, bonus: 0, label: '$10' },
  { price: 25, credits: 26, bonus: 4, label: '$25' },
  { price: 50, credits: 55, bonus: 10, label: '$50' },
  { price: 100, credits: 115, bonus: 15, label: '$100' },
] as const;

export const GENERATION_COST = 0.98;
export const AI_SCRIPT_COST = 0.01;
export const THUMBNAIL_COST = 0.01;
