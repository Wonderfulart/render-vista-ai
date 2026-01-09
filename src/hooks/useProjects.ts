import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { VideoProject, VideoScene, ShotTemplate } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useProjects() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const projectsQuery = useQuery({
    queryKey: ['projects', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('video_projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as VideoProject[];
    },
    enabled: !!user,
  });

  const createProjectMutation = useMutation({
    mutationFn: async (title?: string) => {
      if (!user) throw new Error('Not authenticated');

      // Create project
      const { data: project, error: projectError } = await supabase
        .from('video_projects')
        .insert({
          user_id: user.id,
          title: title || 'Untitled Project',
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Create 20 empty scenes
      const scenes = Array.from({ length: 20 }, (_, i) => ({
        project_id: project.id,
        user_id: user.id,
        scene_index: i + 1,
        script_text: '',
        camera_movement: 'static',
        camera_tier: 'basic' as const,
      }));

      const { error: scenesError } = await supabase
        .from('video_scenes')
        .insert(scenes);

      if (scenesError) throw scenesError;

      return project as VideoProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created!');
    },
    onError: (error) => {
      toast.error('Failed to create project: ' + error.message);
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from('video_projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete project: ' + error.message);
    },
  });

  const cloneProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const { data, error } = await supabase.rpc('clone_project', {
        source_project_id: projectId,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project cloned!');
    },
    onError: (error) => {
      toast.error('Failed to clone project: ' + error.message);
    },
  });

  return {
    projects: projectsQuery.data ?? [],
    isLoading: projectsQuery.isLoading,
    error: projectsQuery.error,
    createProject: createProjectMutation,
    deleteProject: deleteProjectMutation,
    cloneProject: cloneProjectMutation,
  };
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VideoProject> & { id: string }) => {
      const { data, error } = await supabase
        .from('video_projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as VideoProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error) => {
      toast.error('Failed to update project: ' + error.message);
    },
  });

  return updateProjectMutation;
}

export function useProject(projectId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId || !user) return null;

      const { data, error } = await supabase
        .from('video_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data as VideoProject;
    },
    enabled: !!projectId && !!user,
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (updates: Partial<VideoProject>) => {
      if (!projectId) throw new Error('No project ID');

      const { data, error } = await supabase
        .from('video_projects')
        .update(updates)
        .eq('id', projectId)
        .select()
        .single();

      if (error) throw error;
      return data as VideoProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error) => {
      toast.error('Failed to update project: ' + error.message);
    },
  });

  return {
    project: projectQuery.data,
    isLoading: projectQuery.isLoading,
    error: projectQuery.error,
    updateProject: updateProjectMutation.mutateAsync,
    isUpdating: updateProjectMutation.isPending,
  };
}

export function useScenes(projectId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const scenesQuery = useQuery({
    queryKey: ['scenes', projectId],
    queryFn: async () => {
      if (!projectId || !user) return [];

      const { data, error } = await supabase
        .from('video_scenes')
        .select('*')
        .eq('project_id', projectId)
        .order('scene_index', { ascending: true });

      if (error) throw error;
      return data as VideoScene[];
    },
    enabled: !!projectId && !!user,
  });

  const updateSceneMutation = useMutation({
    mutationFn: async ({ sceneId, updates }: { sceneId: string; updates: Partial<VideoScene> }) => {
      const { data, error } = await supabase
        .from('video_scenes')
        .update(updates)
        .eq('id', sceneId)
        .select()
        .single();

      if (error) throw error;
      return data as VideoScene;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenes', projectId] });
    },
    onError: (error) => {
      toast.error('Failed to update scene: ' + error.message);
    },
  });

  const reorderScenesMutation = useMutation({
    mutationFn: async (newOrder: { id: string; scene_index: number }[]) => {
      // Update each scene's index
      const updates = newOrder.map(({ id, scene_index }) =>
        supabase
          .from('video_scenes')
          .update({ scene_index })
          .eq('id', id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenes', projectId] });
    },
    onError: (error) => {
      toast.error('Failed to reorder scenes: ' + error.message);
    },
  });

  return {
    scenes: scenesQuery.data ?? [],
    isLoading: scenesQuery.isLoading,
    error: scenesQuery.error,
    updateScene: updateSceneMutation.mutateAsync,
    reorderScenes: reorderScenesMutation.mutateAsync,
    isUpdating: updateSceneMutation.isPending,
  };
}

export function useShotTemplates() {
  const templatesQuery = useQuery({
    queryKey: ['shot-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shot_templates')
        .select('*')
        .eq('is_default', true)
        .order('name');

      if (error) throw error;
      // Cast the JSONB movements field properly
      return (data ?? []).map((t) => ({
        ...t,
        movements: t.movements as unknown as ShotTemplate['movements'],
      })) as ShotTemplate[];
    },
  });

  return {
    templates: templatesQuery.data ?? [],
    isLoading: templatesQuery.isLoading,
    error: templatesQuery.error,
  };
}
