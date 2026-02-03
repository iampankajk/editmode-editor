import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SidebarTab } from '../../types';

interface EditorState {
  activeTab: SidebarTab;
  activeTool: 'pointer' | 'crop';
  isPlaying: boolean;
  currentTime: number;
  selectedClipId: string | null;
  isExporting: boolean;
  isSidebarCollapsed: boolean;
  playbackSpeed: number;
  isSnapping: boolean; // New
  isMagnetic: boolean; // New
}

const initialState: EditorState = {
  activeTab: 'media',
  activeTool: 'pointer',
  isPlaying: false,
  currentTime: 0,
  selectedClipId: null,
  isExporting: false,
  isSidebarCollapsed: false,
  playbackSpeed: 1.0,
  isSnapping: true,
  isMagnetic: false,
};

const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    setActiveTab: (state, action: PayloadAction<SidebarTab>) => {
      state.activeTab = action.payload;
    },
    setActiveTool: (state, action: PayloadAction<'pointer' | 'crop'>) => {
      state.activeTool = action.payload;
    },
    setIsPlaying: (state, action: PayloadAction<boolean>) => {
      state.isPlaying = action.payload;
    },
    setCurrentTime: (state, action: PayloadAction<number>) => {
      state.currentTime = Math.max(0, action.payload);
    },
    setSelectedClipId: (state, action: PayloadAction<string | null>) => {
      state.selectedClipId = action.payload;
    },
    setIsExporting: (state, action: PayloadAction<boolean>) => {
      state.isExporting = action.payload;
    },
    toggleSidebar: (state) => {
      state.isSidebarCollapsed = !state.isSidebarCollapsed;
    },
    setPlaybackSpeed: (state, action: PayloadAction<number>) => {
      state.playbackSpeed = action.payload;
    },
    toggleSnapping: (state) => {
      state.isSnapping = !state.isSnapping;
    },
    toggleMagnetic: (state) => {
      state.isMagnetic = !state.isMagnetic;
    }
  },
});

export const { 
  setActiveTab, 
  setActiveTool, 
  setIsPlaying, 
  setCurrentTime, 
  setSelectedClipId,
  setIsExporting,
  toggleSidebar,
  setPlaybackSpeed,
  toggleSnapping,
  toggleMagnetic
} = editorSlice.actions;

export default editorSlice.reducer;