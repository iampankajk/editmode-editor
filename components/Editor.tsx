'use client';

import { useEffect, useState, FC } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Sidebar from './Sidebar';
import Header from './Header';
import Workspace from './Workspace';
import Timeline from './Timeline';
import { SidebarTab, MediaAsset, TimelineClip, CanvasSettings } from '../types';
import { RootState } from '../store/store';
import { generateId } from '../lib/utils';
import { loadAssetsFromDB, loadStateFromLocal, saveStateToLocal } from '../lib/persistence';
import { Loader2 } from 'lucide-react';

import { 
  setActiveTab, 
  setActiveTool,
  setIsPlaying, 
  setCurrentTime, 
  setSelectedClipId 
} from '../store/slices/editorSlice';
import { 
  loadProject,
  addAssets, 
  updateAsset,
  addClip, 
  updateClip, 
  deleteClip, 
  splitClip,
  updateCanvas,
  undo,
  redo
} from '../store/slices/projectSlice';

interface EditorProps {
  initialProject?: any;
  isDemo?: boolean;
}

const Editor: FC<EditorProps> = ({ initialProject, isDemo = false }) => {
  const dispatch = useDispatch();
  const [isLoaded, setIsLoaded] = useState(false);

  // Selectors
  const activeTab = useSelector((state: RootState) => state.editor.activeTab);
  const activeTool = useSelector((state: RootState) => state.editor.activeTool);
  const isPlaying = useSelector((state: RootState) => state.editor.isPlaying);
  const currentTime = useSelector((state: RootState) => state.editor.currentTime);
  const selectedClipId = useSelector((state: RootState) => state.editor.selectedClipId);
  const isMagnetic = useSelector((state: RootState) => state.editor.isMagnetic);
  
  // Project Data
  const projectPresent = useSelector((state: RootState) => state.project.present);
  const assets = projectPresent.assets;
  const tracks = projectPresent.tracks;
  const canvasSettings = projectPresent.canvas;

  // --- HYDRATION ---
  useEffect(() => {
    const hydrate = async () => {
        try {
            if (initialProject) {
                 // 1. Restore Assets (re-create blobs if needed or use URLs)
                 // For now, we assume URLs are preserved or re-generated.
                 // If we had local blobs, we try to restore them via IDB if they match IDs.
                 
                 const assetBlobs = await loadAssetsFromDB();
                 const restoredAssets = initialProject.assets.map((asset: MediaAsset) => {
                     if (assetBlobs[asset.id]) {
                         const blob = assetBlobs[asset.id];
                         const newUrl = URL.createObjectURL(blob);
                         const file = new File([blob], asset.name, { type: blob.type });
                         return { ...asset, url: newUrl, file };
                     }
                     return asset;
                 });

                 dispatch(loadProject({ ...initialProject, assets: restoredAssets }));
            } else {
                // Fallback to local storage if no initialProject (e.g. direct access to /editor - legacy)
                // Or we could redirect/show error.
                // For now, let's try local.
                const localState = loadStateFromLocal();
                const assetBlobs = await loadAssetsFromDB();
                
                if (localState && localState.project) {
                     const project = localState.project;
                     const restoredAssets = project.assets.map((asset: MediaAsset) => {
                         if (assetBlobs[asset.id]) {
                             const blob = assetBlobs[asset.id];
                             const newUrl = URL.createObjectURL(blob);
                             const file = new File([blob], asset.name, { type: blob.type });
                             return { ...asset, url: newUrl, file };
                         }
                         return asset;
                     });
                     dispatch(loadProject({ ...project, assets: restoredAssets }));
                }
            }
        } catch (e) {
            console.error("Hydration failed", e);
        } finally {
            setIsLoaded(true);
        }
    };
    hydrate();
  }, [dispatch, initialProject]);

  // --- AUTOSAVE ---
  useEffect(() => {
      if (!isLoaded) return;
      
      const timeout = setTimeout(() => {
          // Save only the project metadata (present state)
          // We don't save 'past/future' to save space
          saveStateToLocal({
              project: projectPresent
          });
      }, 1000); // Debounce 1s
      
      return () => clearTimeout(timeout);
  }, [projectPresent, isLoaded]);

  // Derived State (Duration)
  let maxDuration = 0;
  tracks.forEach(track => {
    track.clips.forEach(clip => {
      const end = clip.start + clip.duration;
      if (end > maxDuration) maxDuration = end;
    });
  });
  const duration = Math.max(maxDuration + 10, 30);

  // Handlers
  const handleSetActiveTab = (tab: SidebarTab) => {
    dispatch(setActiveTab(tab));
    dispatch(setSelectedClipId(null));
  };

  const handleSetActiveTool = (tool: 'pointer' | 'crop') => dispatch(setActiveTool(tool));
  const handleSetIsPlaying = (playing: boolean) => dispatch(setIsPlaying(playing));
  const handleSetCurrentTime = (time: number) => dispatch(setCurrentTime(time));
  const handleSetSelectedClipId = (id: string | null) => dispatch(setSelectedClipId(id));

  const handleAddAssets = (newAssets: MediaAsset[]) => {
    dispatch(addAssets(newAssets));
  };

  const handleUpdateAsset = (id: string, updates: Partial<MediaAsset>) => {
    dispatch(updateAsset({ id, updates }));
  };

  const handleAddClipToTrack = (assetId: string, trackId: string, time: number) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    const newClip: TimelineClip = {
      id: generateId(),
      assetId: asset.id,
      start: time,
      duration: asset.duration,
      offset: 0,
      trackId: trackId,
      properties: {
        x: 0, y: 0,
        rotation: 0,
        scale: 1,
        flipH: false,
        flipV: false,
        fit: 'contain',
        opacity: 100,
        brightness: 0,
        contrast: 0,
        saturation: 0,
        hue: 0,
        blur: 0,
        playbackRate: 1,
        volume: 100,
        fadeIn: 0,
        fadeOut: 0,
        noiseReduction: false
      }
    };
    dispatch(addClip(newClip));
  };

  // Create a new Text Asset and Clip at specific time/track
  const handleAddTextClipToTrack = (style: any, trackId: string, time: number) => {
      const assetId = `text-${generateId()}`;
      const asset: MediaAsset = {
          id: assetId,
          type: 'text',
          name: style.text || 'Text',
          duration: 5
      };
      dispatch(addAssets([asset]));
      
      const newClip: TimelineClip = {
          id: generateId(),
          assetId: assetId,
          trackId: trackId,
          start: time,
          duration: 5,
          offset: 0,
          properties: {
              ...style,
              x: 0, y: 0, scale: 1, rotation: 0, flipH: false, flipV: false, fit: 'contain',
              opacity: 100, brightness: 0, contrast: 0, saturation: 0, hue: 0, blur: 0,
              playbackRate: 1, volume: 100, fadeIn: 0, fadeOut: 0, noiseReduction: false
          }
      };
      dispatch(addClip(newClip));
  };

  const handleAddClip = (clip: TimelineClip) => {
      dispatch(addClip(clip));
  };

  const handleUpdateClip = (trackId: string, clipId: string, updates: Partial<TimelineClip>) => {
    dispatch(updateClip({ trackId, clipId, updates }));
  };

  const handleUpdateCanvas = (updates: Partial<CanvasSettings>) => {
    dispatch(updateCanvas(updates));
  };

  const handleSplitClip = () => {
    if (!selectedClipId) return;
    const track = tracks.find(t => t.clips.some(c => c.id === selectedClipId));
    if (!track) return;
    const clip = track.clips.find(c => c.id === selectedClipId);
    if (!clip) return;
    if (currentTime > clip.start && currentTime < clip.start + clip.duration) {
      dispatch(splitClip({ clipId: selectedClipId, splitTime: currentTime }));
    }
  };

  const handleDeleteSelectedClip = () => {
    if (selectedClipId) {
      dispatch(deleteClip({ id: selectedClipId, ripple: isMagnetic }));
      dispatch(setSelectedClipId(null));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        dispatch(setIsPlaying(!isPlaying));
      }
      if (e.code === 'Delete' || e.code === 'Backspace') {
        handleDeleteSelectedClip();
      }
      if (e.code === 'KeyS') {
        handleSplitClip();
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        if (e.shiftKey) {
          dispatch(redo());
        } else {
          dispatch(undo());
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
        dispatch(redo());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, handleDeleteSelectedClip, handleSplitClip, dispatch]);

  if (!isLoaded) {
      return (
          <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-foreground gap-4">
              <Loader2 className="animate-spin text-primary" size={48} />
              <p className="text-muted-foreground font-medium">Loading Project...</p>
          </div>
      )
  }

  return (
    <div className="flex h-screen w-screen bg-background text-foreground font-sans selection:bg-primary/20">
      <Sidebar activeTab={activeTab} setActiveTab={handleSetActiveTab} />
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <Header isDemo={isDemo} />
        <Workspace 
          activeTab={activeTab}
          activeTool={activeTool}
          setActiveTool={handleSetActiveTool}
          assets={assets}
          onAddAssets={handleAddAssets}
          onUpdateAsset={handleUpdateAsset}
          tracks={tracks}
          isPlaying={isPlaying}
          setIsPlaying={handleSetIsPlaying}
          currentTime={currentTime}
          setCurrentTime={handleSetCurrentTime}
          duration={duration}
          selectedClipId={selectedClipId}
          onUpdateClip={handleUpdateClip}
          onAddClip={handleAddClipToTrack} 
          onAddTimelineClip={handleAddClip} 
          canvasSettings={canvasSettings}
          onUpdateCanvas={handleUpdateCanvas}
        >
          <Timeline 
            tracks={tracks}
            assets={assets} 
            isPlaying={isPlaying}
            onTogglePlay={() => dispatch(setIsPlaying(!isPlaying))}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSetCurrentTime}
            onAddClip={handleAddClipToTrack}
            onAddTextClip={handleAddTextClipToTrack}
            onUpdateClip={handleUpdateClip}
            selectedClipId={selectedClipId}
            onSelectClip={handleSetSelectedClipId}
            onDeleteSelectedClip={handleDeleteSelectedClip}
            onSplitClip={handleSplitClip}
          />
        </Workspace>
      </div>
    </div>
  );
};

export default Editor;