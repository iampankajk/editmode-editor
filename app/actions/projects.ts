'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function getUserProjects() {
  const session = await auth();
  if (!session?.user?.id) return [];

  try {
    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
          id: true,
          name: true,
          updatedAt: true,
          thumbnail: true
      }
    });
    return projects;
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return [];
  }
}

export async function createProject() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const initialData = {
    assets: [],
    tracks: [
      { id: 'track-1', name: 'Track 1', clips: [] },
      { id: 'track-2', name: 'Track 2', clips: [] },
      { id: 'track-3', name: 'Track 3', clips: [] }
    ],
    canvas: {
      width: 1920,
      height: 1080,
      backgroundColor: '#000000'
    }
  };

  try {
    const project = await prisma.project.create({
      data: {
        name: 'Untitled Project',
        data: JSON.stringify(initialData),
        userId: session.user.id,
      },
    });
    
    revalidatePath('/projects');
    return { success: true, id: project.id };
  } catch (error) {
    console.error('Failed to create project:', error);
    return { success: false, error: 'Failed to create project' };
  }
}

export async function getProjectById(id: string) {
    const session = await auth();
    if (!session?.user?.id) return null;

    try {
        const project = await prisma.project.findUnique({
            where: { 
                id,
                userId: session.user.id // Ensure ownership
            }
        });
        return project;
    } catch (error) {
        console.error('Failed to fetch project:', error);
        return null;
    }
}

export async function saveProject(id: string, data: any, name?: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    try {
        await prisma.project.update({
            where: { 
                id,
                userId: session.user.id
            },
            data: {
                data: JSON.stringify(data),
                ...(name && { name }),
                updatedAt: new Date()
            }
        });
        revalidatePath('/projects');
        return { success: true };
    } catch (error) {
        console.error('Failed to save project:', error);
        return { success: false, error: 'Failed to save project' };
    }
}

export async function deleteProject(id: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    try {
        await prisma.project.delete({
            where: {
                id,
                userId: session.user.id
            }
        });
        revalidatePath('/projects');
        return { success: true };
    } catch (error) {
         return { success: false, error: 'Failed to delete project' };
    }
}
