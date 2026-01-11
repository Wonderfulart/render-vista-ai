import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface QueueItem {
  id: string;
  scene_id: string;
  status: string;
  priority: number;
  created_at: string;
}

const AVG_GENERATION_TIME_SECONDS = 30;

export const useQueue = (projectId?: string) => {
  const { user } = useAuth();

  const { data: queueItems, isLoading } = useQuery({
    queryKey: ['generation-queue', user?.id, projectId],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('generation_queue')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['queued', 'processing'])
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as QueueItem[];
    },
    enabled: !!user?.id,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const pendingCount = queueItems?.filter(q => q.status === 'queued').length || 0;
  const processingCount = queueItems?.filter(q => q.status === 'processing').length || 0;
  const totalInQueue = pendingCount + processingCount;

  // Estimate wait time: pending items * avg time + remaining time for processing
  const estimatedWaitSeconds = pendingCount * AVG_GENERATION_TIME_SECONDS + 
    (processingCount > 0 ? AVG_GENERATION_TIME_SECONDS / 2 : 0);

  const formatWaitTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  return {
    queueItems: queueItems || [],
    isLoading,
    pendingCount,
    processingCount,
    totalInQueue,
    estimatedWaitTime: formatWaitTime(estimatedWaitSeconds),
    hasItemsInQueue: totalInQueue > 0,
  };
};
