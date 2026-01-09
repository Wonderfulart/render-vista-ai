import { useState } from 'react';
import { VideoScene } from '@/types/database';
import { CAMERA_MOVEMENTS } from '@/types/database';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CameraSelector } from './CameraSelector';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GripVertical, 
  Sparkles, 
  Image, 
  Play, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Video
} from 'lucide-react';
import { toast } from 'sonner';

interface SceneCardProps {
  scene: VideoScene;
  onUpdate: (updates: Partial<VideoScene>) => Promise<VideoScene>;
}

export const SceneCard = ({ scene, onUpdate }: SceneCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [scriptText, setScriptText] = useState(scene.script_text || '');
  const [isSaving, setIsSaving] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleScriptBlur = async () => {
    if (scriptText !== scene.script_text) {
      setIsSaving(true);
      await onUpdate({ script_text: scriptText });
      setIsSaving(false);
    }
  };

  const handleCameraChange = async (movement: string, tier: string) => {
    await onUpdate({ camera_movement: movement, camera_tier: tier });
    toast.success(`Camera set to ${movement}`);
  };

  const handleGenerate = () => {
    toast.info('Scene generation coming soon! Edge functions required.');
  };

  const handleAISuggest = () => {
    toast.info('AI Script suggestions coming soon! API key required.');
  };

  const handleGenerateThumbnail = () => {
    toast.info('Thumbnail generation coming soon! Replicate API required.');
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={`transition-all ${isDragging ? 'opacity-50 shadow-lg' : ''} ${
          isExpanded ? 'ring-2 ring-primary/20' : ''
        }`}
      >
        <div className="p-3">
          {/* Header Row */}
          <div className="flex items-center gap-2 mb-2">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-secondary rounded"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>

            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm font-semibold text-primary">
                Scene {scene.scene_index}
              </span>
              <StatusBadge status={scene.status as 'pending' | 'processing' | 'completed' | 'failed'} size="sm" />
            </div>

            {/* Thumbnail Preview */}
            <div className="w-16 h-10 bg-secondary rounded overflow-hidden flex-shrink-0">
              {scene.thumbnail_url ? (
                <img
                  src={scene.thumbnail_url}
                  alt={`Scene ${scene.scene_index}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Video className="h-4 w-4 text-muted-foreground/50" />
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Script Preview (collapsed) */}
          {!isExpanded && (
            <p className="text-sm text-muted-foreground truncate pl-7">
              {scriptText || 'No script yet...'}
            </p>
          )}

          {/* Expanded Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-3 pt-2">
                  {/* Script Textarea */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Script</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={handleAISuggest}
                      >
                        <Sparkles className="mr-1 h-3 w-3" />
                        AI Suggest
                      </Button>
                    </div>
                    <Textarea
                      value={scriptText}
                      onChange={(e) => setScriptText(e.target.value)}
                      onBlur={handleScriptBlur}
                      placeholder="Enter scene script (10-15 words recommended)..."
                      className="min-h-[60px] text-sm resize-none"
                    />
                    {isSaving && (
                      <span className="text-xs text-muted-foreground">Saving...</span>
                    )}
                  </div>

                  {/* Camera Movement Selector */}
                  <CameraSelector
                    currentMovement={scene.camera_movement}
                    currentTier={scene.camera_tier}
                    onChange={handleCameraChange}
                  />

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={handleGenerateThumbnail}
                    >
                      <Image className="mr-1 h-3 w-3" />
                      Thumbnail
                    </Button>

                    {scene.status === 'completed' ? (
                      <Button variant="outline" size="sm" className="flex-1">
                        <Play className="mr-1 h-3 w-3" />
                        Preview
                      </Button>
                    ) : scene.status === 'failed' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={handleGenerate}
                      >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Retry
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-1 bg-rainbow-pastel text-foreground hover:opacity-90"
                        onClick={handleGenerate}
                        disabled={scene.status === 'processing'}
                      >
                        {scene.status === 'processing' ? (
                          <>
                            <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Play className="mr-1 h-3 w-3" />
                            Generate
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Error Message */}
                  {scene.error_message && (
                    <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                      {scene.error_message}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
};
