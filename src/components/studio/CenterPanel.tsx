import { useState, useEffect, useRef, useCallback } from 'react';
import { VideoScene, VideoProject } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SceneCard, SceneCardRef } from './SceneCard';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent 
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Layers, Keyboard } from 'lucide-react';

interface CenterPanelProps {
  scenes: VideoScene[];
  project?: VideoProject;
  onUpdateScene: (args: { sceneId: string; updates: Partial<VideoScene> }) => Promise<VideoScene>;
  onReorderScenes: (newOrder: { id: string; scene_index: number }[]) => Promise<void>;
}

export const CenterPanel = ({ scenes, project, onUpdateScene, onReorderScenes }: CenterPanelProps) => {
  const [localScenes, setLocalScenes] = useState(scenes);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const sceneRefs = useRef<Map<string, SceneCardRef>>(new Map());

  useEffect(() => {
    setLocalScenes(scenes);
  }, [scenes]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localScenes.findIndex((s) => s.id === active.id);
      const newIndex = localScenes.findIndex((s) => s.id === over.id);

      const newScenes = arrayMove(localScenes, oldIndex, newIndex);
      setLocalScenes(newScenes);

      // Update indices (1-based indexing)
      const newOrder = newScenes.map((scene, index) => ({
        id: scene.id,
        scene_index: index + 1,
      }));

      await onReorderScenes(newOrder);
    }
  };

  const getSelectedSceneRef = useCallback(() => {
    if (selectedIndex === null || selectedIndex >= localScenes.length) return null;
    const scene = localScenes[selectedIndex];
    return sceneRefs.current.get(scene.id) || null;
  }, [selectedIndex, localScenes]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    enabled: true,
    onNavigateUp: () => {
      setSelectedIndex(prev => {
        if (prev === null) return localScenes.length > 0 ? 0 : null;
        return Math.max(0, prev - 1);
      });
    },
    onNavigateDown: () => {
      setSelectedIndex(prev => {
        if (prev === null) return localScenes.length > 0 ? 0 : null;
        return Math.min(localScenes.length - 1, prev + 1);
      });
    },
    onToggleExpand: () => {
      const ref = getSelectedSceneRef();
      ref?.toggle();
    },
    onGenerate: () => {
      const ref = getSelectedSceneRef();
      ref?.generate();
    },
    onGenerateThumbnail: () => {
      const ref = getSelectedSceneRef();
      ref?.generateThumbnail();
    },
    onEscape: () => {
      // Collapse all scenes
      sceneRefs.current.forEach(ref => ref.collapse());
      setSelectedIndex(null);
    },
    onHelp: () => {
      setShowShortcuts(true);
    },
  });

  const completedCount = localScenes.filter(s => s.status === 'completed').length;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Scene Timeline
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowShortcuts(true)}
              title="Keyboard shortcuts"
            >
              <Keyboard className="h-4 w-4" />
            </Button>
            <span className="text-sm font-normal text-muted-foreground">
              {completedCount}/{localScenes.length} completed
            </span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[calc(100vh-280px)] px-4 pb-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localScenes.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3 py-2">
                {localScenes.map((scene, index) => (
                  <SceneCard
                    key={scene.id}
                    ref={(ref) => {
                      if (ref) sceneRefs.current.set(scene.id, ref);
                      else sceneRefs.current.delete(scene.id);
                    }}
                    scene={scene}
                    project={project}
                    isSelected={selectedIndex === index}
                    onUpdate={(updates) => onUpdateScene({ sceneId: scene.id, updates })}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </ScrollArea>
      </CardContent>

      <KeyboardShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
    </Card>
  );
};
