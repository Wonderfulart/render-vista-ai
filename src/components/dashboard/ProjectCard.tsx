import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VideoProject } from '@/types/database';
import { useProjects, useUpdateProject } from '@/hooks/useProjects';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { motion } from 'framer-motion';
import { 
  MoreVertical, 
  Edit2, 
  Copy, 
  Trash2, 
  Play,
  Video,
  Check,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ProjectCardProps {
  project: VideoProject;
}

export const ProjectCard = ({ project }: ProjectCardProps) => {
  const navigate = useNavigate();
  const { deleteProject, cloneProject } = useProjects();
  const updateProject = useUpdateProject();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(project.title);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const progress = (project.scenes_completed / 20) * 100;

  const handleTitleSave = async () => {
    if (editedTitle.trim() && editedTitle !== project.title) {
      await updateProject.mutateAsync({ id: project.id, title: editedTitle.trim() });
      toast.success('Title updated');
    }
    setIsEditing(false);
  };

  const handleClone = async () => {
    const newId = await cloneProject.mutateAsync(project.id);
    if (newId) {
      navigate(`/studio/${newId}`);
    }
  };

  const handleDelete = async () => {
    await deleteProject.mutateAsync(project.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="overflow-hidden card-lift cursor-pointer group">
          {/* Thumbnail Area */}
          <div 
            className="aspect-video bg-secondary relative overflow-hidden"
            onClick={() => navigate(`/studio/${project.id}`)}
          >
            {project.master_character_url ? (
              <img
                src={project.master_character_url}
                alt={project.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Video className="h-12 w-12 text-muted-foreground/30" />
              </div>
            )}
            
            {/* Status badge overlay */}
            <div className="absolute top-2 left-2">
              <StatusBadge status={project.status as 'draft' | 'processing' | 'completed' | 'failed'} />
            </div>

            {/* Play button overlay */}
            {project.final_video_url && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                  <Play className="h-6 w-6 text-primary-foreground ml-1" />
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Title */}
            <div className="flex items-center justify-between mb-2">
              {isEditing ? (
                <div className="flex items-center gap-1 flex-1">
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="h-7 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleTitleSave();
                      if (e.key === 'Escape') setIsEditing(false);
                    }}
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleTitleSave}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <h3 
                    className="font-semibold text-foreground truncate flex-1"
                    onClick={() => navigate(`/studio/${project.id}`)}
                  >
                    {project.title}
                  </h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setIsEditing(true)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleClone}>
                        <Copy className="mr-2 h-4 w-4" />
                        Clone Project
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>

            {/* Progress */}
            <div className="space-y-1 mb-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{project.scenes_completed}/20 scenes</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>

            {/* Date */}
            <p className="text-xs text-muted-foreground">
              {format(new Date(project.created_at), 'MMM d, yyyy')}
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{project.title}" and all its scenes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
