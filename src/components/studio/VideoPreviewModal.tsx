import { VideoScene } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

interface VideoPreviewModalProps {
  scene: VideoScene | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VideoPreviewModal = ({ scene, open, onOpenChange }: VideoPreviewModalProps) => {
  if (!scene?.video_url) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = scene.video_url!;
    link.download = `scene-${scene.scene_index}.mp4`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center justify-between">
            <span>Scene {scene.scene_index} Preview</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-4">
          <div className="rounded-lg overflow-hidden bg-black">
            <video
              src={scene.video_url}
              controls
              autoPlay
              className="w-full aspect-video"
            >
              Your browser does not support the video tag.
            </video>
          </div>
          
          {scene.script_text && (
            <div className="mt-4 p-3 bg-secondary rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-1">Script</p>
              <p className="text-sm">{scene.script_text}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
