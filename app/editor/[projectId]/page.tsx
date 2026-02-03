import Editor from '@/components/Editor';
import { getProjectById } from '@/app/actions/projects';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function EditorPage({ params }: Props) {
  const { projectId } = await params;
  const project = await getProjectById(projectId);

  if (!project) {
    notFound();
  }

  // Parse the project data JSON
  const projectData = JSON.parse(project.data);
  // Ensure ID is set
  projectData.id = project.id;

  return <Editor initialProject={projectData} />;
}
