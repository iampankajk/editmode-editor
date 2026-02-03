
import { useRef, DragEvent, ReactNode, FC } from 'react';
import { MediaAsset, Track, SidebarTab, TimelineClip, CanvasSettings } from '../types';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { setIsExporting } from '../store/slices/editorSlice';

import { MediaLibrary } from './workspace/MediaLibrary';
import { TextLibrary } from './workspace/TextLibrary';
import { ElementsLibrary } from './workspace/ElementsLibrary'; 
import { TTSPanel } from './workspace/TTSPanel';
import { AIImagePanel } from './workspace/AIImagePanel';
import { CaptionsPanel } from './workspace/CaptionsPanel';
import { RecordPanel } from './workspace/RecordPanel';
import { CropTool } from './workspace/CropTool';
import { VideoInspector } from './workspace/VideoInspector';
import { CanvasPanel } from './workspace/CanvasPanel';
import { generateId } from '../lib/utils';
import { saveAssetToDB } from '../lib/persistence';

// Imported Hooks (Clean Architecture)
import { useEditorEngine } from '../hooks/useEditorEngine';
import { useCanvasInteraction } from '../hooks/useCanvasInteraction';

interface WorkspaceProps {
  activeTab: SidebarTab;
  activeTool: 'pointer' | 'crop';
  setActiveTool: (tool: 'pointer' | 'crop') => void;
  assets: MediaAsset[];
  onAddAssets: (assets: MediaAsset[]) => void;
  onUpdateAsset: (id: string, updates: Partial<MediaAsset>) => void;
  tracks: Track[];
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  duration: number;
  selectedClipId: string | null;
  onUpdateClip: (trackId: string, clipId: string, updates: Partial<TimelineClip>) => void;
  onAddClip: (assetId: string, trackId: string, time: number) => void;
  onAddTimelineClip: (clip: TimelineClip) => void;
  canvasSettings: CanvasSettings;
  onUpdateCanvas: (updates: Partial<CanvasSettings>) => void;
  children?: ReactNode; 
}

const Workspace: FC<WorkspaceProps> = ({
  activeTab,
  activeTool,
  setActiveTool,
  assets,
  onAddAssets,
  onUpdateAsset,
  tracks,
  isPlaying,
  currentTime,
  duration,
  selectedClipId,
  onUpdateClip,
  onAddTimelineClip,
  canvasSettings,
  onUpdateCanvas,
  children
}) => {
  const isExporting = useSelector((state: RootState) => state.editor.isExporting);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Shared Mutable State (Lifted from hooks to allow sharing)
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // REPLACED useMemo with inline calculation
  let selectedClip: { clip: TimelineClip; track: Track } | null = null;
  if (selectedClipId) {
      for (const track of tracks) {
          const clip = track.clips.find(c => c.id === selectedClipId);
          if (clip) {
              selectedClip = { clip, track };
              break;
          }
      }
  }

  // Determine if we should show the Captions Panel
  // We show it if we are in the captions tab AND (no clip is selected OR the selected clip is a video/audio source)
  // If a text/image clip is selected, we fall through to VideoInspector to allow editing.
  const isCaptioningFlow = activeTab === 'captions' && (
      !selectedClip || 
      ['video', 'audio'].includes(assets.find(a => a.id === selectedClip?.clip.assetId)?.type || '')
  );

  // --- LAYER 2: APPLICATION ENGINE HOOK ---
  // Handles Render Loop, Audio, Export
  // Receives refs to read current interaction state during render loop
  const { 
      mediaElementsRef: engineMediaRef,
      exportTimeRef: engineExportRef,
      contentDuration: engineDuration,
      getMediaElement: engineGetMedia,
      getVideoDimensions: engineGetDims
  } = useEditorEngine({
      canvasRef,
      assets,
      tracks,
      duration,
      onUpdateAsset,
      isDraggingRef,
      isResizingRef,
      dragOffsetRef
  });

  // --- LAYER 3: INTERACTION HOOK ---
  // Handles Mouse Input on Canvas
  // Receives refs to write interaction state
  const interaction = useCanvasInteraction({
      canvasRef,
      canvasSettings,
      assets,
      tracks,
      onUpdateClip,
      mediaElementsRef: engineMediaRef,
      isDraggingRef,
      isResizingRef,
      dragOffsetRef
  });

  // Handlers
  const handleFilesSelected = (files: FileList) => {
      const newAssets: MediaAsset[] = [];
      Array.from(files).forEach(file => {
          const url = URL.createObjectURL(file);
          const assetId = generateId();
          
          // Persistence: Save file to IndexedDB for cross-session access
          saveAssetToDB(assetId, file);

          const isVideo = file.type.startsWith('video');
          let isAudio = file.type.startsWith('audio');
          if (!isAudio && !isVideo && activeTab === 'audio') isAudio = true; 
          
          // Determine initial duration: 0 for media needing analysis, 5 for images
          const defaultDuration = (isVideo || isAudio) ? 0 : 5;
          
          const asset: MediaAsset = { 
              id: assetId, file, url, 
              type: isVideo ? 'video' : (isAudio ? 'audio' : 'image'), 
              duration: defaultDuration, 
              name: file.name 
          };
          
          newAssets.push(asset);

          // Metadata Extraction for correct duration
          if (isVideo || isAudio) {
              const media = isVideo ? document.createElement('video') : document.createElement('audio');
              media.preload = 'metadata';
              media.onloadedmetadata = () => {
                  if (Number.isFinite(media.duration)) {
                      onUpdateAsset(assetId, { duration: media.duration });
                  }
                  // Cleanup
                  media.src = '';
                  media.remove();
              };
              media.onerror = () => {
                  console.warn(`Failed to load metadata for ${file.name}`);
              };
              media.src = url;
          }
      });
      onAddAssets(newAssets);
  };

  const handleDragStart = (e: DragEvent, assetId: string, type: string) => {
      const payload = { type: 'NEW_ASSET', assetId, assetType: type };
      e.dataTransfer.setData('application/json', JSON.stringify(payload));
      e.dataTransfer.effectAllowed = 'all';
      const ghost = document.createElement('div'); ghost.style.width = '100px'; ghost.style.height = '60px'; ghost.style.backgroundColor = '#3b82f6'; ghost.style.position = 'absolute'; ghost.style.top = '-1000px';
      document.body.appendChild(ghost); e.dataTransfer.setDragImage(ghost, 0, 0); setTimeout(() => document.body.removeChild(ghost), 0);
  };

  const handleAddText = (stylePreset: any) => {
      const textId = `text-${generateId()}`;
      
      // Ensure we create a media asset so the renderer can find it by ID
      const textAsset: MediaAsset = {
          id: textId,
          type: 'text',
          name: stylePreset.text || 'Text',
          duration: 5
      };
      onAddAssets([textAsset]);

      const track = tracks[tracks.length - 1];
      if (track) {
          const newClip: TimelineClip = {
              id: generateId(),
              assetId: textId,
              trackId: track.id,
              start: currentTime,
              duration: 5, 
              offset: 0,
              properties: {
                  x: 0, y: 0,
                  rotation: 0, scale: 1, flipH: false, flipV: false, fit: 'contain',
                  opacity: 100, brightness: 0, contrast: 0, saturation: 0, hue: 0, blur: 0,
                  playbackRate: 1, volume: 100, fadeIn: 0, fadeOut: 0, noiseReduction: false,
                  text: stylePreset.text,
                  fontSize: stylePreset.fontSize,
                  fontFamily: stylePreset.fontFamily || 'Arial',
                  fontWeight: stylePreset.fontWeight || 'normal',
                  fontStyle: stylePreset.fontStyle || 'normal',
                  textDecoration: stylePreset.textDecoration || 'none',
                  textColor: stylePreset.textColor || '#ffffff',
                  backgroundColor: stylePreset.backgroundColor,
                  textAlign: 'center',
                  lineHeight: 1.2,
                  letterSpacing: 0,
                  textTransform: 'none'
              }
          };
          onAddTimelineClip(newClip);
      }
  };

  const handleAddElement = (url: string, type: 'sticker' | 'emoji' | 'gif' | 'shape') => {
      const elementId = `element-${generateId()}`;
      const asset: MediaAsset = {
          id: elementId, url, type: 'element', name: type.charAt(0).toUpperCase() + type.slice(1),
          duration: 3, elementType: type
      };
      onAddAssets([asset]);
      const track = tracks[tracks.length - 1];
      if (track) {
          const newClip: TimelineClip = {
              id: generateId(), assetId: elementId, trackId: track.id,
              start: currentTime, duration: 3, offset: 0,
              properties: { x: 0, y: 0, rotation: 0, scale: 1, flipH: false, flipV: false, fit: 'contain', opacity: 100, brightness: 0, contrast: 0, saturation: 0, hue: 0, blur: 0, playbackRate: 1 }
          };
          onAddTimelineClip(newClip);
      }
  };

  return (
    <div 
        className="flex flex-1 bg-background relative overflow-hidden" 
        onMouseDown={() => {
            // Ensure audio context is ready on user interaction
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            // @ts-ignore
            if (window.audioContext?.state === 'suspended') {
                // @ts-ignore
                window.audioContext.resume();
            }
        }}
    >
      {isExporting && (
          <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center text-white backdrop-blur-sm">
              <div className="mb-4 h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <h2 className="text-2xl font-bold mb-2">Rendering Video...</h2>
              <p className="text-muted-foreground mb-4">Please do not close this tab.</p>
              <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                      className="h-full bg-primary transition-all duration-200 ease-linear"
                      style={{ width: `${(engineExportRef.current / engineDuration) * 100}%` }}
                  />
              </div>
          </div>
      )}

      {/* LEFT PANEL: TOOLS & LIBRARY (Full Height) */}
      <div className="w-[360px] flex flex-col border-r border-border bg-card relative shrink-0 z-20 h-full">
        {activeTool === 'crop' ? (
            <CropTool 
                selectedClip={selectedClip}
                onUpdateClip={onUpdateClip}
                onExit={() => setActiveTool('pointer')}
                getAsset={interaction.getAsset}
                getVideoDimensions={engineGetDims}
            />
        ) : isCaptioningFlow ? (
            <CaptionsPanel />
        ) : selectedClip ? (
            <VideoInspector 
                selectedClip={selectedClip}
                onUpdateClip={onUpdateClip}
                onEnterCrop={() => setActiveTool('crop')}
            />
        ) : activeTab === 'text' ? (
            <TextLibrary onAddText={handleAddText} />
        ) : activeTab === 'elements' ? ( 
            <ElementsLibrary onAddElement={handleAddElement} />
        ) : activeTab === 'tts' ? (
            <TTSPanel onAddAssets={onAddAssets} />
        ) : activeTab === 'ai-images' ? (
            <AIImagePanel onAddAssets={onAddAssets} />
        ) : activeTab === 'canvas' ? (
            <CanvasPanel settings={canvasSettings} onUpdate={onUpdateCanvas} />
        ) : activeTab === 'record' ? (
            <RecordPanel />
        ) : (
            <MediaLibrary 
                activeTab={activeTab}
                assets={assets}
                onFilesSelected={handleFilesSelected}
                onDragStart={handleDragStart}
                onAddAssets={onAddAssets}
            />
        )}
      </div>

      {/* RIGHT COLUMN: CANVAS & TIMELINE */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
          {/* Canvas Area */}
          <div className="flex-1 bg-muted/5 flex items-center justify-center p-8 relative overflow-hidden">
            <div 
                ref={containerRef}
                className="shadow-2xl shadow-black/50 rounded-xl flex items-center justify-center overflow-hidden relative border border-border/20 transition-all duration-300"
                style={{ 
                    aspectRatio: `${canvasSettings.width} / ${canvasSettings.height}`,
                    maxHeight: '100%',
                    maxWidth: '100%',
                }}
                onMouseDown={interaction.handleCanvasMouseDown}
                onMouseMove={interaction.handleCanvasMouseMove}
                onMouseUp={interaction.handleCanvasMouseUp}
                onMouseLeave={interaction.handleCanvasMouseUp}
            >
                <div className="absolute inset-0 -z-10 opacity-20 pointer-events-none" 
                    style={{ backgroundImage: 'radial-gradient(#555 1px, transparent 1px)', backgroundSize: '20px 20px' }} 
                />
                <canvas 
                    ref={canvasRef} 
                    width={canvasSettings.width} 
                    height={canvasSettings.height} 
                    className="w-full h-full object-contain" 
                />
            </div>
          </div>

          {/* Timeline Area */}
          {children}
      </div>
    </div>
  );
};

export default Workspace;
