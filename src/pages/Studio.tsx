import { useParams, useNavigate } from 'react-router-dom';
import { useProject, useScenes, useShotTemplates } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeScenes, useRealtimeProfile } from '@/hooks/useRealtimeScenes';
import { LeftPanel } from '@/components/studio/LeftPanel';
import { CenterPanel } from '@/components/studio/CenterPanel';
import { RightPanel } from '@/components/studio/RightPanel';
import { BottomBar } from '@/components/studio/BottomBar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Studio = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { project, isLoading: projectLoading, updateProject } = useProject(projectId);
  const { scenes, isLoading: scenesLoading, updateScene, reorderScenes } = useScenes(projectId);
  const { templates } = useShotTemplates();

  // Real-time subscriptions for live updates
  useRealtimeScenes(projectId);
  useRealtimeProfile(user?.id);

  if (projectLoading || scenesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3">
              <Skeleton className="h-[600px] rounded-xl" />
            </div>
            <div className="lg:col-span-6">
              <Skeleton className="h-[600px] rounded-xl" />
            </div>
            <div className="lg:col-span-3">
              <Skeleton className="h-[600px] rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Project not found</h2>
          <p className="text-muted-foreground mb-4">This project may have been deleted.</p>
          <Button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader />
      
      <main className="flex-1 container mx-auto px-4 py-4 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
          {/* Left Panel - Project Settings (30%) */}
          <div className="lg:col-span-3">
            <LeftPanel
              project={project}
              templates={templates}
              onUpdateProject={updateProject}
            />
          </div>

          {/* Center Panel - Scene Timeline (50%) */}
          <div className="lg:col-span-6">
            <CenterPanel
              scenes={scenes}
              project={project}
              onUpdateScene={updateScene}
              onReorderScenes={reorderScenes}
            />
          </div>

          {/* Right Panel - Controls (20%) */}
          <div className="lg:col-span-3">
            <RightPanel projectId={project.id} />
          </div>
        </div>
      </main>

      {/* Bottom Fixed Bar */}
      <BottomBar project={project} scenes={scenes} />
    </div>
  );
};

export default Studio;
