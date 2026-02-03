
import { useRef, MouseEvent, RefObject, MutableRefObject } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { MediaAsset, TimelineClip, Track, CanvasSettings } from '../types';
import { getClipRenderRect, transformPointToScreen } from '../services/renderer';

interface InteractionProps {
  canvasRef: RefObject<HTMLCanvasElement>;
  canvasSettings: CanvasSettings;
  assets: MediaAsset[];
  tracks: Track[];
  onUpdateClip: (trackId: string, clipId: string, updates: Partial<TimelineClip>) => void;
  mediaElementsRef: MutableRefObject<Map<string, HTMLMediaElement | HTMLImageElement>>;
  isDraggingRef: MutableRefObject<boolean>;
  isResizingRef: MutableRefObject<boolean>;
  dragOffsetRef: MutableRefObject<{ x: number; y: number }>;
}

export const useCanvasInteraction = ({
  canvasRef,
  canvasSettings,
  assets,
  tracks,
  onUpdateClip,
  mediaElementsRef,
  isDraggingRef,
  isResizingRef,
  dragOffsetRef
}: InteractionProps) => {
  const { activeTool, selectedClipId } = useSelector((state: RootState) => state.editor);

  // Internal State Refs for calculation (these don't need to be shared)
  const activeHandleRef = useRef<string | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialClipStateRef = useRef<{ x: number; y: number; scale: number; width: number; height: number }>({
    x: 0, y: 0, scale: 1, width: 0, height: 0,
  });
  const initialMousePosRef = useRef({ x: 0, y: 0 });

  // REPLACED useMemo with inline calculation
  let selectedClip: { clip: TimelineClip; track: Track } | null = null;
  if (selectedClipId) {
    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === selectedClipId);
      if (clip) {
        selectedClip = { clip, track };
        break;
      }
    }
  }

  const getAsset = (assetId: string) => {
      if (assetId.startsWith('text-')) {
          return { id: assetId, type: 'text', name: 'Text', duration: 5 } as MediaAsset;
      }
      return assets.find(a => a.id === assetId);
  };

  const handleCanvasMouseDown = (e: MouseEvent) => {
    if (activeTool !== 'pointer') return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Prevent interaction if selected clip's track is hidden
    if (selectedClip && !selectedClip.track.isHidden) {
      const asset = getAsset(selectedClip.clip.assetId);
      if (asset) {
        const props = selectedClip.clip.properties;
        const { width: drawW, height: drawH } = getClipRenderRect(
            selectedClip.clip, 
            asset, 
            canvasSettings, 
            mediaElementsRef.current,
            canvasRef.current?.getContext('2d')!
        );

        // Handle logic
        const halfW = drawW / 2;
        const halfH = drawH / 2;
        const handles: Record<string, { x: number; y: number }> = {
          tl: { x: -halfW, y: -halfH }, tr: { x: halfW, y: -halfH },
          bl: { x: -halfW, y: halfH }, br: { x: halfW, y: halfH },
          t: { x: 0, y: -halfH }, b: { x: 0, y: halfH },
          l: { x: -halfW, y: 0 }, r: { x: halfW, y: 0 },
        };

        const HIT_THRESHOLD = 12;

        for (const [key, pos] of Object.entries(handles)) {
          const screenPos = transformPointToScreen(pos.x, pos.y, props, canvasSettings, rect);
          const dist = Math.hypot(e.clientX - screenPos.x, e.clientY - screenPos.y);

          if (dist <= HIT_THRESHOLD) {
            isResizingRef.current = true;
            activeHandleRef.current = key;
            initialClipStateRef.current = {
              x: props.x || 0,
              y: props.y || 0,
              scale: props.scale || 1,
              width: drawW,
              height: drawH,
            };

            const scaleX = canvasSettings.width / rect.width;
            const scaleY = canvasSettings.height / rect.height;
            const mx = (e.clientX - rect.left) * scaleX;
            const my = (e.clientY - rect.top) * scaleY;
            const cx = canvasSettings.width / 2 + (props.x || 0);
            const cy = canvasSettings.height / 2 + (props.y || 0);
            const dx = mx - cx;
            const dy = my - cy;
            const rotRad = -((props.rotation || 0) * Math.PI) / 180;
            const lx = (dx * Math.cos(rotRad) - dy * Math.sin(rotRad)) / (props.scale || 1);
            const ly = (dx * Math.sin(rotRad) + dy * Math.cos(rotRad)) / (props.scale || 1);

            initialMousePosRef.current = { x: lx, y: ly };
            return;
          }
        }
      }
    }

    if (selectedClip && !selectedClip.track.isHidden) {
      const asset = getAsset(selectedClip.clip.assetId);
      const isDraggable = asset && (asset.type === 'element' || asset.type === 'text' || asset.type === 'image' || asset.type === 'video');
      if (isDraggable) {
        isDraggingRef.current = true;
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        dragOffsetRef.current = { x: 0, y: 0 };
        initialClipStateRef.current = {
          x: selectedClip.clip.properties.x || 0,
          y: selectedClip.clip.properties.y || 0,
          scale: 1,
          width: 0,
          height: 0,
        };
      }
    }
  };

  const handleCanvasMouseMove = (e: MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Cursor Logic
    if (!isResizingRef.current && !isDraggingRef.current && selectedClip && activeTool === 'pointer' && !selectedClip.track.isHidden) {
      const asset = getAsset(selectedClip.clip.assetId);
      if (asset) {
        const props = selectedClip.clip.properties;
        const { width: drawW, height: drawH } = getClipRenderRect(
            selectedClip.clip, 
            asset, 
            canvasSettings, 
            mediaElementsRef.current,
            canvasRef.current?.getContext('2d')!
        );
        const halfW = drawW / 2;
        const halfH = drawH / 2;
        const handles: Record<string, { x: number; y: number }> = {
          tl: { x: -halfW, y: -halfH }, tr: { x: halfW, y: -halfH },
          bl: { x: -halfW, y: halfH }, br: { x: halfW, y: halfH },
          t: { x: 0, y: -halfH }, b: { x: 0, y: halfH },
          l: { x: -halfW, y: 0 }, r: { x: halfW, y: 0 },
        };
        let cursor = 'default';
        for (const [key, pos] of Object.entries(handles)) {
          const screenPos = transformPointToScreen(pos.x, pos.y, props, canvasSettings, rect);
          if (Math.hypot(e.clientX - screenPos.x, e.clientY - screenPos.y) <= 12) {
            if (key === 't' || key === 'b') cursor = 'ns-resize';
            else if (key === 'l' || key === 'r') cursor = 'ew-resize';
            else if (key === 'tl' || key === 'br') cursor = 'nwse-resize';
            else cursor = 'nesw-resize';
            break;
          }
        }
        if (cursor === 'default') cursor = 'move';
        (e.currentTarget as HTMLElement).style.cursor = cursor;
      }
    } else {
        (e.currentTarget as HTMLElement).style.cursor = 'default';
    }

    if (isResizingRef.current && selectedClip) {
      const scaleX = canvasSettings.width / rect.width;
      const scaleY = canvasSettings.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      const props = selectedClip.clip.properties;
      const cx = canvasSettings.width / 2 + initialClipStateRef.current.x;
      const cy = canvasSettings.height / 2 + initialClipStateRef.current.y;

      const dx = mx - cx;
      const dy = my - cy;
      const rotRad = -((props.rotation || 0) * Math.PI) / 180;
      const lx = dx * Math.cos(rotRad) - dy * Math.sin(rotRad);
      const ly = dx * Math.sin(rotRad) + dy * Math.cos(rotRad);

      const startScale = initialClipStateRef.current.scale;
      const initialLocalX = initialMousePosRef.current.x;
      const initialLocalY = initialMousePosRef.current.y;
      let newScale = startScale;

      const handle = activeHandleRef.current;
      if (handle === 'tr' || handle === 'tl' || handle === 'br' || handle === 'bl') {
        const currentDist = Math.sqrt(lx * lx + ly * ly);
        const startDist = Math.sqrt(initialLocalX * initialLocalX + initialLocalY * initialLocalY);
        const startDistPixels = startDist * startScale;
        if (startDistPixels > 0) {
          newScale = startScale * (currentDist / startDistPixels);
        }
      } else if (handle === 't' || handle === 'b') {
        const currentY = Math.abs(ly);
        const startY = Math.abs(initialLocalY) * startScale;
        if (startY > 0) newScale = startScale * (currentY / startY);
      } else if (handle === 'l' || handle === 'r') {
        const currentX = Math.abs(lx);
        const startX = Math.abs(initialLocalX) * startScale;
        if (startX > 0) newScale = startScale * (currentX / startX);
      }

      newScale = Math.max(0.1, newScale);
      onUpdateClip(selectedClip.track.id, selectedClip.clip.id, {
        properties: { ...props, scale: newScale },
      });
      return;
    }

    if (isDraggingRef.current) {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      const scaleX = canvasSettings.width / rect.width;
      const scaleY = canvasSettings.height / rect.height;
      dragOffsetRef.current = { x: deltaX * scaleX, y: deltaY * scaleY };
    }
  };

  const handleCanvasMouseUp = () => {
    if (isDraggingRef.current && selectedClip) {
      const finalX = initialClipStateRef.current.x + dragOffsetRef.current.x;
      const finalY = initialClipStateRef.current.y + dragOffsetRef.current.y;
      onUpdateClip(selectedClip.track.id, selectedClip.clip.id, {
        properties: {
          ...selectedClip.clip.properties,
          x: finalX,
          y: finalY,
        },
      });
    }

    isDraggingRef.current = false;
    isResizingRef.current = false;
    activeHandleRef.current = null;
    dragOffsetRef.current = { x: 0, y: 0 };
  };

  return {
      handleCanvasMouseDown,
      handleCanvasMouseMove,
      handleCanvasMouseUp,
      getAsset
  };
};
