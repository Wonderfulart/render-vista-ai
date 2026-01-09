import { VideoScene } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SceneCard } from './SceneCard';
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
import { useState, useEffect } from 'react';
import { Layers } from 'lucide-react';

interface CenterPanelProps {
  scenes: VideoScene[];
  onUpdateScene: (args: { sceneId: string; updates: Partial<VideoScene> }) => Promise<VideoScene>;
  onReorderScenes: (newOrder: { id: string; scene_index: number }[]) => Promise<void>;
}

export const CenterPanel = ({ scenes, onUpdateScene, onReorderScenes }: CenterPanelProps) => {
  const [localScenes, setLocalScenes] = useState(scenes);

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

      // Update indices
      const newOrder = newScenes.map((scene, index) => ({
        id: scene.id,
        scene_index: index + 1,
      }));

      await onReorderScenes(newOrder);
    }
  };

  const completedCount = localScenes.filter(s => s.status === 'completed').length;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Scene Timeline
          </div>
          <span className="text-sm font-normal text-muted-foreground">
            {completedCount}/{localScenes.length} completed
          </span>
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
                {localScenes.map((scene) => (
                  <SceneCard
                    key={scene.id}
                    scene={scene}
                    onUpdate={(updates) => onUpdateScene({ sceneId: scene.id, updates })}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
