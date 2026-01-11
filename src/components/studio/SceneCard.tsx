import { useState, forwardRef, useImperativeHandle } from 'react';
import { VideoScene, VideoProject, CameraTier } from '@/types/database';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CameraSelector } from './CameraSelector';
import { AISuggestionsPopover } from './AISuggestionsPopover';
import { VideoPreviewModal } from './VideoPreviewModal';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { GENERATION_COST, THUMBNAIL_COST } from '@/hooks/useCredits';
import { 
  GripVertical, 
  Sparkles, 
  Image, 
  Play, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Video,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface SceneCardProps {
  scene: VideoScene;
  project?: VideoProject;
  isSelected?: boolean;
  onUpdate: (updates: Partial<VideoScene>) => Promise<VideoScene>;
}

export interface SceneCardRef {
  expand: () => void;
  collapse: () => void;
  toggle: () => void;
  generate: () => Promise<void>;
  generateThumbnail: () => Promise<void>;
}

export const SceneCard = forwardRef<SceneCardRef, SceneCardProps>(
  ({ scene, project, isSelected, onUpdate }, ref) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [scriptText, setScriptText] = useState(scene.script_text || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [showErrorDetails, setShowErrorDetails] = useState(false);

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

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      expand: () => setIsExpanded(true),
      collapse: () => setIsExpanded(false),
      toggle: () => setIsExpanded(prev => !prev),
      generate: handleGenerate,
      generateThumbnail: handleGenerateThumbnail,
    }));

    const handleScriptBlur = async () => {
      if (scriptText !== scene.script_text) {
        setIsSaving(true);
        await onUpdate({ script_text: scriptText });
        setIsSaving(false);
      }
    };

    const handleCameraChange = async (movement: string, tier: CameraTier) => {
      await onUpdate({ camera_movement: movement, camera_tier: tier });
      toast.success(`Camera set to ${movement}`);
    };

    const handleGenerate = async () => {
      if (!scriptText.trim()) {
        toast.error('Please add a script before generating');
        return;
      }

      setIsGenerating(true);
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast.error('Please sign in to generate');
          return;
        }

        const { data, error } = await supabase.functions.invoke('trigger-generation', {
          body: { scene_id: scene.id },
        });

        if (error) throw error;

        toast.success(`Generation started! Cost: $${GENERATION_COST.toFixed(2)}`);
      } catch (err: any) {
        console.error('Generation error:', err);
        toast.error(err.message || 'Failed to start generation');
      } finally {
        setIsGenerating(false);
      }
    };

    const handleGenerateThumbnail = async () => {
      if (!scriptText.trim()) {
        toast.error('Please add a script before generating thumbnail');
        return;
      }

      setIsGeneratingThumbnail(true);
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast.error('Please sign in to generate thumbnail');
          return;
        }

        const { data, error } = await supabase.functions.invoke('generate-thumbnail', {
          body: { scene_id: scene.id },
        });

        if (error) throw error;

        if (data?.thumbnail_url) {
          await onUpdate({ thumbnail_url: data.thumbnail_url });
          toast.success(`Thumbnail generated! Cost: $${THUMBNAIL_COST.toFixed(2)}`);
        }
      } catch (err: any) {
        console.error('Thumbnail error:', err);
        toast.error(err.message || 'Failed to generate thumbnail');
      } finally {
        setIsGeneratingThumbnail(false);
      }
    };

    const handleSuggestionSelect = (suggestion: string) => {
      setScriptText(suggestion);
      onUpdate({ script_text: suggestion });
    };

    return (
      <div ref={setNodeRef} style={style}>
        <Card
          className={`transition-all ${isDragging ? 'opacity-50 shadow-lg' : ''} ${
            isExpanded ? 'ring-2 ring-primary/20' : ''
          } ${isSelected ? 'ring-2 ring-primary' : ''}`}
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
                <StatusBadge status={scene.status as 'pending' | 'processing' | 'completed' | 'failed'} />
                {scene.retry_count > 0 && (
                  <span className="text-xs text-muted-foreground">
                    (Retry {scene.retry_count}/3)
                  </span>
                )}
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
                        <AISuggestionsPopover
                          scene={scene}
                          project={project}
                          onSelectSuggestion={handleSuggestionSelect}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                          >
                            <Sparkles className="mr-1 h-3 w-3" />
                            AI Suggest
                          </Button>
                        </AISuggestionsPopover>
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
                        disabled={isGeneratingThumbnail}
                      >
                        {isGeneratingThumbnail ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Image className="mr-1 h-3 w-3" />
                        )}
                        Thumbnail
                      </Button>

                      {scene.status === 'completed' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setShowPreview(true)}
                        >
                          <Play className="mr-1 h-3 w-3" />
                          Preview
                        </Button>
                      ) : scene.status === 'failed' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={handleGenerate}
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-1 h-3 w-3" />
                          )}
                          Retry
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="flex-1 bg-rainbow-pastel text-foreground hover:opacity-90"
                          onClick={handleGenerate}
                          disabled={scene.status === 'processing' || isGenerating}
                        >
                          {scene.status === 'processing' || isGenerating ? (
                            <>
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
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
                      <div className="bg-destructive/10 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setShowErrorDetails(!showErrorDetails)}
                          className="w-full flex items-center justify-between p-2 text-left"
                        >
                          <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">Generation failed</span>
                          </div>
                          <ChevronDown className={`h-4 w-4 text-destructive transition-transform ${showErrorDetails ? 'rotate-180' : ''}`} />
                        </button>
                        {showErrorDetails && (
                          <div className="px-2 pb-2">
                            <p className="text-xs text-destructive bg-destructive/5 p-2 rounded">
                              {scene.error_message}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>

        <VideoPreviewModal
          scene={scene}
          open={showPreview}
          onOpenChange={setShowPreview}
        />
      </div>
    );
  }
);

SceneCard.displayName = 'SceneCard';
