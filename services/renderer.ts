import { CanvasSettings, MediaAsset, TimelineClip, Track, Keyframe, TransitionConfig } from '../types';

export const FILTER_PRESETS: Record<string, string> = {
  'none': 'none',
  'grayscale': 'grayscale(100%)',
  'sepia': 'sepia(100%)',
  'vintage': 'sepia(50%) contrast(120%) brightness(90%)',
  'dreamy': 'blur(1px) brightness(110%) saturate(120%)',
  'cyber': 'hue-rotate(180deg) contrast(150%) saturate(200%)',
  'dramatic': 'contrast(140%) brightness(90%) grayscale(30%)',
  'noir': 'grayscale(100%) contrast(150%) brightness(80%)'
};

const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

const easeOutQuad = (t: number) => t * (2 - t);
const easeInQuad = (t: number) => t * t;

const getAnimatedValue = (
  baseValue: number, 
  keyframes: Keyframe[] | undefined, 
  timeIntoClip: number
): number => {
  if (!keyframes || keyframes.length === 0) return baseValue;
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  if (timeIntoClip <= sorted[0].time) return sorted[0].value;
  if (timeIntoClip >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value;
  for (let i = 0; i < sorted.length - 1; i++) {
    const k1 = sorted[i];
    const k2 = sorted[i + 1];
    if (timeIntoClip >= k1.time && timeIntoClip <= k2.time) {
      const t = (timeIntoClip - k1.time) / (k2.time - k1.time);
      return lerp(k1.value, k2.value, t);
    }
  }
  return baseValue;
};

export const transformPointToScreen = (
  localX: number,
  localY: number,
  props: any,
  canvasSettings: CanvasSettings,
  canvasRect: DOMRect
) => {
  const cx = canvasSettings.width / 2 + (props.x || 0);
  const cy = canvasSettings.height / 2 + (props.y || 0);
  const scale = props.scale || 1;
  const rotRad = ((props.rotation || 0) * Math.PI) / 180;

  const sx = localX * scale;
  const sy = localY * scale;

  const rx = sx * Math.cos(rotRad) - sy * Math.sin(rotRad);
  const ry = sx * Math.sin(rotRad) + sy * Math.cos(rotRad);

  const canvasX = cx + rx;
  const canvasY = cy + ry;

  const screenScaleX = canvasRect.width / canvasSettings.width;
  const screenScaleY = canvasRect.height / canvasSettings.height;

  return {
    x: canvasRect.left + canvasX * screenScaleX,
    y: canvasRect.top + canvasY * screenScaleY,
  };
};

export const getClipRenderRect = (
  clip: TimelineClip,
  asset: MediaAsset,
  canvasSettings: CanvasSettings,
  mediaElements: Map<string, HTMLMediaElement | HTMLImageElement>,
  ctx?: CanvasRenderingContext2D
) => {
    let sourceW = 100, sourceH = 100;
    
    if (asset.type === 'video') {
         const vid = mediaElements.get(asset.id) as HTMLVideoElement;
         if (vid) {
             sourceW = vid.videoWidth || canvasSettings.width;
             sourceH = vid.videoHeight || canvasSettings.height;
         } else {
             sourceW = canvasSettings.width; 
             sourceH = canvasSettings.height;
         }
    } else if (asset.type === 'image' || asset.type === 'element') {
         const img = mediaElements.get(asset.id) as HTMLImageElement;
         if (img) {
             sourceW = img.naturalWidth;
             sourceH = img.naturalHeight;
         }
    } else if (asset.type === 'text' && ctx) {
         // Approximate text size
         const props = clip.properties;
         const fontSize = props.fontSize || 40;
         ctx.font = `${props.fontStyle || 'normal'} ${props.fontWeight || 'normal'} ${fontSize}px ${props.fontFamily || 'Arial'}`;
         const metrics = ctx.measureText(props.text || 'Text');
         sourceW = metrics.width + (props.text?.length || 0) * (props.letterSpacing || 0);
         sourceH = fontSize * (props.lineHeight || 1.2);
    }

    if (clip.properties.crop) {
        sourceW = clip.properties.crop.width * sourceW;
        sourceH = clip.properties.crop.height * sourceH;
    }

    return { width: sourceW, height: sourceH };
};

// --- Transition Helpers ---

interface TransitionState {
    x: number;
    y: number;
    scale: number;
    opacity: number;
    clipPath?: Path2D;
}

const applyTransition = (
    ctx: CanvasRenderingContext2D, 
    baseState: TransitionState,
    config: TransitionConfig, 
    progress: number, // 0 to 1
    width: number, 
    height: number,
    isExit: boolean
): TransitionState => {
    let t = isExit ? 1 - progress : progress; // If exit, we go from 1 to 0
    t = Math.max(0, Math.min(1, t));

    const state = { ...baseState };

    switch (config.type) {
        case 'fade':
            state.opacity *= t;
            break;
        case 'zoomIn':
            // Enter: 0 -> 1, Exit: 1 -> 0
            state.scale *= t;
            state.opacity *= t; // Fade with zoom usually looks better
            break;
        case 'zoomOut':
            // Enter: 2 -> 1, Exit: 1 -> 2
            state.scale *= (isExit ? 1 + (1-t) : 2 - t);
            state.opacity *= t;
            break;
        case 'slideLeft':
             // Enter: starts at width, goes to 0. Exit: starts at 0, goes to -width
             if (!isExit) state.x += (1 - easeOutQuad(t)) * width;
             else state.x -= (1 - easeOutQuad(t)) * width;
             break;
        case 'slideRight':
             if (!isExit) state.x -= (1 - easeOutQuad(t)) * width;
             else state.x += (1 - easeOutQuad(t)) * width;
             break;
        case 'slideUp':
             if (!isExit) state.y += (1 - easeOutQuad(t)) * height;
             else state.y -= (1 - easeOutQuad(t)) * height;
             break;
        case 'slideDown':
             if (!isExit) state.y -= (1 - easeOutQuad(t)) * height;
             else state.y += (1 - easeOutQuad(t)) * height;
             break;
        case 'wipeLeft':
             // Canvas Clip Path
             const p1 = new Path2D();
             if (!isExit) p1.rect(width * (1-t), -height/2 - 500, width, height + 1000); // Reveal from right
             else p1.rect(-width/2 - 500, -height/2 - 500, width * t, height + 1000); // Hide to left
             state.clipPath = p1;
             break;
        case 'wipeRight':
             const p2 = new Path2D();
             if (!isExit) p2.rect(-width/2 - 500, -height/2 - 500, width * t, height + 1000);
             else p2.rect(width * (1-t) - width/2, -height/2 - 500, width, height + 1000);
             state.clipPath = p2;
             break;
    }

    return state;
}


export const renderCanvas = (
    ctx: CanvasRenderingContext2D,
    canvasSettings: CanvasSettings,
    tracks: Track[],
    assets: MediaAsset[],
    currentTime: number,
    mediaElements: Map<string, HTMLMediaElement | HTMLImageElement>,
    interaction: {
        activeTool: 'pointer' | 'crop';
        selectedClipId: string | null;
        isDragging: boolean;
        isResizing: boolean;
        dragOffset: { x: number; y: number };
    }
) => {
    const { width, height, backgroundColor } = canvasSettings;
    const { isDragging, isResizing, dragOffset, selectedClipId } = interaction;

    // 1. Clear & Background
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // 2. Identify Active Clips
    const activeClips = tracks
        .filter(t => !t.isHidden)
        .flatMap((t) => t.clips.map((c) => c))
        .filter((c) => currentTime >= c.start && currentTime < c.start + c.duration)
        .sort((a, b) => {
            const idxA = tracks.findIndex(t => t.id === a.trackId);
            const idxB = tracks.findIndex(t => t.id === b.trackId);
            return idxA - idxB;
        });

    // 3. Render Clips
    for (const clip of activeClips) {
        const asset = assets.find(a => a.id === clip.assetId);
        if (!asset) continue;

        const timeIntoClip = currentTime - clip.start;
        const props = clip.properties;

        // Base Transforms
        let animX = getAnimatedValue(props.x || 0, props.keyframes?.['x'], timeIntoClip);
        let animY = getAnimatedValue(props.y || 0, props.keyframes?.['y'], timeIntoClip);
        let animScale = getAnimatedValue(props.scale || 1, props.keyframes?.['scale'], timeIntoClip);
        let animRotation = getAnimatedValue(props.rotation || 0, props.keyframes?.['rotation'], timeIntoClip);
        let animOpacity = getAnimatedValue(props.opacity ?? 100, props.keyframes?.['opacity'], timeIntoClip);

        // Standard Fade (Legacy support, though transitions cover this)
        let fadeOpacity = 1;
        if (props.fadeIn && timeIntoClip < props.fadeIn) fadeOpacity = timeIntoClip / props.fadeIn;
        else if (props.fadeOut && timeIntoClip > clip.duration - props.fadeOut) fadeOpacity = (clip.duration - timeIntoClip) / props.fadeOut;
        
        let currentState: TransitionState = {
            x: 0, 
            y: 0, 
            scale: 1, 
            opacity: (animOpacity / 100) * fadeOpacity
        };

        // --- APPLY TRANSITIONS ---
        // 1. Enter Transition
        if (props.transitionIn && props.transitionIn.type !== 'none' && timeIntoClip < props.transitionIn.duration) {
            const progress = timeIntoClip / props.transitionIn.duration;
            currentState = applyTransition(ctx, currentState, props.transitionIn, progress, width, height, false);
        }

        // 2. Exit Transition
        if (props.transitionOut && props.transitionOut.type !== 'none' && timeIntoClip > clip.duration - props.transitionOut.duration) {
            const progress = (clip.duration - timeIntoClip) / props.transitionOut.duration;
            // Note: Progress goes 1 -> 0 as we approach end for the calculation logic
            currentState = applyTransition(ctx, currentState, props.transitionOut, 1 - progress, width, height, true);
        }

        // Interaction Offset
        let offsetX = animX + currentState.x;
        let offsetY = animY + currentState.y;
        
        if (isDragging && selectedClipId === clip.id && !isResizing) {
            offsetX += dragOffset.x;
            offsetY += dragOffset.y;
        }

        ctx.save();
        
        // Clip Path for Wipes
        if (currentState.clipPath) {
            ctx.clip(currentState.clipPath);
        }

        const cx = width / 2;
        const cy = height / 2;
        ctx.translate(cx + offsetX, cy + offsetY);
        if (animRotation) ctx.rotate((animRotation * Math.PI) / 180);
        
        const flipX = props.flipH ? -1 : 1;
        const flipY = props.flipV ? -1 : 1;
        const finalScale = animScale * currentState.scale;
        
        ctx.scale(flipX * finalScale, flipY * finalScale);
        ctx.globalAlpha = Math.max(0, Math.min(1, currentState.opacity));

        // Draw Content
        if (asset.type === 'text') {
            const fontSize = props.fontSize || 40;
            ctx.font = `${props.fontStyle || 'normal'} ${props.fontWeight || 'normal'} ${fontSize}px ${props.fontFamily || 'Arial'}`;
            ctx.textAlign = props.textAlign || 'center';
            ctx.textBaseline = 'middle';
            let text = props.text || 'Text';
            if (props.textTransform === 'uppercase') text = text.toUpperCase();
            if (props.textTransform === 'lowercase') text = text.toLowerCase();
            
            const metrics = ctx.measureText(text);
            const textW = metrics.width + text.length * (props.letterSpacing || 0);
            const textH = fontSize * (props.lineHeight || 1.2);

            if (props.backgroundColor) {
                ctx.fillStyle = props.backgroundColor;
                const pad = 20;
                ctx.fillRect(-textW / 2 - pad, -textH / 2 - pad, textW + pad * 2, textH + pad * 2);
            }

            ctx.fillStyle = props.textColor || '#ffffff';
            if (props.filter && FILTER_PRESETS[props.filter]) ctx.filter = FILTER_PRESETS[props.filter];

            if (props.letterSpacing) {
                let currentX = -textW / 2;
                for(const char of text) {
                    ctx.fillText(char, currentX, 0);
                    currentX += ctx.measureText(char).width + props.letterSpacing;
                }
            } else {
                ctx.fillText(text, 0, 0);
            }
        } else if (asset.type === 'video') {
            const vid = mediaElements.get(asset.id) as HTMLVideoElement;
            // Draw only if ready. If not ready, we draw nothing (transparent) to avoid flickering text.
            // Relaxed check: Allow drawing if readyState >= 1 (HAVE_METADATA) or 2 (HAVE_CURRENT_DATA)
            // HAVE_METADATA often allows drawing the "last" frame during seek which is better than blank
            if (vid && vid.readyState >= 1) {
                 drawImageOrFrame(ctx, vid, props, width, height, vid.videoWidth, vid.videoHeight);
            }
        } else if (asset.type === 'image' || asset.type === 'element') {
            const img = mediaElements.get(asset.id) as HTMLImageElement;
            if (img && img.complete && img.naturalWidth > 0) {
                drawImageOrFrame(ctx, img, props, width, height, img.naturalWidth, img.naturalHeight);
            }
        }

        ctx.restore();
        ctx.filter = 'none'; // Reset filter
    }
};

function drawImageOrFrame(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement | HTMLVideoElement, 
    props: any, 
    canvasW: number, 
    canvasH: number, 
    srcW: number, 
    srcH: number
) {
    let filterString = `brightness(${100 + (props.brightness||0)}%) contrast(${100 + (props.contrast||0)}%) saturate(${100 + (props.saturation||0)}%) hue-rotate(${props.hue||0}deg) blur(${(props.blur||0)/5}px)`;
    if (props.filter && FILTER_PRESETS[props.filter]) filterString += ` ${FILTER_PRESETS[props.filter]}`;
    ctx.filter = filterString;

    let sX = 0, sY = 0, sW = srcW, sH = srcH;
    if (props.crop) {
        sX = props.crop.x * srcW;
        sY = props.crop.y * srcH;
        sW = props.crop.width * srcW;
        sH = props.crop.height * srcH;
    }

    const visibleRatio = sW / sH;
    const canvasRatio = canvasW / canvasH;
    let drawW, drawH;

    if (props.fit === 'cover') {
         if (visibleRatio > canvasRatio) {
            drawH = canvasH;
            drawW = drawH * visibleRatio;
         } else {
            drawW = canvasW;
            drawH = drawW / visibleRatio;
         }
    } else {
         if (visibleRatio > canvasRatio) {
            drawW = canvasW;
            drawH = drawW / visibleRatio;
         } else {
            drawH = canvasH;
            drawW = drawH * visibleRatio;
         }
    }
    
    ctx.drawImage(img, sX, sY, sW, sH, -drawW/2, -drawH/2, drawW, drawH);
}