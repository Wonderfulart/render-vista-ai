import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useAudioSplitter(projectId: string) {
  const [isSplitting, setIsSplitting] = useState(false);
  const queryClient = useQueryClient();

  const splitAudio = async (audioUrl: string | null) => {
    if (!audioUrl) {
      toast.error('Please upload audio first');
      return { success: false };
    }

    setIsSplitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to split audio');
        return { success: false };
      }

      const { data, error } = await supabase.functions.invoke('audio-splitter', {
        body: { 
          project_id: projectId,
          audio_url: audioUrl,
        },
      });

      if (error) throw error;

      // Force refresh scenes and project data to get new scene IDs
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['scenes', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
      ]);

      toast.success(`Audio split into ${data?.scenes_created || 20} scenes!`);
      return { success: true, scenesCreated: data?.scenes_created || 20 };
    } catch (err: any) {
      console.error('Audio split error:', err);
      toast.error(err.message || 'Failed to split audio');
      return { success: false, error: err };
    } finally {
      setIsSplitting(false);
    }
  };

  return { splitAudio, isSplitting };
}
