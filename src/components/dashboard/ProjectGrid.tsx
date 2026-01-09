import { VideoProject } from '@/types/database';
import { ProjectCard } from './ProjectCard';
import { motion } from 'framer-motion';

interface ProjectGridProps {
  projects: VideoProject[];
}

export const ProjectGrid = ({ projects }: ProjectGridProps) => {
  return (
    <motion.div 
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1,
          },
        },
      }}
    >
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </motion.div>
  );
};
