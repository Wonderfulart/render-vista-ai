import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Loader2, Check } from 'lucide-react';
import { VideoScene, VideoProject } from '@/types/database';

interface AISuggestionsPopoverProps {
  scene: VideoScene;
  project?: VideoProject;
  onSelectSuggestion: (suggestion: string) => void;
  children: React.ReactNode;
}

export const AISuggestionsPopover = ({
  scene,
  project,
  onSelectSuggestion,
  children,
}: AISuggestionsPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleFetchSuggestions = async () => {
    if (suggestions.length > 0) return; // Already fetched
    
    setIsLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to use AI suggestions');
        return;
      }

      const { data, error } = await supabase.functions.invoke('ai-script', {
        body: {
          scene_id: scene.id,
          scene_index: scene.scene_index,
          project_title: project?.title || 'Untitled',
          project_description: project?.description || '',
          current_script: scene.script_text || '',
        },
      });

      if (error) throw error;

      if (data?.suggestions && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
        toast.success('AI suggestions generated! ($0.01)');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('AI suggestions error:', err);
      toast.error('Failed to generate suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (suggestion: string) => {
    onSelectSuggestion(suggestion);
    setIsOpen(false);
    toast.success('Script updated');
  };

  return (
    <Popover open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (open) handleFetchSuggestions();
    }}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-medium">AI Script Suggestions</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Generating...</span>
            </div>
          ) : suggestions.length > 0 ? (
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full h-auto py-3 px-3 text-left justify-start"
                  onClick={() => handleSelect(suggestion)}
                >
                  <div className="flex items-start gap-2 w-full">
                    <Check className="h-4 w-4 mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100" />
                    <p className="text-sm leading-relaxed">{suggestion}</p>
                  </div>
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Click to generate suggestions
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Cost: $0.01 per generation
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
