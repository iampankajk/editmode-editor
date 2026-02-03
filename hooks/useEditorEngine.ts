import { useEffect, useRef, RefObject, MutableRefObject } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { setIsPlaying, setCurrentTime } from '../store/slices/editorSlice';
import { MediaAsset, Track } from '../types';
import { renderCanvas } from '../services/renderer';

interface EditorEngineProps {
  canvasRef: RefObject<HTMLCanvasElement>;
  assets: MediaAsset[];
  tracks: Track[];
  duration: number;
  onUpdateAsset: (id: string, updates: Partial<MediaAsset>) => void;
  isDraggingRef: MutableRefObject<boolean>;
  isResizingRef: MutableRefObject<boolean>;
  dragOffsetRef: MutableRefObject<{ x: number; y: number }>;
}

export const useEditorEngine = ({
  canvasRef,
  assets,
  tracks,
  duration,
  onUpdateAsset,
  isDraggingRef,
  isResizingRef,
  dragOffsetRef
}: EditorEngineProps) => {
  const dispatch = useDispatch();
  
  // Selectors
  const { isPlaying, currentTime, activeTool, selectedClipId, playbackSpeed } = useSelector(
    (state: RootState) => state.editor
  );
  const canvasSettings = useSelector((state: RootState) => state.project.present.canvas);

  // Resource Caches
  const mediaElementsRef = useRef<Map<string, HTMLMediaElement | HTMLImageElement>>(new Map());
  const audioElementCache = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Mutable state ref to access latest values inside the animation loop without restarting it
  const stateRef = useRef({
      isPlaying,
      currentTime,
      playbackSpeed,
      duration,
      assets,
      tracks,
      canvasSettings,
      activeTool,
      selectedClipId
  });

  // Sync stateRef with Redux state
  useEffect(() => {
      stateRef.current = {
          isPlaying,
          currentTime,
          playbackSpeed,
          duration,
          assets,
          tracks,
          canvasSettings,
          activeTool,
          selectedClipId
      };
  }, [isPlaying, currentTime, playbackSpeed, duration, assets, tracks, canvasSettings, activeTool, selectedClipId]);

  // --- 1. Resource Management (Load Videos/Images) ---
  useEffect(() => {
    // Load Images
    assets.filter(a => a.type === 'image' || a.type === 'element').forEach(a => {
        if (!mediaElementsRef.current.has(a.id) && a.url) {
            const img = new Image();
            img.src = a.url;
            img.crossOrigin = "anonymous";
            mediaElementsRef.current.set(a.id, img);
        }
    });

    // Load Videos
    assets.filter(a => a.type === 'video').forEach(a => {
        if (!mediaElementsRef.current.has(a.id) && a.url) {
            const vid = document.createElement('video');
            vid.src = a.url;
            vid.crossOrigin = "anonymous";
            // vid.muted = true; // REMOVED: Do not force mute here, we manage it in the loop
            // However, browsers block unmuted autoplay. We might need to mute initially and unmute on user interaction/play.
            // We'll default to muted to be safe for loading, but unmute during playback logic.
            vid.muted = true; 
            vid.playsInline = true;
            vid.preload = 'auto';
            vid.load();
            mediaElementsRef.current.set(a.id, vid);
        }
    });

    // Cleanup removed assets
    const activeIds = new Set(assets.map(a => a.id));
    for (const [id, el] of mediaElementsRef.current) {
        if (!activeIds.has(id)) {
            if (el instanceof HTMLVideoElement) {
                el.pause();
                el.src = "";
                el.load();
            }
            mediaElementsRef.current.delete(id);
        }
    }
  }, [assets]);

  // --- 2. Main Render Loop ---
  useEffect(() => {
      let animationFrameId: number;
      let lastTime = performance.now();

      const loop = () => {
          const now = performance.now();
          const dt = (now - lastTime) / 1000;
          lastTime = now;

          const currentState = stateRef.current;
          let newTime = currentState.currentTime;

          // 2.1 Update Time
          if (currentState.isPlaying) {
              newTime = currentState.currentTime + (dt * currentState.playbackSpeed);
              if (newTime >= currentState.duration) {
                  newTime = currentState.duration;
                  dispatch(setIsPlaying(false));
              }
              dispatch(setCurrentTime(newTime));
              // Optimistically update ref for sync logic in this same frame
              stateRef.current.currentTime = newTime; 
          }

          // 2.2 Sync Video Elements
          currentState.tracks.forEach(track => {
              if (track.isHidden) return;
              track.clips.forEach(clip => {
                  const asset = currentState.assets.find(a => a.id === clip.assetId);
                  if (asset && asset.type === 'video') {
                      const vid = mediaElementsRef.current.get(asset.id) as HTMLVideoElement;
                      if (vid) {
                          // Calculate exact video time
                          const isVisible = newTime >= clip.start && newTime < clip.start + clip.duration;
                          
                          if (isVisible) {
                              const videoTime = (newTime - clip.start) * (clip.properties.playbackRate || 1) + clip.offset;
                              const playbackRate = (clip.properties.playbackRate || 1) * currentState.playbackSpeed;

                              // Volume Management
                              const volume = (clip.properties.volume ?? 100) / 100;
                              const shouldMute = track.isMuted || volume === 0;
                              
                              // Only apply volume/mute if changed to avoid thrashing
                              if (vid.muted !== shouldMute) vid.muted = shouldMute;
                              if (!shouldMute && Math.abs(vid.volume - volume) > 0.01) vid.volume = Math.max(0, Math.min(1, volume));

                              if (currentState.isPlaying) {
                                  // Playback logic: Try to play
                                  const drift = vid.currentTime - videoTime;
                                  if (Math.abs(drift) > 0.5) {
                                      vid.currentTime = videoTime;
                                  }
                                  
                                  if (vid.playbackRate !== playbackRate) {
                                      vid.playbackRate = playbackRate;
                                  }
                                  
                                  if (vid.paused) vid.play().catch(() => {});
                              } else {
                                  // Scrub logic: Precise seek
                                  vid.pause();
                                  if (Math.abs(vid.currentTime - videoTime) > 0.05) {
                                      vid.currentTime = videoTime;
                                  }
                              }
                          } else {
                              vid.pause();
                          }
                      }
                  }
              });
          });

          // 2.3 Sync Audio Elements (Separate for robustness)
          currentState.assets.filter(a => a.type === 'audio').forEach(asset => {
               let el = audioElementCache.current.get(asset.id);
               if (!el) {
                   el = new Audio(asset.url);
                   audioElementCache.current.set(asset.id, el);
               }
               
               const track = currentState.tracks.find(t => t.clips.some(c => c.assetId === asset.id));
               const clip = track?.clips.find(c => c.assetId === asset.id);
               
               if (clip && newTime >= clip.start && newTime < clip.start + clip.duration && !track.isMuted) {
                   el.volume = (clip.properties.volume || 100) / 100;
                   if (currentState.isPlaying) {
                       const seekTime = (newTime - clip.start) + clip.offset;
                       if (Math.abs(el.currentTime - seekTime) > 0.3) el.currentTime = seekTime;
                       el.playbackRate = currentState.playbackSpeed;
                       if (el.paused) el.play().catch(() => {});
                   } else {
                       el.pause();
                   }
               } else {
                   el.pause();
               }
          });

          // 2.4 Render Canvas
          if (canvasRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              if (ctx) {
                  renderCanvas(
                      ctx,
                      currentState.canvasSettings,
                      currentState.tracks,
                      currentState.assets,
                      newTime,
                      mediaElementsRef.current,
                      {
                          activeTool: currentState.activeTool,
                          selectedClipId: currentState.selectedClipId,
                          isDragging: isDraggingRef.current,
                          isResizing: isResizingRef.current,
                          dragOffset: dragOffsetRef.current
                      }
                  );
              }
          }

          animationFrameId = requestAnimationFrame(loop);
      };

      animationFrameId = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(animationFrameId);
  }, []); // Run once on mount

  return {
      mediaElementsRef, 
      exportTimeRef: useRef(0),
      contentDuration: duration,
      getMediaElement: (id: string) => mediaElementsRef.current.get(id) || null,
      getVideoDimensions: (id: string) => {
          const el = mediaElementsRef.current.get(id);
          if (el instanceof HTMLVideoElement) return { width: el.videoWidth, height: el.videoHeight };
          return null;
      }
  };
};