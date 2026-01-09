import { motion } from 'framer-motion';
import { Video, Sparkles } from 'lucide-react';
import { SparkleButton } from '@/components/ui/SparkleButton';

interface EmptyStateProps {
  onCreateProject: () => void;
}

export const EmptyState = ({ onCreateProject }: EmptyStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20"
    >
      <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-6">
        <Video className="h-12 w-12 text-muted-foreground" />
      </div>
      
      <h2 className="text-2xl font-semibold text-foreground mb-2">
        No projects yet
      </h2>
      <p className="text-muted-foreground mb-6 text-center max-w-md">
        Create your first AI-powered video project and bring your ideas to life with cinematic scenes.
      </p>

      <SparkleButton
        onClick={onCreateProject}
        className="bg-rainbow-pastel hover:opacity-90 text-foreground font-semibold px-6"
        sparkleCount={12}
      >
        <Sparkles className="mr-2 h-4 w-4" />
        Create Your First Video
      </SparkleButton>
    </motion.div>
  );
};
