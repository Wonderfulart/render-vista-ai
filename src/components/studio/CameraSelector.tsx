import { useState } from 'react';
import { CAMERA_MOVEMENTS, CameraMovement } from '@/types/database';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface CameraSelectorProps {
  currentMovement: string;
  currentTier: string;
  onChange: (movement: string, tier: string) => void;
}

const tierLabels: Record<string, string> = {
  basic: 'Basic',
  advanced: 'Advanced',
  cinematic: 'Cinematic',
  combo: 'Combo',
};

export const CameraSelector = ({ currentMovement, currentTier, onChange }: CameraSelectorProps) => {
  const [selectedTier, setSelectedTier] = useState(currentTier || 'basic');

  const movementsByTier = CAMERA_MOVEMENTS.reduce((acc, movement) => {
    if (!acc[movement.tier]) {
      acc[movement.tier] = [];
    }
    acc[movement.tier].push(movement);
    return acc;
  }, {} as Record<string, CameraMovement[]>);

  const tiers = Object.keys(movementsByTier);

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-muted-foreground">Camera Movement</span>
      
      <Tabs value={selectedTier} onValueChange={setSelectedTier}>
        <TabsList className="w-full grid grid-cols-4 h-8">
          {tiers.map((tier) => (
            <TabsTrigger key={tier} value={tier} className="text-xs px-2">
              {tierLabels[tier]}
            </TabsTrigger>
          ))}
        </TabsList>

        {tiers.map((tier) => (
          <TabsContent key={tier} value={tier} className="mt-2">
            <div className="grid grid-cols-3 gap-1">
              {movementsByTier[tier].map((movement) => (
                <Tooltip key={movement.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'h-auto py-1.5 px-2 text-xs justify-start truncate',
                        currentMovement === movement.id &&
                          'border-primary bg-primary/5 text-primary'
                      )}
                      onClick={() => onChange(movement.id, tier)}
                    >
                      {movement.name}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="font-medium">{movement.name}</p>
                    <p className="text-xs text-muted-foreground">{movement.description}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
