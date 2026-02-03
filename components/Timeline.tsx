import { useRef, useState, useEffect, UIEvent, DragEvent, MouseEvent, FC } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Play, Pause, SkipBack, SkipForward, Copy, Trash2, Minus, Plus, 
  Scissors, GripVertical, Magnet, Unlink, Link,
  Lock, Unlock, Eye, EyeOff, Layers,
  FileVideo, Image as ImageIcon, Music, Type, Shapes
} from 'lucide-react';
import { Track, TimelineClip, MediaAsset } from '../types';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Waveform } from './Waveform';
import { 
  addTrack, 
  reorderTracks, 
  toggleTrackLock, 
  toggleTrackVisibility 
} from '../store/slices/projectSlice';
import { setPlaybackSpeed, toggleSnapping, toggleMagnetic } from '../store/slices/editorSlice';
import { RootState } from '../store/store';
import { cn } from '../lib/utils';

interface TimelineProps {
  tracks: Track[];
  assets: MediaAsset[]; 
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  onAddClip: (assetId: string, trackId: string, time: number) => void;
  onAddTextClip?: (style: any, trackId: string, time: number) => void; // Added Prop
  onUpdateClip: (trackId: string, clipId: string, updates: Partial<TimelineClip>) => void;
  selectedClipId: string | null;
  onSelectClip: (id: string | null) => void;
  onDeleteSelectedClip: () => void;
  onSplitClip: () => void;
}

const Timeline: FC<TimelineProps> = ({
  tracks,
  assets,
  isPlaying,
  onTogglePlay,
  currentTime,
  duration,
  onSeek,
  onAddClip,
  onAddTextClip,
  onUpdateClip,
  selectedClipId,
  onSelectClip,
  onDeleteSelectedClip,
  onSplitClip
}) => {
  const dispatch = useDispatch();
  const playbackSpeed = useSelector((state: RootState) => state.editor.playbackSpeed);
  const isSnapping = useSelector((state: RootState) => state.editor.isSnapping);
  const isMagnetic = useSelector((state: RootState) => state.editor.isMagnetic);
  
  // Refs for synced scrolling
  const headersRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  
  // Resize State
  const [height, setHeight] = useState(360);
  const [isResizing, setIsResizing] = useState(false);
  const [zoom, setZoom] = useState(10); // 0 to 100

  // Track Dragging State
  const [draggedTrackIndex, setDraggedTrackIndex] = useState<number | null>(null);
  
  // Snapping UI State
  const [snapLine, setSnapLine] = useState<number | null>(null);

  // Trim State
  const [trimming, setTrimming] = useState<{
      clipId: string;
      trackId: string;
      type: 'start' | 'end';
      initialStart: number;
      initialDuration: number;
      initialOffset: number;
      assetDuration: number;
      startX: number;
  } | null>(null);

  // REPLACED useMemo with inline calculation
  const pixelsPerSecond = Math.max(10, zoom * 2);
  const timelineWidth = Math.max(duration * pixelsPerSecond, 100); 

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };
  
  // REPLACED useMemo with inline calculation for Dynamic Ruler Ticks
  let rulerTicks: number[] = [];
  if (duration) {
      const targetSpacing = 100; 
      const rawInterval = targetSpacing / pixelsPerSecond;
      const validIntervals = [1, 2, 5, 10, 15, 30, 60, 300, 600];
      const interval = validIntervals.find(i => i >= rawInterval) || 600;
      const ticks = [];
      for (let i = 0; i <= duration; i += interval) { ticks.push(i); }
      rulerTicks = ticks;
  }

  // Resize Effect
  useEffect(() => {
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!isResizing) return;
      const newHeight = window.innerHeight - e.clientY;
      const vh = window.innerHeight;
      if (newHeight >= vh * 0.2 && newHeight <= vh * 0.6) {
        setHeight(newHeight);
      }
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Sync Scrolling
  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollLeft } = e.currentTarget;
      if (headersRef.current) {
          headersRef.current.scrollTop = scrollTop;
      }
      if (rulerRef.current) {
          rulerRef.current.scrollLeft = scrollLeft;
      }
  };

  // Track Reordering Handlers
  const handleTrackDragStart = (e: DragEvent, index: number) => {
      setDraggedTrackIndex(index);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleTrackDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
  };

  const handleTrackDrop = (e: DragEvent, targetIndex: number) => {
      e.preventDefault();
      if (draggedTrackIndex === null) return;
      if (draggedTrackIndex !== targetIndex) {
          dispatch(reorderTracks({ fromIndex: draggedTrackIndex, toIndex: targetIndex }));
      }
      setDraggedTrackIndex(null);
  };

  // Helper: Snap Logic
  const getSnappedTime = (targetTime: number, ignoreClipId?: string) => {
    if (!isSnapping) return { time: targetTime, snapped: false };
    
    const SNAP_THRESHOLD_PX = 15;
    const snapThreshold = SNAP_THRESHOLD_PX / pixelsPerSecond;
    
    const snapPoints = new Set<number>();
    snapPoints.add(0);
    snapPoints.add(currentTime);
    snapPoints.add(duration);
    
    tracks.forEach(t => {
        t.clips.forEach(c => {
            if (c.id === ignoreClipId) return;
            snapPoints.add(c.start);
            snapPoints.add(c.start + c.duration);
        });
    });

    let bestPoint = targetTime;
    let minDiff = Infinity;

    snapPoints.forEach(point => {
        const diff = Math.abs(point - targetTime);
        if (diff < minDiff) {
            minDiff = diff;
            bestPoint = point;
        }
    });

    if (minDiff <= snapThreshold) {
        return { time: bestPoint, snapped: true };
    }

    return { time: targetTime, snapped: false };
  };

  // Seek Handlers
  const calculateTimeFromEvent = (clientX: number, rect: DOMRect, scrollLeft: number) => {
      const x = clientX - rect.left + scrollLeft;
      const time = Math.max(0, Math.min(duration, x / pixelsPerSecond));
      // Snap playhead if enabled (optional, but feels good)
      const snapped = getSnappedTime(time);
      return snapped.snapped ? snapped.time : time;
  };

  const handleRulerMouseDown = (e: MouseEvent) => {
      if (!duration || !rulerRef.current) return;
      const rect = rulerRef.current.getBoundingClientRect();
      const scrollLeft = rulerRef.current.scrollLeft;
      
      const seek = (cx: number) => { 
          const t = calculateTimeFromEvent(cx, rect, scrollLeft); 
          onSeek(t); 
      };
      
      seek(e.clientX);
      const handleMouseMove = (moveEvent: globalThis.MouseEvent) => { seek(moveEvent.clientX); };
      const handleMouseUp = () => { 
          document.removeEventListener('mousemove', handleMouseMove); 
          document.removeEventListener('mouseup', handleMouseUp); 
      };
      document.addEventListener('mousemove', handleMouseMove); 
      document.addEventListener('mouseup', handleMouseUp);
  };

  const handleContentMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.timeline-clip')) return;
      if ((e.target as HTMLElement).closest('button')) return;
      onSelectClip(null);

      if (viewportRef.current) {
          const rect = viewportRef.current.getBoundingClientRect();
          const scrollLeft = viewportRef.current.scrollLeft;
          if (e.clientX >= rect.left && e.clientY >= rect.top) {
              const seek = (cx: number) => { const t = calculateTimeFromEvent(cx, rect, scrollLeft); onSeek(t); };
              seek(e.clientX);
              const handleMouseMove = (moveEvent: globalThis.MouseEvent) => { seek(moveEvent.clientX); };
              const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
              };
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
          }
      }
  };
  
  const handleClipDragStart = (e: DragEvent, clip: TimelineClip, trackId: string) => { 
      e.stopPropagation(); 
      onSelectClip(clip.id); 
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); 
      const offsetX = e.clientX - rect.left; 
      const dragData = { type: 'EXISTING_CLIP', clipId: clip.id, sourceTrackId: trackId, offsetXPixels: offsetX }; 
      e.dataTransfer.setData('application/json', JSON.stringify(dragData)); 
      e.dataTransfer.effectAllowed = 'all'; 
  };
  
  const handleDrop = (e: DragEvent, trackId: string, isLocked: boolean) => {
    e.preventDefault();
    if (isLocked) return;
    if (!viewportRef.current) return; 
    const rect = viewportRef.current.getBoundingClientRect();
    const scrollLeft = viewportRef.current.scrollLeft;
    const dropX = e.clientX - rect.left + scrollLeft;
    let timeAtDrop = Math.max(0, dropX / pixelsPerSecond);
    
    const jsonData = e.dataTransfer.getData('application/json');
    if (jsonData) { 
        try { 
            const data = JSON.parse(jsonData); 
            if (data.type === 'EXISTING_CLIP') { 
                const timeOffset = data.offsetXPixels / pixelsPerSecond;
                const rawStart = Math.max(0, timeAtDrop - timeOffset); 
                
                // Snap Calculation
                const snapped = getSnappedTime(rawStart, data.clipId);
                const finalStart = snapped.time;

                onUpdateClip(data.sourceTrackId, data.clipId, { start: finalStart, trackId: trackId }); 
            } else if (data.type === 'NEW_ASSET') { 
                // Snap Calculation
                const snapped = getSnappedTime(timeAtDrop);
                onAddClip(data.assetId, trackId, snapped.time); 
            } else if (data.type === 'NEW_TEXT' && onAddTextClip) {
                const snapped = getSnappedTime(timeAtDrop);
                onAddTextClip(data.style, trackId, snapped.time);
            }
        } catch (err) { console.error("Failed to parse drag data", err); } 
    }
  };

  const handleTrimStart = (e: MouseEvent, clip: TimelineClip, trackId: string, type: 'start' | 'end') => {
      e.stopPropagation();
      e.preventDefault();
      const asset = assets.find(a => a.id === clip.assetId);
      const isStatic = asset?.type === 'image' || asset?.type === 'text' || asset?.type === 'element' || clip.assetId.startsWith('text-');
      const assetDuration = isStatic ? Infinity : (asset?.duration || 0);
      setTrimming({ clipId: clip.id, trackId, type, initialStart: clip.start, initialDuration: clip.duration, initialOffset: clip.offset, assetDuration, startX: e.clientX });
  };

  useEffect(() => {
      const handleMouseMove = (e: globalThis.MouseEvent) => {
          if (!trimming) return;
          const deltaPixels = e.clientX - trimming.startX;
          const deltaTime = deltaPixels / pixelsPerSecond;
          
          if (trimming.type === 'end') {
              let rawNewDuration = Math.max(0.1, trimming.initialDuration + deltaTime);
              if (trimming.assetDuration !== Infinity) { 
                  const maxDuration = trimming.assetDuration - trimming.initialOffset; 
                  rawNewDuration = Math.min(rawNewDuration, maxDuration); 
              }
              
              // Snap End
              const rawEndTime = trimming.initialStart + rawNewDuration;
              const snappedEnd = getSnappedTime(rawEndTime, trimming.clipId);
              
              if (snappedEnd.snapped) {
                  setSnapLine(snappedEnd.time);
                  const snappedDuration = snappedEnd.time - trimming.initialStart;
                  if (snappedDuration >= 0.1) {
                      onUpdateClip(trimming.trackId, trimming.clipId, { duration: snappedDuration });
                  }
              } else {
                  setSnapLine(null);
                  onUpdateClip(trimming.trackId, trimming.clipId, { duration: rawNewDuration });
              }

          } else {
              let rawNewStart = trimming.initialStart + deltaTime;
              const endTime = trimming.initialStart + trimming.initialDuration;
              
              // Snap Start
              const snappedStart = getSnappedTime(rawNewStart, trimming.clipId);
              let finalStart = snappedStart.snapped ? snappedStart.time : rawNewStart;
              if (snappedStart.snapped) setSnapLine(snappedStart.time);
              else setSnapLine(null);

              if (finalStart < 0) finalStart = 0;
              if (finalStart > endTime - 0.1) finalStart = endTime - 0.1;

              const timeShift = finalStart - trimming.initialStart;
              let newOffset = trimming.initialOffset + timeShift;
              
              if (newOffset < 0) { 
                  newOffset = 0; 
                  finalStart = trimming.initialStart - trimming.initialOffset; 
              } else if (trimming.assetDuration !== Infinity && newOffset > trimming.assetDuration) { 
                  newOffset = trimming.assetDuration; 
              }
              
              const finalDuration = endTime - finalStart;
              onUpdateClip(trimming.trackId, trimming.clipId, { start: finalStart, duration: finalDuration, offset: newOffset });
          }
      };
      
      const handleMouseUp = () => { 
          setTrimming(null); 
          setSnapLine(null);
      };
      
      if (trimming) { document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', handleMouseUp); }
      return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
  }, [trimming, pixelsPerSecond, onUpdateClip, isSnapping, tracks, currentTime, duration]);

  const playheadPositionPixels = currentTime * pixelsPerSecond;

  return (
    <div 
        className="bg-background border-t border-border flex flex-col shrink-0 select-none z-20 relative"
        style={{ height: height }}
    >
      {/* Drag Resize Handle */}
      <div 
        className="absolute -top-1.5 left-0 right-0 h-3 cursor-row-resize hover:bg-primary/30 z-50 flex items-center justify-center group/resize transition-colors"
        onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
      >
          <div className="w-16 h-1 rounded-full bg-muted-foreground/30 group-hover/resize:bg-primary/50 transition-colors" />
      </div>

      {/* Toolbar */}
      <div className="h-12 px-4 border-b border-border flex items-center justify-between bg-background shrink-0 z-30">
        <div className="flex items-center gap-2">
             <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"><Copy size={16} /></Button>
             <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={selectedClipId ? onSplitClip : undefined} disabled={!selectedClipId}><Scissors size={16} /></Button>
             <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={selectedClipId ? onDeleteSelectedClip : undefined} disabled={!selectedClipId}><Trash2 size={16} /></Button>
             
             <div className="w-[1px] h-4 bg-border mx-1" />
             
             {/* Snapping Toggle */}
             <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-8 w-8 transition-colors", isSnapping ? "text-primary bg-primary/10" : "text-muted-foreground")} 
                onClick={() => dispatch(toggleSnapping())}
                title="Toggle Snapping"
             >
                <Magnet size={16} />
             </Button>

             {/* Magnetic/Ripple Toggle */}
             <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-8 w-8 transition-colors", isMagnetic ? "text-primary bg-primary/10" : "text-muted-foreground")} 
                onClick={() => dispatch(toggleMagnetic())}
                title="Magnetic Mode (Ripple Delete)"
             >
                {isMagnetic ? <Link size={16} /> : <Unlink size={16} />}
             </Button>
             
             {/* Playback Speed Control */}
             <div className="relative ml-1">
                 <select 
                    className="appearance-none bg-transparent text-xs font-medium text-muted-foreground hover:text-foreground h-8 pl-2 pr-6 rounded border border-transparent hover:border-border focus:outline-none cursor-pointer"
                    value={playbackSpeed}
                    onChange={(e) => dispatch(setPlaybackSpeed(parseFloat(e.target.value)))}
                 >
                    <option value="0.5">0.5x</option>
                    <option value="1">1.0x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2.0x</option>
                    <option value="4">4.0x</option>
                 </select>
                 <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                     <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                 </div>
             </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="hover:bg-accent text-muted-foreground hover:text-foreground" onClick={() => onSeek(0)}><SkipBack size={16} /></Button>
          <Button size="icon" className="rounded-full h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90" onClick={onTogglePlay}>
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="hover:bg-accent text-muted-foreground hover:text-foreground" onClick={() => onSeek(duration)}><SkipForward size={16} /></Button>
          <span className="text-xs font-mono text-muted-foreground/80">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
        <div className="flex items-center gap-3">
            <Minus size={14} className="text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => setZoom(Math.max(0, zoom - 10))} />
            <div className="w-24"><Slider value={zoom} max={100} step={1} onChange={(e) => setZoom(Number(e.target.value))} className="w-full" /></div>
            <Plus size={14} className="text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => setZoom(Math.min(100, zoom + 10))} />
        </div>
      </div>

      {/* Timeline Main Area - Grid Layout for Synced Scrolling */}
      <div className="flex-1 flex min-h-0">
          
          {/* Left Column: Controls & Headers */}
          <div className="w-[160px] bg-background border-r border-border flex flex-col shrink-0 z-30 shadow-sm">
              {/* Top-Left: Add Track */}
              <div className="h-8 flex items-center justify-center bg-muted/30 border-b border-border shrink-0">
                  <button 
                    className="w-full h-full flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                    onClick={() => dispatch(addTrack())}
                  >
                      <Layers size={14} /> Add Track
                  </button>
              </div>

              {/* Bottom-Left: Track Headers List (Scroll synced via ref) */}
              <div ref={headersRef} className="flex-1 overflow-hidden flex flex-col bg-background">
                  {tracks.map((track, index) => (
                      <div 
                          key={track.id}
                          draggable
                          onDragStart={(e) => handleTrackDragStart(e, index)}
                          onDragOver={handleTrackDragOver}
                          onDrop={(e) => handleTrackDrop(e, index)} 
                          className={cn(
                              "h-16 px-3 border-b border-border flex items-center gap-2 group transition-colors relative shrink-0",
                              "bg-card hover:bg-accent/50",
                              draggedTrackIndex === index && "opacity-50"
                          )}
                      >
                          <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                              <GripVertical size={14} />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col">
                              <span className="text-xs font-medium text-foreground truncate">{track.name}</span>
                          </div>
                          <div className="flex gap-1">
                              <button onClick={() => dispatch(toggleTrackLock(track.id))} className={cn("p-1.5 rounded hover:bg-accent transition-colors", track.isLocked ? "text-destructive" : "text-muted-foreground hover:text-foreground")}>
                                  {track.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                              </button>
                              <button onClick={() => dispatch(toggleTrackVisibility(track.id))} className={cn("p-1.5 rounded hover:bg-accent transition-colors", track.isHidden ? "text-foreground/50" : "text-muted-foreground hover:text-foreground")}>
                                  {track.isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                              </button>
                          </div>
                      </div>
                  ))}
                  {/* Spacer for scrolling buffer */}
                  <div className="h-[50vh] shrink-0"></div>
              </div>
          </div>

          {/* Right Column: Ruler & Tracks */}
          <div className="flex-1 flex flex-col min-w-0 bg-background relative">
              
               {/* Top-Right: Ruler (Scroll synced via ref) */}
               <div 
                    ref={rulerRef}
                    className="h-8 overflow-hidden border-b border-border bg-background relative cursor-pointer shrink-0 z-20"
                    onMouseDown={handleRulerMouseDown}
               >
                   <div className="h-full relative" style={{ width: `${timelineWidth}px` }}>
                       {/* Ticks */}
                       {rulerTicks.map((tick) => (
                           <div key={tick.toString()} className="absolute bottom-0 border-l border-foreground/20 pointer-events-none" style={{ left: `${tick * pixelsPerSecond}px`, height: '30%' }}>
                               <span className="absolute top-[-12px] left-1 text-[9px] text-muted-foreground font-mono select-none whitespace-nowrap">{tick}s</span>
                           </div>
                       ))}
                       {/* Playhead Head */}
                       <div className="absolute top-0 bottom-0 w-[1px] bg-primary z-40 pointer-events-none transform -translate-x-1/2" style={{ left: `${playheadPositionPixels}px` }}>
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 text-primary">
                                <svg width="11" height="12" viewBox="0 0 11 12" fill="currentColor"><path d="M0.5 0H10.5V6L5.5 11L0.5 6V0Z" /></svg>
                            </div>
                       </div>
                   </div>
               </div>

               {/* Bottom-Right: Viewport (Main Scroller) */}
               <div 
                    ref={viewportRef} 
                    className="flex-1 overflow-auto relative scrollbar-hide bg-background"
                    onScroll={handleScroll}
                    onMouseDown={handleContentMouseDown}
               >
                    <div className="min-h-full relative" style={{ width: `${timelineWidth}px` }}>
                       {/* Grid Lines (Background) */}
                       <div className="absolute inset-0 z-0 pointer-events-none">
                           {rulerTicks.map((tick) => (
                               <div key={tick.toString()} className="absolute top-0 bottom-0 border-l border-border/50" style={{ left: `${tick * pixelsPerSecond}px` }} />
                           ))}
                       </div>
                       
                       {/* Playhead Line (Full Height) */}
                       <div className="absolute top-0 bottom-0 w-[1px] bg-primary z-40 pointer-events-none transform -translate-x-1/2 shadow-[0_0_10px_rgba(0,0,0,0.2)]" style={{ left: `${playheadPositionPixels}px` }} />

                       {/* Snap Line */}
                       {snapLine !== null && (
                            <div 
                                className="absolute top-0 bottom-0 w-[1px] bg-yellow-500 z-50 pointer-events-none transform -translate-x-1/2 shadow-sm"
                                style={{ left: `${snapLine * pixelsPerSecond}px` }}
                            />
                       )}

                       {/* Tracks Content */}
                       {tracks.map(track => (
                           <div 
                                key={track.id} 
                                className={cn(
                                    "h-16 border-b border-border relative group transition-colors w-full shrink-0",
                                    track.isLocked && "bg-[repeating-linear-gradient(45deg,var(--muted),var(--muted)_10px,transparent_10px,transparent_20px)] opacity-60 cursor-not-allowed",
                                    track.isHidden && "opacity-40 grayscale"
                                )}
                                onDragOver={(e) => !track.isLocked && e.preventDefault()} 
                                onDrop={(e) => handleDrop(e, track.id, !!track.isLocked)}
                            >
                               {track.clips.map(clip => {
                                   const asset = assets.find(a => a.id === clip.assetId);
                                   
                                   // Clip coloring based on Asset Type
                                   const isText = asset?.type === 'text' || clip.assetId.startsWith('text-');
                                   const isElement = asset?.type === 'element';
                                   const isAudio = asset?.type === 'audio';
                                   const isVideo = asset?.type === 'video';
                                   const isImage = asset?.type === 'image';
                                   
                                   let bgClass = 'bg-zinc-500';
                                   let ClipIcon = FileVideo; // Default

                                   if (isText) {
                                     bgClass = 'bg-orange-500';
                                     ClipIcon = Type;
                                   } else if (isElement) {
                                     bgClass = 'bg-yellow-500';
                                     ClipIcon = Shapes;
                                   } else if (isAudio) {
                                     bgClass = 'bg-teal-500';
                                     ClipIcon = Music;
                                   } else if (isVideo) {
                                     bgClass = 'bg-blue-500';
                                     ClipIcon = FileVideo;
                                   } else if (isImage) {
                                     bgClass = 'bg-purple-500';
                                     ClipIcon = ImageIcon;
                                   }

                                   const isSelected = selectedClipId === clip.id;
                                   
                                   // Calculate Position in Pixels
                                   const leftPx = clip.start * pixelsPerSecond;
                                   const widthPx = clip.duration * pixelsPerSecond;

                                   return (
                                   <div
                                       key={clip.id}
                                       draggable={!trimming && !track.isLocked}
                                       onDragStart={(e) => !trimming && !track.isLocked && handleClipDragStart(e, clip, track.id)}
                                       onClick={(e) => { e.stopPropagation(); onSelectClip(clip.id); }}
                                       className={cn(
                                           "timeline-clip absolute top-2 bottom-2 rounded-md overflow-hidden cursor-move transition-all duration-75 group/clip border border-white/10 shadow-sm",
                                           bgClass,
                                           isSelected ? 'ring-2 ring-primary z-20 shadow-md' : 'z-10 hover:brightness-110',
                                           track.isLocked && "pointer-events-none"
                                       )}
                                       style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                                   >
                                       {/* Audio Waveform Visualization */}
                                       {(isAudio || isVideo) && asset?.url && (
                                           <Waveform 
                                               assetId={asset.id}
                                               url={asset.url}
                                               width={widthPx}
                                               height={48} // timeline track height - padding
                                               offset={clip.offset}
                                               duration={clip.duration}
                                               color={isAudio ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)"}
                                               type={isAudio ? 'audio' : 'video'}
                                           />
                                       )}
                                       
                                       {/* Fallback Patterns if waveform fails/loading or type mismatch */}
                                       {(!asset?.url || (isText || isElement || isImage)) && (
                                            <>
                                                {isVideo && <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(0,0,0,0.5) 50%)', backgroundSize: '20px 100%' }} />}
                                                {isAudio && <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 4px)', backgroundSize: '100% 50%', top: '25%', height: '50%' }} />}
                                            </>
                                       )}

                                       <div className="absolute inset-0 flex flex-col justify-center px-2 pointer-events-none overflow-hidden">
                                            {/* Clip Icon (Always Visible) */}
                                            {widthPx > 24 && (
                                                <div className="absolute top-1 left-1.5 text-white/90 drop-shadow-md z-20">
                                                    <ClipIcon size={12} />
                                                </div>
                                            )}

                                            {/* Clip Label */}
                                            {widthPx > 50 && (
                                                <div className={cn(
                                                    "absolute top-0.5 left-6 right-0 bg-transparent py-0.5 text-[10px] text-white font-medium truncate drop-shadow-sm",
                                                    !isSelected && "opacity-90"
                                                )}>
                                                    {asset?.name || 'Clip'}
                                                </div>
                                            )}
                                       </div>

                                       {/* Handles */}
                                       {!track.isLocked && (
                                        <>
                                            <div 
                                                    className={cn("absolute left-0 top-0 bottom-0 w-2 cursor-w-resize z-30 hover:bg-white/30 transition-colors", isSelected ? "bg-white/20" : "")}
                                                    onMouseDown={(e) => handleTrimStart(e, clip, track.id, 'start')}
                                            />
                                            <div 
                                                    className={cn("absolute right-0 top-0 bottom-0 w-2 cursor-e-resize z-30 hover:bg-white/30 transition-colors", isSelected ? "bg-white/20" : "")}
                                                    onMouseDown={(e) => handleTrimStart(e, clip, track.id, 'end')}
                                            />
                                        </>
                                       )}
                                   </div>
                               )})}
                           </div>
                       ))}
                       {/* Spacer for scrolling buffer */}
                       <div className="h-[50vh] w-full pointer-events-none"></div>
                    </div>
               </div>
          </div>
      </div>
    </div>
  );
};

export default Timeline;