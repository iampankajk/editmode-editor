
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { MediaAsset, Track, TimelineClip, CanvasSettings } from '../../types';
import { generateId } from '../../lib/utils';
import { syncProjectToBackend } from '../../services/api';

interface ProjectData {
  id?: string; // New: Project ID for cloud
  assets: MediaAsset[];
  tracks: Track[];
  canvas: CanvasSettings;
}

interface ProjectState {
  past: ProjectData[];
  present: ProjectData;
  future: ProjectData[];
  isSaving: boolean; // New: Saving state
  lastSavedAt: string | null; // New: Last save timestamp
}

const initialData: ProjectData = {
  id: undefined,
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

const initialState: ProjectState = {
  past: [],
  present: initialData,
  future: [],
  isSaving: false,
  lastSavedAt: null
};

// --- Async Thunk for Cloud Saving ---
export const saveProjectToCloud = createAsyncThunk(
    'project/saveToCloud',
    async (_, { getState }) => {
        const state = getState() as any;
        const project = state.project.present;
        
        // Use the orchestrator from services/api
        const result = await syncProjectToBackend(project, (msg) => console.log(msg));
        return result;
    }
);

const pushHistory = (state: ProjectState) => {
    state.past.push({
        ...state.present,
        assets: state.present.assets,
        tracks: JSON.parse(JSON.stringify(state.present.tracks)),
        canvas: JSON.parse(JSON.stringify(state.present.canvas))
    });
    state.future = [];
};

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    loadProject: (state, action: PayloadAction<ProjectData>) => {
        state.present = action.payload;
        state.past = [];
        state.future = [];
    },
    undo: (state) => {
      if (state.past.length > 0) {
        const previous = state.past[state.past.length - 1];
        const newPast = state.past.slice(0, state.past.length - 1);
        state.future = [{
            ...state.present,
            tracks: JSON.parse(JSON.stringify(state.present.tracks)),
            canvas: JSON.parse(JSON.stringify(state.present.canvas))
        }, ...state.future];
        state.present = {
            ...previous,
            assets: state.present.assets // Preserve current assets (files)
        };
        state.past = newPast;
      }
    },
    redo: (state) => {
      if (state.future.length > 0) {
        const next = state.future[0];
        const newFuture = state.future.slice(1);
        state.past = [...state.past, {
            ...state.present,
            tracks: JSON.parse(JSON.stringify(state.present.tracks)),
            canvas: JSON.parse(JSON.stringify(state.present.canvas))
        }];
        state.present = {
            ...next,
            assets: state.present.assets
        };
        state.future = newFuture;
      }
    },
    addAssets: (state, action: PayloadAction<MediaAsset[]>) => {
      state.present.assets.push(...action.payload);
    },
    updateAsset: (state, action: PayloadAction<{ id: string; updates: Partial<MediaAsset> }>) => {
      const asset = state.present.assets.find(a => a.id === action.payload.id);
      if (asset) {
        Object.assign(asset, action.payload.updates);
        
        // Fix for "video below 1 second" issue:
        if (typeof action.payload.updates.duration === 'number' && action.payload.updates.duration > 0) {
             state.present.tracks.forEach(track => {
                 track.clips.forEach(clip => {
                     if (clip.assetId === asset.id && clip.duration === 0) {
                         clip.duration = action.payload.updates.duration!;
                     }
                 });
             });
        }
      }
    },
    addTrack: (state) => {
        pushHistory(state);
        const newTrack: Track = {
            id: `track-${generateId()}`,
            name: 'Track',
            clips: [],
            isLocked: false,
            isHidden: false,
            isMuted: false
        };
        state.present.tracks.push(newTrack);
    },
    reorderTracks: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
        pushHistory(state);
        const { fromIndex, toIndex } = action.payload;
        if (fromIndex >= 0 && fromIndex < state.present.tracks.length && toIndex >= 0 && toIndex < state.present.tracks.length) {
             const [removed] = state.present.tracks.splice(fromIndex, 1);
             state.present.tracks.splice(toIndex, 0, removed);
        }
    },
    toggleTrackLock: (state, action: PayloadAction<string>) => {
         const track = state.present.tracks.find(t => t.id === action.payload);
         if (track) track.isLocked = !track.isLocked;
    },
    toggleTrackVisibility: (state, action: PayloadAction<string>) => {
         const track = state.present.tracks.find(t => t.id === action.payload);
         if (track) track.isHidden = !track.isHidden;
    },
    addClip: (state, action: PayloadAction<TimelineClip>) => {
        pushHistory(state);
        const track = state.present.tracks.find(t => t.id === action.payload.trackId);
        if (track) {
            track.clips.push(action.payload);
        }
    },
    updateClip: (state, action: PayloadAction<{ trackId: string; clipId: string; updates: Partial<TimelineClip> }>) => {
         // No history push here for performance during drag
         const track = state.present.tracks.find(t => t.id === action.payload.trackId);
         if (track) {
             const clip = track.clips.find(c => c.id === action.payload.clipId);
             if (clip) {
                 Object.assign(clip, action.payload.updates);
                 // Handle Track Change
                 if (action.payload.updates.trackId && action.payload.updates.trackId !== action.payload.trackId) {
                     const newTrack = state.present.tracks.find(t => t.id === action.payload.updates.trackId);
                     if (newTrack) {
                         track.clips = track.clips.filter(c => c.id !== action.payload.clipId);
                         newTrack.clips.push(clip);
                     }
                 }
             }
         }
    },
    deleteClip: (state, action: PayloadAction<{ id: string; ripple?: boolean }>) => {
        pushHistory(state);
        const { id, ripple } = action.payload;

        let targetClip: TimelineClip | null = null;
        let targetTrackId: string | null = null;

        // Find the clip before deleting to know its size for ripple
        for (const track of state.present.tracks) {
            const clip = track.clips.find(c => c.id === id);
            if (clip) {
                targetClip = clip;
                targetTrackId = track.id;
                break;
            }
        }

        // Delete clip
        state.present.tracks.forEach(track => {
            track.clips = track.clips.filter(c => c.id !== id);
        });

        // Ripple Effect
        if (ripple && targetClip && targetTrackId) {
            const track = state.present.tracks.find(t => t.id === targetTrackId);
            if (track) {
                const deletedEnd = targetClip.start + targetClip.duration;
                track.clips.forEach(clip => {
                    // Shift clips that started after the deleted clip
                    if (clip.start >= targetClip!.start) {
                        const newStart = Math.max(0, clip.start - targetClip!.duration);
                        clip.start = newStart;
                    }
                });
            }
        }
    },
    splitClip: (state, action: PayloadAction<{ clipId: string; splitTime: number }>) => {
        pushHistory(state);
        const { clipId, splitTime } = action.payload;
        
        for (const track of state.present.tracks) {
            const clipIndex = track.clips.findIndex(c => c.id === clipId);
            if (clipIndex !== -1) {
                const clip = track.clips[clipIndex];
                if (splitTime > clip.start && splitTime < clip.start + clip.duration) {
                    const relativeTime = splitTime - clip.start;
                    const assetTime = clip.offset + relativeTime;
                    
                    const newClip: TimelineClip = {
                        ...JSON.parse(JSON.stringify(clip)),
                        id: generateId(),
                        start: splitTime,
                        duration: clip.duration - relativeTime,
                        offset: assetTime
                    };
                    
                    clip.duration = relativeTime;
                    track.clips.splice(clipIndex + 1, 0, newClip);
                }
                break;
            }
        }
    },
    updateCanvas: (state, action: PayloadAction<Partial<CanvasSettings>>) => {
        Object.assign(state.present.canvas, action.payload);
    }
  },
  extraReducers: (builder) => {
      builder.addCase(saveProjectToCloud.pending, (state) => {
          state.isSaving = true;
      });
      builder.addCase(saveProjectToCloud.fulfilled, (state, action) => {
          state.isSaving = false;
          state.lastSavedAt = new Date().toISOString();
          if (action.payload.id) {
              state.present.id = action.payload.id;
          }
      });
      builder.addCase(saveProjectToCloud.rejected, (state) => {
          state.isSaving = false;
      });
  }
});

export const {
    loadProject, undo, redo,
    addAssets, updateAsset,
    addTrack, reorderTracks, toggleTrackLock, toggleTrackVisibility,
    addClip, updateClip, deleteClip, splitClip,
    updateCanvas
} = projectSlice.actions;

export default projectSlice.reducer;
