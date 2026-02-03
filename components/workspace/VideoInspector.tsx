import { useState, FC } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { 
    Maximize, Minimize, Scissors, FlipHorizontal, FlipVertical, RotateCcw, Minus, Plus, 
    ToggleLeft, ToggleRight, Type, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline, 
    ChevronDown, Check, AlignJustify, CaseUpper, CaseLower, Wand2, Key, Trash2, Clock,
    MoveRight, Scaling, Disc
} from 'lucide-react';
import { TimelineClip, TransitionType } from '../../types';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { ScrollArea } from '../ui/scroll-area';
import { cn, generateId } from '../../lib/utils';
import { FILTER_PRESETS } from '../../services/renderer';

interface VideoInspectorProps {
  selectedClip: { clip: TimelineClip; track: any };
  onUpdateClip: (trackId: string, clipId: string, updates: Partial<TimelineClip>) => void;
  onEnterCrop: () => void;
}

const FONT_FAMILIES = ['Open Sans', 'Roboto', 'Montserrat', 'Lato', 'Poppins', 'Arial', 'Times New Roman', 'Courier New', 'Cursive'];
const FONT_WEIGHTS = [
    { label: 'Light', value: '300' },
    { label: 'Normal', value: '400' },
    { label: 'Medium', value: '500' },
    { label: 'Semi Bold', value: '600' },
    { label: 'Bold', value: '700' },
    { label: 'Extra Bold', value: '800' }
];
const COLOR_PRESETS = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#000000', '#ffffff'
];

const ANIMATABLE_PROPS = [
    { label: 'Scale', key: 'scale', min: 0.1, max: 3, step: 0.1, default: 1 },
    { label: 'Rotation', key: 'rotation', min: -360, max: 360, step: 1, default: 0 },
    { label: 'Opacity', key: 'opacity', min: 0, max: 100, step: 1, default: 100 },
    { label: 'Position X', key: 'x', min: -500, max: 500, step: 10, default: 0 },
    { label: 'Position Y', key: 'y', min: -500, max: 500, step: 10, default: 0 },
];

const TRANSITIONS: { type: TransitionType; label: string; icon: any }[] = [
    { type: 'none', label: 'None', icon: Disc },
    { type: 'fade', label: 'Fade', icon: Disc },
    { type: 'zoomIn', label: 'Zoom In', icon: Scaling },
    { type: 'zoomOut', label: 'Zoom Out', icon: Scaling },
    { type: 'slideLeft', label: 'Slide Left', icon: MoveRight },
    { type: 'slideRight', label: 'Slide Right', icon: MoveRight },
    { type: 'slideUp', label: 'Slide Up', icon: MoveRight },
    { type: 'slideDown', label: 'Slide Down', icon: MoveRight },
    { type: 'wipeLeft', label: 'Wipe Left', icon: MoveRight },
    { type: 'wipeRight', label: 'Wipe Right', icon: MoveRight },
];

export const VideoInspector: FC<VideoInspectorProps> = ({
  selectedClip,
  onUpdateClip,
  onEnterCrop
}) => {
  const currentTime = useSelector((state: RootState) => state.editor.currentTime);
  const isText = selectedClip.clip.assetId.startsWith('text-');
  
  // Initialize tabs
  let initialTab: any = 'transform';
  if (selectedClip.track.type === 'audio') initialTab = 'audio';
  if (isText) initialTab = 'text';

  const [activePanel, setActivePanel] = useState<'transform' | 'adjust' | 'audio' | 'speed' | 'time' | 'text' | 'background' | 'opacity' | 'effects' | 'animation' | 'transitions'>(initialTab);
  const [timeMode, setTimeMode] = useState<'duration' | 'timing'>('duration');
  const [isFontOpen, setIsFontOpen] = useState(false);
  const [isWeightOpen, setIsWeightOpen] = useState(false);
  
  // Animation State
  const [activeAnimProp, setActiveAnimProp] = useState<string>('scale');
  
  // Transition State
  const [activeTransTab, setActiveTransTab] = useState<'in' | 'out'>('in');

  const updateTransform = (updates: Partial<TimelineClip['properties']>) => {
    const { clip, track } = selectedClip;
    const newProps = { ...clip.properties, ...updates };
    onUpdateClip(track.id, clip.id, { properties: newProps });
  };

  // Helper Accessors
  const props = selectedClip.clip.properties;

  // Transform Handlers
  const handleFill = () => updateTransform({ fit: 'cover', scale: 1 });
  const handleFit = () => updateTransform({ fit: 'contain', scale: 1 });
  const handleFlipH = () => updateTransform({ flipH: !props.flipH });
  const handleFlipV = () => updateTransform({ flipV: !props.flipV });
  const handleRotationChange = (val: number) => updateTransform({ rotation: val });

  // Adjustment Handlers
  const handleAdjustmentChange = (key: keyof TimelineClip['properties'], value: number) => {
    updateTransform({ [key]: value });
  };
  const handleResetAdjustments = () => updateTransform({ opacity: 100, brightness: 0, contrast: 0, saturation: 0, hue: 0, blur: 0 });

  // Audio Handlers
  const handleVolumeChange = (val: number) => updateTransform({ volume: val });
  const handleFadeInChange = (val: number) => updateTransform({ fadeIn: val });
  const handleFadeOutChange = (val: number) => updateTransform({ fadeOut: val });
  const toggleNoiseReduction = () => updateTransform({ noiseReduction: !props.noiseReduction });

  // Text Handlers
  const handleTextChange = (val: string) => updateTransform({ text: val });
  const handleFontSizeChange = (val: number) => updateTransform({ fontSize: Math.max(1, val) });
  const handleColorChange = (val: string) => updateTransform({ textColor: val });
  
  // Speed Handler
  const handleSpeedChange = (newSpeed: number) => {
    const { clip, track } = selectedClip;
    const currentSpeed = clip.properties.playbackRate || 1;
    const sourceContentDuration = clip.duration * currentSpeed;
    const newDuration = sourceContentDuration / newSpeed;
    onUpdateClip(track.id, clip.id, { 
        duration: newDuration, 
        properties: { ...clip.properties, playbackRate: newSpeed } 
    });
  };

  // Animation Handlers
  const handleAddKeyframe = () => {
    const propKey = activeAnimProp;
    const clipTime = Math.max(0, currentTime - selectedClip.clip.start);
    
    // Get current value or default
    const currentVal = (props as any)[propKey] ?? ANIMATABLE_PROPS.find(p => p.key === propKey)?.default ?? 0;

    const existingKeyframes = props.keyframes?.[propKey] || [];
    // Remove existing keyframe if close to current time (replace)
    const filtered = existingKeyframes.filter(k => Math.abs(k.time - clipTime) > 0.05);
    
    const newKeyframe = {
        id: generateId(),
        time: clipTime,
        value: currentVal,
        ease: 'linear' as const
    };

    updateTransform({
        keyframes: {
            ...props.keyframes,
            [propKey]: [...filtered, newKeyframe].sort((a, b) => a.time - b.time)
        }
    });
  };

  const handleRemoveKeyframe = (id: string) => {
      const propKey = activeAnimProp;
      const existing = props.keyframes?.[propKey] || [];
      updateTransform({
          keyframes: {
              ...props.keyframes,
              [propKey]: existing.filter(k => k.id !== id)
          }
      });
  };
  
  // Transition Handlers
  const updateTransition = (type: 'in' | 'out', transType: TransitionType) => {
      const key = type === 'in' ? 'transitionIn' : 'transitionOut';
      // Default duration 1s if setting new type
      updateTransform({
          [key]: {
              type: transType,
              duration: props[key]?.duration || 1.0
          }
      });
  };
  
  const updateTransitionDuration = (type: 'in' | 'out', duration: number) => {
      const key = type === 'in' ? 'transitionIn' : 'transitionOut';
      if (!props[key]) return;
      updateTransform({
          [key]: {
              ...props[key]!,
              duration
          }
      });
  };

  const formatTimeCode = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Define visible tabs
  let tabs: string[] = [];
  if (selectedClip.track.type === 'audio') {
      tabs = ['audio', 'speed', 'time'];
  } else if (isText) {
      tabs = ['text', 'animation', 'transitions', 'adjust', 'background', 'opacity', 'time'];
  } else {
      tabs = ['transform', 'animation', 'transitions', 'adjust', 'effects', 'audio', 'speed', 'time'];
  }

  return (
    <div className="flex flex-col h-full font-sans">
      {/* Panel Tabs */}
      <div className="h-12 flex items-center px-6 border-b shrink-0 gap-6 overflow-x-auto scrollbar-hide">
          {tabs.map(tab => (
              <Button 
                key={tab}
                variant="ghost" 
                className={`px-0 h-full font-medium rounded-none border-b-2 ${activePanel === tab ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-transparent'}`}
                onClick={() => setActivePanel(tab as any)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Button>
          ))}
      </div>

      <ScrollArea className="flex-1 p-6">
        {/* --- TRANSITIONS --- */}
        {activePanel === 'transitions' && (
            <div className="flex flex-col gap-6">
                <div className="flex bg-muted p-1 rounded-lg">
                    <button className={cn("flex-1 py-1.5 text-xs font-medium rounded transition-colors", activeTransTab === 'in' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")} onClick={() => setActiveTransTab('in')}>In (Entrance)</button>
                    <button className={cn("flex-1 py-1.5 text-xs font-medium rounded transition-colors", activeTransTab === 'out' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")} onClick={() => setActiveTransTab('out')}>Out (Exit)</button>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                    {TRANSITIONS.map(t => {
                        const current = activeTransTab === 'in' ? props.transitionIn?.type : props.transitionOut?.type;
                        const isSelected = current === t.type || (!current && t.type === 'none');
                        const Icon = t.icon;
                        
                        return (
                            <button
                                key={t.type}
                                onClick={() => updateTransition(activeTransTab, t.type)}
                                className={cn(
                                    "flex flex-col items-center justify-center p-3 gap-2 rounded-lg border transition-all",
                                    isSelected ? "bg-primary/10 border-primary text-primary" : "bg-card border-border hover:bg-accent hover:border-primary/50"
                                )}
                            >
                                <Icon size={20} />
                                <span className="text-xs">{t.label}</span>
                            </button>
                        );
                    })}
                </div>
                
                {((activeTransTab === 'in' && props.transitionIn && props.transitionIn.type !== 'none') || 
                  (activeTransTab === 'out' && props.transitionOut && props.transitionOut.type !== 'none')) && (
                    <div className="space-y-4 pt-4 border-t border-border">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Duration</span>
                            <span>{activeTransTab === 'in' ? props.transitionIn?.duration : props.transitionOut?.duration}s</span>
                        </div>
                        <Slider 
                            min={0.1} 
                            max={Math.min(5, selectedClip.clip.duration)} 
                            step={0.1}
                            value={activeTransTab === 'in' ? (props.transitionIn?.duration || 1) : (props.transitionOut?.duration || 1)}
                            onChange={(e) => updateTransitionDuration(activeTransTab, Number(e.target.value))}
                        />
                    </div>
                )}
            </div>
        )}

        {/* --- ANIMATION --- */}
        {activePanel === 'animation' && (
            <div className="flex flex-col gap-6">
                 <div className="p-3 bg-accent/30 rounded-lg text-xs text-muted-foreground">
                    Move the playhead on the timeline to the desired time, adjust the value, then add a keyframe.
                 </div>

                 {/* Property Selector */}
                 <div className="flex gap-2 overflow-x-auto pb-2">
                     {ANIMATABLE_PROPS.map(p => (
                         <Button
                            key={p.key}
                            variant={activeAnimProp === p.key ? 'secondary' : 'outline'}
                            size="sm"
                            onClick={() => setActiveAnimProp(p.key)}
                            className="whitespace-nowrap"
                         >
                             {p.label}
                         </Button>
                     ))}
                 </div>

                 {/* Value Control */}
                 <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                     <div className="flex items-center justify-between">
                         <span className="text-sm font-medium capitalize">{activeAnimProp}</span>
                         <span className="text-xs font-mono">{(props as any)[activeAnimProp]?.toFixed(1) ?? 0}</span>
                     </div>
                     <Slider 
                        min={ANIMATABLE_PROPS.find(p => p.key === activeAnimProp)?.min}
                        max={ANIMATABLE_PROPS.find(p => p.key === activeAnimProp)?.max}
                        step={ANIMATABLE_PROPS.find(p => p.key === activeAnimProp)?.step}
                        value={(props as any)[activeAnimProp] ?? ANIMATABLE_PROPS.find(p => p.key === activeAnimProp)?.default}
                        onChange={(e) => handleAdjustmentChange(activeAnimProp as any, Number(e.target.value))}
                     />
                     <Button className="w-full gap-2" onClick={handleAddKeyframe}>
                         <Plus size={14} /> Add Keyframe
                     </Button>
                 </div>

                 {/* Keyframe List */}
                 <div className="space-y-2">
                     <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Keyframes ({activeAnimProp})</h4>
                     {(props.keyframes?.[activeAnimProp] || []).length === 0 ? (
                         <div className="text-sm text-muted-foreground italic py-2">No keyframes yet.</div>
                     ) : (
                         <div className="space-y-2">
                             {(props.keyframes?.[activeAnimProp] || []).map((kf, i) => (
                                 <div key={kf.id} className="flex items-center justify-between p-2 rounded bg-card border border-border/50 text-sm">
                                     <div className="flex items-center gap-2">
                                         <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">{i + 1}</div>
                                         <span>{kf.time.toFixed(2)}s</span>
                                     </div>
                                     <div className="flex items-center gap-3">
                                         <span className="font-mono text-muted-foreground">{kf.value.toFixed(1)}</span>
                                         <button onClick={() => handleRemoveKeyframe(kf.id)} className="text-muted-foreground hover:text-destructive">
                                             <Trash2 size={14} />
                                         </button>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     )}
                 </div>
            </div>
        )}

        {/* --- EFFECTS --- */}
        {activePanel === 'effects' && (
            <div className="grid grid-cols-2 gap-3">
                {Object.keys(FILTER_PRESETS).map(key => (
                    <button
                        key={key}
                        onClick={() => updateTransform({ filter: key })}
                        className={cn(
                            "relative aspect-video rounded-lg overflow-hidden border-2 transition-all hover:scale-105 group",
                            props.filter === key ? "border-primary" : "border-transparent hover:border-primary/50"
                        )}
                    >
                        {/* Preview (using simple colored block simulation as we can't re-render video here easily) */}
                        <div className="absolute inset-0 bg-muted/50 flex items-center justify-center">
                            <Wand2 className={cn("opacity-20", props.filter === key && "opacity-100 text-primary")} />
                        </div>
                        {/* We apply the CSS filter to the text/preview div to visualize it roughly */}
                        <div 
                            className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white bg-black/40 backdrop-blur-sm"
                            style={{ filter: FILTER_PRESETS[key] }}
                        >
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                        </div>
                        {props.filter === key && (
                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-sm">
                                <Check size={12} />
                            </div>
                        )}
                    </button>
                ))}
            </div>
        )}

        {/* --- TEXT MAIN --- */}
        {activePanel === 'text' && (
            <div className="flex flex-col gap-6">
                {/* Text Input */}
                <div className="relative">
                    <textarea 
                        className="w-full bg-muted/30 border border-border rounded-lg p-3 text-sm focus:border-primary outline-none resize-none h-24 pr-10"
                        value={props.text || ''}
                        onChange={(e) => handleTextChange(e.target.value)}
                    />
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full border border-white/20 shadow-sm cursor-pointer" style={{ backgroundColor: props.textColor || '#ffffff' }}>
                        <input type="color" className="opacity-0 w-full h-full cursor-pointer" value={props.textColor || '#ffffff'} onChange={(e) => handleColorChange(e.target.value)} />
                    </div>
                </div>

                {/* Color Presets */}
                <div className="flex flex-wrap gap-2">
                    {COLOR_PRESETS.map(color => (
                        <button key={color} onClick={() => handleColorChange(color)} className={cn("w-6 h-6 rounded-full border border-white/10 hover:scale-110 transition-transform", props.textColor === color && "ring-2 ring-primary ring-offset-2 ring-offset-card")} style={{ backgroundColor: color }} />
                    ))}
                    <div className="relative w-6 h-6 rounded-full bg-gradient-to-br from-red-500 via-green-500 to-blue-500 border border-white/10 hover:scale-110 transition-transform cursor-pointer">
                         <input type="color" className="opacity-0 w-full h-full cursor-pointer" onChange={(e) => handleColorChange(e.target.value)} />
                    </div>
                </div>

                {/* Font Family */}
                <div className="relative">
                    <button onClick={() => setIsFontOpen(!isFontOpen)} className="w-full flex items-center justify-between bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm hover:bg-muted/50">
                        <span>{props.fontFamily || 'Open Sans'}</span><ChevronDown size={16} className="text-muted-foreground" />
                    </button>
                    {isFontOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                            {FONT_FAMILIES.map(font => (
                                <button key={font} onClick={() => { updateTransform({ fontFamily: font }); setIsFontOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center justify-between" style={{ fontFamily: font }}>
                                    {font}{props.fontFamily === font && <Check size={14} className="text-primary" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Font Weight & Size */}
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <button onClick={() => setIsWeightOpen(!isWeightOpen)} className="w-full flex items-center justify-between bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm hover:bg-muted/50">
                            <span>{FONT_WEIGHTS.find(w => w.value === (props.fontWeight === 'bold' ? '700' : props.fontWeight === 'normal' ? '400' : props.fontWeight))?.label || 'Normal'}</span><ChevronDown size={16} className="text-muted-foreground" />
                        </button>
                        {isWeightOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                                {FONT_WEIGHTS.map(weight => (
                                    <button key={weight.value} onClick={() => { updateTransform({ fontWeight: weight.value as any }); setIsWeightOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center justify-between">
                                        {weight.label}{props.fontWeight === weight.value && <Check size={14} className="text-primary" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center bg-muted/30 border border-border rounded-lg">
                        <button onClick={() => handleFontSizeChange((props.fontSize || 40) - 1)} className="p-2 hover:text-primary transition-colors"><Minus size={16} /></button>
                        <div className="w-12 text-center text-sm border-x border-border/50 py-2">{props.fontSize || 40}</div>
                        <button onClick={() => handleFontSizeChange((props.fontSize || 40) + 1)} className="p-2 hover:text-primary transition-colors"><Plus size={16} /></button>
                    </div>
                </div>
            </div>
        )}

        {/* --- TEXT ADJUST --- */}
        {activePanel === 'adjust' && isText && (
            <div className="flex flex-col gap-6">
                {/* Line Height */}
                <div className="space-y-3">
                    <div className="flex justify-between text-xs text-muted-foreground"><span>Line Height</span><span>{props.lineHeight || 1.2}</span></div>
                    <Slider min={0.5} max={3} step={0.1} value={props.lineHeight || 1.2} onChange={(e) => updateTransform({ lineHeight: Number(e.target.value) })} />
                </div>

                {/* Letter Spacing */}
                <div className="space-y-3">
                    <div className="flex justify-between text-xs text-muted-foreground"><span>Letter Spacing</span><span>{props.letterSpacing || 0}</span></div>
                    <Slider min={-10} max={20} step={1} value={props.letterSpacing || 0} onChange={(e) => updateTransform({ letterSpacing: Number(e.target.value) })} />
                </div>

                {/* Alignment & Style */}
                <div className="grid grid-cols-6 gap-2">
                    <Button variant={props.textAlign === 'left' ? 'secondary' : 'outline'} onClick={() => updateTransform({ textAlign: 'left' })} title="Align Left"><AlignLeft size={16} /></Button>
                    <Button variant={props.textAlign === 'center' ? 'secondary' : 'outline'} onClick={() => updateTransform({ textAlign: 'center' })} title="Align Center"><AlignCenter size={16} /></Button>
                    <Button variant={props.textAlign === 'right' ? 'secondary' : 'outline'} onClick={() => updateTransform({ textAlign: 'right' })} title="Align Right"><AlignRight size={16} /></Button>
                    <Button variant={props.textDecoration === 'underline' ? 'secondary' : 'outline'} onClick={() => updateTransform({ textDecoration: props.textDecoration === 'underline' ? 'none' : 'underline' })} title="Underline"><Underline size={16} /></Button>
                    <Button variant={props.fontStyle === 'italic' ? 'secondary' : 'outline'} onClick={() => updateTransform({ fontStyle: props.fontStyle === 'italic' ? 'normal' : 'italic' })} title="Italic"><Italic size={16} /></Button>
                    <Button variant={props.textTransform === 'uppercase' ? 'secondary' : 'outline'} onClick={() => updateTransform({ textTransform: props.textTransform === 'uppercase' ? 'none' : 'uppercase' })} title="Uppercase"><Type size={16} /></Button>
                </div>
            </div>
        )}

        {/* --- VIDEO TRANSFORM --- */}
        {activePanel === 'transform' && !isText && (
            <div className="flex flex-col gap-10">
                <div className="grid grid-cols-3 gap-4">
                    <Button variant={props.fit === 'cover' ? 'secondary' : 'outline'} className="flex-col h-20 gap-2" onClick={handleFill}><Maximize size={20} /><span className="text-xs">Fill</span></Button>
                    <Button variant={props.fit === 'contain' ? 'secondary' : 'outline'} className="flex-col h-20 gap-2" onClick={handleFit}><Minimize size={20} /><span className="text-xs">Fit</span></Button>
                    <Button variant="outline" className="flex-col h-20 gap-2" onClick={onEnterCrop}><Scissors size={20} /><span className="text-xs">Crop</span></Button>
                </div>
                <div className="flex flex-col gap-4">
                    <span className="text-sm text-muted-foreground font-medium">Flip & Rotate</span>
                    <div className="flex items-center gap-2">
                        <Button variant={props.flipH ? 'secondary' : 'outline'} size="icon" onClick={handleFlipH}><FlipHorizontal size={18} /></Button>
                        <Button variant={props.flipV ? 'secondary' : 'outline'} size="icon" onClick={handleFlipV}><FlipVertical size={18} /></Button>
                        <Button variant="outline" size="icon" onClick={() => handleRotationChange((props.rotation || 0) - 90)}><RotateCcw size={18} /></Button>
                        <div className="flex-1 flex items-center gap-2 ml-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRotationChange((props.rotation || 0) - 1)}><Minus size={14} /></Button>
                            <span className="flex-1 text-center text-sm font-mono text-muted-foreground">{(props.rotation || 0) % 360}°</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRotationChange((props.rotation || 0) + 1)}><Plus size={14} /></Button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- VIDEO ADJUST --- */}
        {activePanel === 'adjust' && !isText && (
            <div className="flex flex-col gap-6">
                {['opacity', 'brightness', 'contrast', 'saturation', 'hue', 'blur'].map((key) => {
                    const k = key as keyof TimelineClip['properties'];
                    let min = 0, max = 100, def = 0;
                    if (k === 'opacity') { min = 0; max = 100; def = 100; }
                    else if (k === 'brightness' || k === 'contrast' || k === 'saturation') { min = -100; max = 100; def = 0; }
                    else if (k === 'hue') { min = -180; max = 180; def = 0; }
                    const val = (props[k] ?? def) as number;
                    return (
                        <div key={key} className="space-y-3">
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground capitalize">{key}</span>
                            <span>{val}{k === 'hue' ? '°' : k === 'opacity' ? '%' : ''}</span>
                        </div>
                        <Slider min={min} max={max} step={1} value={val} onChange={(e) => handleAdjustmentChange(k, Number(e.target.value))} />
                        </div>
                    )
                })}
                <div className="mt-4 flex justify-center"><Button variant="secondary" size="sm" onClick={handleResetAdjustments}>Reset</Button></div>
            </div>
        )}

        {/* --- BACKGROUND (Text) --- */}
        {activePanel === 'background' && (
             <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Background Color</label>
                    <div className="flex items-center gap-2">
                        <div className="relative w-10 h-10 rounded-lg border border-border overflow-hidden cursor-pointer">
                            <input type="color" className="opacity-0 w-full h-full absolute inset-0 cursor-pointer" value={props.backgroundColor || '#000000'} onChange={(e) => updateTransform({ backgroundColor: e.target.value })} />
                            <div className="w-full h-full" style={{ backgroundColor: props.backgroundColor || 'transparent' }} />
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => updateTransform({ backgroundColor: undefined })}>Clear</Button>
                    </div>
                </div>
             </div>
        )}

        {/* --- OPACITY (Text) --- */}
        {activePanel === 'opacity' && isText && (
            <div className="space-y-3">
                <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Opacity</span>
                    <span>{props.opacity ?? 100}%</span>
                </div>
                <Slider min={0} max={100} step={1} value={props.opacity ?? 100} onChange={(e) => handleAdjustmentChange('opacity', Number(e.target.value))} />
            </div>
        )}

        {/* --- AUDIO --- */}
        {activePanel === 'audio' && (
            <div className="flex flex-col gap-8">
                <div className="space-y-4">
                    <div className="flex justify-between text-xs text-muted-foreground"><span>Volume</span><span>{props.volume ?? 100}%</span></div>
                    <Slider min={0} max={200} step={1} value={props.volume ?? 100} onChange={(e) => handleVolumeChange(Number(e.target.value))} />
                </div>
                <div className="space-y-4">
                    <div className="flex justify-between text-xs text-muted-foreground"><span>Fade In</span><span>{props.fadeIn ?? 0}s</span></div>
                    <Slider min={0} max={Math.min(5, selectedClip.clip.duration)} step={0.1} value={props.fadeIn ?? 0} onChange={(e) => handleFadeInChange(Number(e.target.value))} />
                </div>
                <div className="space-y-4">
                    <div className="flex justify-between text-xs text-muted-foreground"><span>Fade Out</span><span>{props.fadeOut ?? 0}s</span></div>
                    <Slider min={0} max={Math.min(5, selectedClip.clip.duration)} step={0.1} value={props.fadeOut ?? 0} onChange={(e) => handleFadeOutChange(Number(e.target.value))} />
                </div>
                <div className="flex items-center justify-between pt-4">
                    <span className="text-sm text-muted-foreground font-medium">Noise reduction</span>
                    <button onClick={toggleNoiseReduction} className={`text-2xl transition-colors ${props.noiseReduction ? 'text-primary' : 'text-muted-foreground'}`}>{props.noiseReduction ? <ToggleRight /> : <ToggleLeft />}</button>
                </div>
            </div>
        )}
        
        {/* --- SPEED --- */}
        {activePanel === 'speed' && (
            <div className="flex flex-col gap-8">
                <div className="space-y-4">
                    <div className="flex justify-between text-xs text-muted-foreground"><span>Speed</span><span>{props.playbackRate}x</span></div>
                    <Slider min={0.1} max={4} step={0.1} value={props.playbackRate || 1} onChange={(e) => handleSpeedChange(Number(e.target.value))} />
                </div>
                <div className="grid grid-cols-5 gap-2">
                    {[0.5, 0.75, 1.25, 1.5, 2].map(speed => (
                        <Button key={speed} variant="outline" size="sm" className={props.playbackRate === speed ? "bg-secondary border-secondary" : ""} onClick={() => handleSpeedChange(speed)}>{speed}x</Button>
                    ))}
                </div>
            </div>
        )}

        {/* --- TIME --- */}
        {activePanel === 'time' && (
            <div className="flex flex-col gap-8">
                <div className="flex bg-muted rounded-lg p-1 border border-border">
                    <button className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${timeMode === 'duration' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setTimeMode('duration')}>Duration</button>
                    <button className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${timeMode === 'timing' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setTimeMode('timing')}>Timing</button>
                </div>
                {timeMode === 'duration' && (
                    <div className="flex flex-col items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-secondary/50"><Minus size={14} /></Button>
                            <div className="bg-card border border-border rounded px-4 py-2 text-lg font-mono">{formatTimeCode(selectedClip.clip.duration)}</div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-secondary/50"><Plus size={14} /></Button>
                        </div>
                        <div className="grid grid-cols-5 gap-2 w-full">
                            {[1, 2, 3, 5, 10].map(sec => (<Button key={sec} variant="outline" size="sm" className="text-xs text-muted-foreground">{sec}s</Button>))}
                        </div>
                    </div>
                )}
                {timeMode === 'timing' && (
                    <div className="space-y-4">
                        <div className="space-y-2"><label className="text-xs text-muted-foreground">Start Time</label><div className="bg-card border border-border rounded px-3 py-2 text-sm font-mono">{formatTimeCode(selectedClip.clip.start)}</div></div>
                        <div className="space-y-2"><label className="text-xs text-muted-foreground">End Time</label><div className="bg-card border border-border rounded px-3 py-2 text-sm font-mono">{formatTimeCode(selectedClip.clip.start + selectedClip.clip.duration)}</div></div>
                    </div>
                )}
            </div>
        )}
      </ScrollArea>
    </div>
  );
};