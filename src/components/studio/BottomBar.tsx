import { useState } from 'react';
import { VideoProject, VideoScene } from '@/types/database';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SparkleButton } from '@/components/ui/SparkleButton';
import { BulkGenerateDialog } from './BulkGenerateDialog';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Copy, Download, ArrowLeft, Loader2, Zap } from 'lucide-react';

interface BottomBarProps {
  project: VideoProject;
  scenes: VideoScene[];
}

export const BottomBar = ({ project, scenes }: BottomBarProps) => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { cloneProject } = useProjects();
  const [isExporting, setIsExporting] = useState(false);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);

  const completedCount = scenes.filter(s => s.status === 'completed').length;
  const pendingScenes = scenes.filter(s => s.status === 'pending' && s.script_text?.trim());
  const progress = scenes.length > 0 ? (completedCount / scenes.length) * 100 : 0;
  const allCompleted = scenes.length > 0 && completedCount === scenes.length;

  const handleClone = async () => {
    const newId = await cloneProject.mutateAsync(project.id);
    if (newId) {
      navigate(`/studio/${newId}`);
    }
  };

  const handleExport = async () => {
    if (!allCompleted) {
      toast.error('Complete all scenes before exporting');
      return;
    }

    setIsExporting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to export');
        return;
      }

      const { data, error } = await supabase.functions.invoke('video-stitcher', {
        body: { project_id: project.id },
      });

      if (error) throw error;

      if (data?.final_video_url) {
        toast.success('Video exported successfully!');
        window.open(data.final_video_url, '_blank');
      } else {
        toast.success('Video export started. Check back soon!');
      }
    } catch (err: any) {
      console.error('Export error:', err);
      toast.error(err.message || 'Failed to export video');
    } finally {
      setIsExporting(false);
    }
  };

  const handleBulkGenerate = async () => {
    setShowBulkDialog(false);
    setIsBulkGenerating(true);

    let successCount = 0;
    let failCount = 0;

    for (const scene of pendingScenes) {
      try {
        const { error } = await supabase.functions.invoke('trigger-generation', {
          body: { scene_id: scene.id },
        });

        if (error) throw error;
        successCount++;
      } catch (err) {
        console.error(`Failed to queue scene ${scene.scene_index}:`, err);
        failCount++;
      }
    }

    setIsBulkGenerating(false);

    if (failCount > 0) {
      toast.warning(`Queued ${successCount} scenes, ${failCount} failed`);
    } else {
      toast.success(`Queued ${successCount} scenes for generation!`);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left - Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Button>

          {/* Center - Progress */}
          <div className="flex-1 max-w-md">
            <div className="flex items-center gap-3">
              <Progress value={progress} className="h-2 flex-1" />
              <span className="text-sm font-medium whitespace-nowrap">
                {completedCount}/{scenes.length} scenes
              </span>
            </div>
          </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-2">
            {pendingScenes.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkDialog(true)}
                disabled={isBulkGenerating}
              >
                {isBulkGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="mr-2 h-4 w-4" />
                )}
                Generate All ({pendingScenes.length})
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={handleClone}>
              <Copy className="mr-2 h-4 w-4" />
              Clone
            </Button>

            <SparkleButton
              size="sm"
              disabled={!allCompleted || isExporting}
              onClick={handleExport}
              className={allCompleted ? 'bg-rainbow-pastel text-foreground hover:opacity-90' : ''}
              sparkleCount={allCompleted && !isExporting ? 12 : 0}
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {isExporting ? 'Exporting...' : 'Export Video'}
            </SparkleButton>
          </div>
        </div>
      </div>

      <BulkGenerateDialog
        open={showBulkDialog}
        onOpenChange={setShowBulkDialog}
        pendingScenes={pendingScenes}
        credits={profile?.credits || 0}
        onConfirm={handleBulkGenerate}
      />
    </div>
  );
};
