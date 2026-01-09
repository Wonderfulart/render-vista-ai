import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ProjectGrid } from '@/components/dashboard/ProjectGrid';
import { FilterTabs, FilterStatus, SortOption } from '@/components/dashboard/FilterTabs';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { SparkleButton } from '@/components/ui/SparkleButton';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects, isLoading, createProject } = useProjects();
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [sort, setSort] = useState<SortOption>('newest');

  const filteredAndSortedProjects = useMemo(() => {
    if (!projects) return [];

    let filtered = projects;

    // Apply filter
    if (filter !== 'all') {
      filtered = projects.filter((p) => p.status === filter);
    }

    // Apply sort
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'az':
          return a.title.localeCompare(b.title);
        case 'za':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });
  }, [projects, filter, sort]);

  const handleCreateProject = async () => {
    if (!user) return;
    
    const newProject = await createProject.mutateAsync('Untitled Project');

    if (newProject) {
      navigate(`/studio/${newProject.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Projects</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage your AI-powered video projects
            </p>
          </div>

          <SparkleButton
            onClick={handleCreateProject}
            disabled={createProject.isPending}
            className="bg-rainbow-pastel hover:opacity-90 text-foreground font-semibold px-6"
            sparkleCount={12}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </SparkleButton>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-video rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!projects || projects.length === 0) && (
          <EmptyState onCreateProject={handleCreateProject} />
        )}

        {/* Projects */}
        {!isLoading && projects && projects.length > 0 && (
          <div className="space-y-6">
            <FilterTabs
              currentFilter={filter}
              onFilterChange={setFilter}
              currentSort={sort}
              onSortChange={setSort}
            />

            {filteredAndSortedProjects.length > 0 ? (
              <ProjectGrid projects={filteredAndSortedProjects} />
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No projects match the current filter.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
