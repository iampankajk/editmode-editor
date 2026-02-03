
export type SidebarTab = 'media' | 'canvas' | 'text' | 'audio' | 'videos' | 'images' | 'elements' | 'record' | 'tts' | 'ai-images' | 'captions';

export interface MediaAsset {
  id: string;
  file?: File;
  url?: string;
  type: 'video' | 'image' | 'audio' | 'text' | 'element'; 
  duration: number;
  name: string;
  elementType?: 'shape' | 'sticker' | 'emoji' | 'gif';
}

export interface CropData {
  x: number;      
  y: number;      
  width: number;  
  height: number; 
}

export interface Keyframe {
  id: string;
  time: number;
  value: number;
  ease?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

export type TransitionType = 'none' | 'fade' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown' | 'zoomIn' | 'zoomOut' | 'wipeLeft' | 'wipeRight';

export interface TransitionConfig {
    type: TransitionType;
    duration: number;
}

export interface ClipProperties {
  x?: number;
  y?: number;
  rotation: number; 
  scale: number; 
  flipH: boolean;
  flipV: boolean;
  fit: 'contain' | 'cover';
  crop?: CropData; 
  
  opacity?: number;     
  brightness?: number;  
  contrast?: number;    
  saturation?: number;  
  hue?: number;         
  blur?: number;        

  filter?: string;
  keyframes?: {
    [key: string]: Keyframe[]; 
  };
  
  // Transitions
  transitionIn?: TransitionConfig;
  transitionOut?: TransitionConfig;

  playbackRate?: number; 

  volume?: number;        
  fadeIn?: number;        
  fadeOut?: number;       
  noiseReduction?: boolean; 

  text?: string;
  fontFamily?: string;
  fontSize?: number;
  textColor?: string;
  backgroundColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontStyle?: 'normal' | 'italic';
  fontWeight?: 'normal' | 'bold';
  textDecoration?: 'none' | 'underline';
  
  lineHeight?: number;    
  letterSpacing?: number; 
  textTransform?: 'none' | 'uppercase' | 'lowercase';
}

export interface TimelineClip {
  id: string;
  assetId: string;
  start: number;
  duration: number;
  offset: number;
  trackId: string;
  properties: ClipProperties;
}

export interface Track {
  id: string;
  name: string;
  clips: TimelineClip[];
  isMuted?: boolean;
  isHidden?: boolean;
  isLocked?: boolean;
}

export interface CanvasSettings {
  width: number;
  height: number;
  backgroundColor: string;
}

export interface TimelineState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  zoom: number;
}

// --- Worker Messages ---

export type WorkerMessage = 
  | { type: 'INIT'; canvas: OffscreenCanvas; width: number; height: number; backgroundColor: string }
  | { type: 'UPDATE_ASSETS'; assets: MediaAsset[] }
  | { type: 'UPDATE_TRACKS'; tracks: Track[] }
  | { type: 'UPDATE_SETTINGS'; settings: CanvasSettings }
  | { type: 'UPDATE_TIME'; time: number; isPlaying: boolean }
  | { type: 'ADD_FILE'; id: string; file: File }
  | { type: 'UPDATE_INTERACTION'; activeTool: 'pointer' | 'crop'; selectedClipId: string | null; isDragging: boolean; isResizing: boolean; dragOffset: { x: number; y: number } };