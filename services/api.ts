
import { MediaAsset } from '../types';

const API_URL = 'http://localhost:3001/api';

// Toggle this to false to attempt connecting to the real Node.js server
const USE_MOCK_BACKEND = true; 

export const api = {
  /**
   * Uploads a single file to the backend
   */
  uploadFile: async (file: File): Promise<string> => {
    if (USE_MOCK_BACKEND) {
        await new Promise(r => setTimeout(r, 1000)); // Simulate upload time
        console.log('[MockAPI] Uploaded file:', file.name);
        // In mock mode, we just return the local object URL or a fake remote URL
        // A real upload would return 'https://server.com/uploads/filename.mp4'
        return URL.createObjectURL(file); 
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Upload failed');
    
    const data = await response.json();
    return data.url;
  },

  /**
   * Saves the entire project JSON
   */
  saveProject: async (projectData: any): Promise<{ success: boolean; id: string }> => {
    // We don't use mock backend for saving anymore if we have the server action
    // But we might want to keep the signature
    const { saveProject } = await import('@/app/actions/projects');
    if (!projectData.id) throw new Error("Project ID missing");
    
    // We pass the ID separately as expected by the server action
    const result = await saveProject(projectData.id, projectData, projectData.name);
    
    if (!result.success) throw new Error(result.error || 'Failed to save project');
    return { success: true, id: projectData.id };
  }
};

/**
 * Orchestrator: Prepares project for saving by uploading local assets first
 */
export const syncProjectToBackend = async (
    project: any, 
    onProgress?: (msg: string) => void
) => {
    // 1. Clone project to avoid mutating Redux state directly during processing
    const projectCopy = JSON.parse(JSON.stringify(project));
    const assets: MediaAsset[] = projectCopy.assets;

    // 2. Identify assets that need uploading (Blob URLs)
    // We assume any URL starting with 'blob:' is local and needs upload
    const localAssets = assets.filter(a => a.url && a.url.startsWith('blob:'));

    if (localAssets.length > 0) {
        if (onProgress) onProgress(`Uploading ${localAssets.length} assets...`);
        
        // In a real app, you might want to retrieve the actual File objects from IndexedDB 
        // if they aren't in the state tree (Redux non-serializable check usually blocks Files).
        // For this implementation, we assume the persistence layer or state can provide the File.
        
        // Note: In our current Redux structure, we might not have the 'File' object in the serialized copy.
        // We rely on the app having loaded them into memory or re-fetching from our IDB helper.
        const { loadAssetsFromDB } = await import('../lib/persistence');
        const assetBlobs = await loadAssetsFromDB();

        for (const asset of localAssets) {
            const blob = assetBlobs[asset.id];
            if (blob) {
                const file = new File([blob], asset.name, { type: blob.type });
                try {
                    const remoteUrl = await api.uploadFile(file);
                    asset.url = remoteUrl; // Replace local blob with remote URL
                    console.log(`Asset ${asset.id} synced to ${remoteUrl}`);
                } catch (e) {
                    console.error(`Failed to upload asset ${asset.name}`, e);
                    // Continue? or Throw? 
                }
            }
        }
    }

    // 3. Save the JSON with remote URLs
    if (onProgress) onProgress('Saving project metadata...');
    const result = await api.saveProject(projectCopy);
    
    return result;
};
