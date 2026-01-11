import { useState, useEffect } from 'react';
import { VideoProject, ShotTemplate } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FileUploader } from '@/components/ui/FileUploader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Edit2, Check, X, Image, Music, Calculator } from 'lucide-react';

interface LeftPanelProps {
  project: VideoProject;
  templates: ShotTemplate[];
  onUpdateProject: (updates: Partial<VideoProject>) => Promise<VideoProject>;
}

export const LeftPanel = ({ project, templates, onUpdateProject }: LeftPanelProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(project.title);
  const [uploading, setUploading] = useState<'character' | 'audio' | null>(null);

  useEffect(() => {
    setTitle(project.title);
  }, [project.title]);

  const handleTitleSave = async () => {
    if (title.trim() && title !== project.title) {
      await onUpdateProject({ title: title.trim() });
      toast.success('Title updated');
    }
    setIsEditingTitle(false);
  };

  const handleFileUpload = async (file: File, type: 'character' | 'audio') => {
    setUploading(type);
    
    const bucket = type === 'character' ? 'character-images' : 'scene-audio';
    const fileExt = file.name.split('.').pop();
    const fileName = `${project.id}/${type}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (uploadError) {
      toast.error(`Failed to upload ${type}`);
      setUploading(null);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    const updateField = type === 'character' ? 'master_character_url' : 'master_audio_url';
    await onUpdateProject({ [updateField]: publicUrl });
    
    toast.success(`${type === 'character' ? 'Character image' : 'Audio'} uploaded!`);
    setUploading(null);
  };

  const handleTemplateChange = async (templateId: string) => {
    await onUpdateProject({ shot_template_id: templateId });
    toast.success('Shot template applied');
  };

  const estimatedCost = project.total_cost || 0;
  const maxCost = 20 * 0.98; // 20 scenes at $0.98 each

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          {isEditingTitle ? (
            <div className="flex items-center gap-1 flex-1">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8 text-lg font-semibold"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSave();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
              />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleTitleSave}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditingTitle(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 group cursor-pointer" onClick={() => setIsEditingTitle(true)}>
              <span className="truncate">{project.title}</span>
              <Edit2 className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
            </div>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Character Image Upload */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Master Character
          </Label>
          {project.master_character_url ? (
            <div className="relative aspect-square rounded-lg overflow-hidden bg-secondary">
              <img
                src={project.master_character_url}
                alt="Master character"
                className="w-full h-full object-cover"
              />
              <Button
                variant="secondary"
                size="sm"
                className="absolute bottom-2 right-2"
                onClick={() => document.getElementById('character-upload')?.click()}
              >
                Replace
              </Button>
              <input
                id="character-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'character');
                }}
              />
            </div>
          ) : (
            <FileUploader
              type="image"
              bucket="character-images"
              value={null}
              onChange={(url) => {
                if (url) onUpdateProject({ master_character_url: url });
              }}
            />
          )}
        </div>

        {/* Audio Upload */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            Master Audio (2 min)
          </Label>
          {project.master_audio_url ? (
            <div className="p-3 bg-secondary rounded-lg">
              <audio controls className="w-full h-8" src={project.master_audio_url} />
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full"
                onClick={() => document.getElementById('audio-upload')?.click()}
              >
                Replace Audio
              </Button>
              <input
                id="audio-upload"
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'audio');
                }}
              />
            </div>
          ) : (
            <FileUploader
              type="audio"
              bucket="scene-audio"
              value={null}
              onChange={(url) => {
                if (url) onUpdateProject({ master_audio_url: url });
              }}
            />
          )}
        </div>

        {/* Shot Template */}
        <div className="space-y-2">
          <Label>Shot Template</Label>
          <Select
            value={project.shot_template_id || ''}
            onValueChange={handleTemplateChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a template..." />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {templates.find(t => t.id === project.shot_template_id)?.description && (
            <p className="text-xs text-muted-foreground">
              {templates.find(t => t.id === project.shot_template_id)?.description}
            </p>
          )}
        </div>

        {/* Cost Tracker */}
        <div className="space-y-2 p-4 bg-secondary rounded-lg">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Estimated Cost
            </Label>
            <span className="font-semibold text-primary">
              $<AnimatedCounter value={estimatedCost} decimals={2} />
            </span>
          </div>
          <Progress value={(estimatedCost / maxCost) * 100} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">
            Max: ${maxCost.toFixed(2)} (all scenes)
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
