'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, Video, Trash2, Loader2, Play } from 'lucide-react';
import { getUserProjects, createProject, deleteProject } from '@/app/actions/projects';
import { UserMenu } from '@/components/UserMenu';

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    const data = await getUserProjects();
    setProjects(data);
    setIsLoading(false);
  };

  const handleCreate = async () => {
    setIsCreating(true);
    const result = await createProject();
    if (result.success && result.id) {
      router.push(`/editor/${result.id}`);
    } else {
      setIsCreating(false);
      // Show error toast
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      if(confirm("Are you sure you want to delete this project?")) {
        await deleteProject(id);
        loadProjects();
      }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
       {/* Nav */}
       <nav className="border-b border-border/40 backdrop-blur-md sticky top-0 z-50 bg-background/80">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xl tracking-tight cursor-pointer" onClick={() => router.push('/')}>
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
                      <Play size={16} fill="currentColor" />
                  </div>
                  EditMode
              </div>
              <UserMenu />
          </div>
       </nav>

       <main className="max-w-7xl mx-auto px-6 py-12">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold">Your Projects</h1>
                <Button onClick={handleCreate} disabled={isCreating}>
                    {isCreating ? <Loader2 className="animate-spin mr-2" size={16}/> : <Plus className="mr-2" size={16} />}
                    New Project
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-primary" size={32} />
                </div>
            ) : projects.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-border rounded-xl bg-muted/10">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                        <Video size={32} className="text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No projects yet</h3>
                    <p className="text-muted-foreground mb-6">Create your first video project to get started.</p>
                    <Button onClick={handleCreate} disabled={isCreating}>
                        Create Project
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {projects.map((project) => (
                        <div key={project.id} onClick={() => router.push(`/editor/${project.id}`)} className="group relative aspect-video bg-card rounded-xl border border-border overflow-hidden cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all">
                            {/* Thumbnail Placeholder */}
                            <div className="absolute inset-0 bg-muted/30 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                                {project.thumbnail ? (
                                    <img src={project.thumbnail} alt={project.name} className="w-full h-full object-cover" />
                                ) : (
                                    <Video className="text-muted-foreground/30" size={48} />
                                )}
                            </div>
                            
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                                <h3 className="text-white font-medium truncate">{project.name}</h3>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-white/60 text-xs">{new Date(project.updatedAt).toLocaleDateString()}</span>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-white/70 hover:text-red-400 hover:bg-white/10" onClick={(e) => handleDelete(e, project.id)}>
                                        <Trash2 size={14} />
                                    </Button>
                                </div>
                            </div>
                            
                            {/* Default footer if not hovering (mobile accessible) */}
                            <div className="absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur p-3 border-t border-border group-hover:opacity-0 transition-opacity">
                                 <h3 className="font-medium text-sm truncate">{project.name}</h3>
                                 <span className="text-muted-foreground text-xs">{new Date(project.updatedAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
       </main>
    </div>
  );
}
