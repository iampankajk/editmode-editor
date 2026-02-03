import { useState, FC } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Captions, Wand2, Loader2, AlertCircle, CheckCircle2, Video, Music, MousePointerClick, Clock } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { RootState } from '../../store/store';
import { MediaAsset, TimelineClip, Track } from '../../types';
import { addTrack, addClip, addAssets } from '../../store/slices/projectSlice';
import { setSelectedClipId } from '../../store/slices/editorSlice';
import { generateId, fileToGenerativePart, cn } from '../../lib/utils';

// Feature flag - set to false when ready to launch
const COMING_SOON = true;

// Caption Styles
const STYLES = [
    { 
        id: 'standard', 
        name: 'Subtitle Standard', 
        props: { 
            fontSize: 40, fontFamily: 'Arial', textColor: '#ffffff', 
            backgroundColor: 'rgba(0,0,0,0.6)', 
            y: 400, // Bottom area
            textAlign: 'center'
        } 
    },
    { 
        id: 'yellow', 
        name: 'Pop Yellow', 
        props: { 
            fontSize: 50, fontFamily: 'Montserrat', fontWeight: 'bold', 
            textColor: '#fbbf24', 
            // stroke/shadow simulated via text shadow in renderer if supported, or basic colors
            y: 0, 
            textAlign: 'center'
        } 
    },
    { 
        id: 'minimal', 
        name: 'Minimal Black', 
        props: { 
            fontSize: 32, fontFamily: 'Roboto', textColor: '#000000', 
            backgroundColor: '#ffffff', 
            y: 450, 
            textAlign: 'center'
        } 
    },
];

export const CaptionsPanel: FC = () => {
  const dispatch = useDispatch();
  const selectedClipId = useSelector((state: RootState) => state.editor.selectedClipId);
  const assets = useSelector((state: RootState) => state.project.present.assets);
  const tracks = useSelector((state: RootState) => state.project.present.tracks);

  // Find the selected clip and asset
  let selectedClip: TimelineClip | undefined;
  let selectedTrack: Track | undefined;
  
  if (selectedClipId) {
    for (const track of tracks) {
        const clip = track.clips.find(c => c.id === selectedClipId);
        if (clip) {
            selectedClip = clip;
            selectedTrack = track;
            break;
        }
    }
  }
  
  const selectedAsset = selectedClip ? assets.find(a => a.id === selectedClip!.assetId) : undefined;
  const isEligible = selectedAsset && (selectedAsset.type === 'video' || selectedAsset.type === 'audio');

  // Helper: Find all eligible clips on timeline
  const eligibleClips = tracks.flatMap(track => 
    track.clips.map(clip => {
      const asset = assets.find(a => a.id === clip.assetId);
      if (asset && (asset.type === 'video' || asset.type === 'audio')) {
        return { clip, track, asset };
      }
      return null;
    })
  ).filter(item => item !== null) as { clip: TimelineClip, track: Track, asset: MediaAsset }[];

  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0]);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateCaptions = async () => {
    if (!selectedClip || !selectedAsset || !selectedAsset.file) return;

    setIsGenerating(true);
    setError(null);
    setStatus('Preparing audio...');

    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) throw new Error("API Key not found");

        // 1. Prepare File for Gemini
        const base64Data = await fileToGenerativePart(selectedAsset.file);
        
        setStatus('Analyzing speech with Gemini...');
        
        const ai = new GoogleGenAI({ apiKey });
        
        // 2. Call Gemini
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: selectedAsset.file.type, data: base64Data } },
                    { text: "Transcribe the spoken audio in this file. Return a JSON array of objects, where each object has 'start' (number, in seconds), 'end' (number, in seconds), and 'text' (string) properties. Group words into natural subtitle phrases. Minimum duration per segment should be roughly 1.5 seconds unless it's a very short exclamation. Avoid single-word segments." }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            start: { type: Type.NUMBER },
                            end: { type: Type.NUMBER },
                            text: { type: Type.STRING }
                        }
                    }
                }
            }
        });

        setStatus('Processing response...');
        
        const jsonText = response.text || "[]";
        const captions = JSON.parse(jsonText) as { start: number; end: number; text: string }[];

        if (captions.length === 0) {
            throw new Error("No speech detected or empty response.");
        }

        // 3. Create Caption Track
        setStatus('Adding to timeline...');
        
        setTimeout(() => {
             const targetTrack = tracks[tracks.length - 1]; // Use the last track
             const newAssets: MediaAsset[] = [];
             const newClips: TimelineClip[] = [];
             
             captions.forEach(cap => {
                 // Calculate Timeline Time
                 const absoluteCapStart = cap.start;
                 const absoluteCapEnd = cap.end;
                 
                 // Check overlap with visible portion of clip
                 const visibleStart = selectedClip!.offset;
                 const visibleEnd = selectedClip!.offset + selectedClip!.duration;
                 
                 if (absoluteCapEnd < visibleStart || absoluteCapStart > visibleEnd) {
                     return; // Skip captions outside the trimmed video
                 }
                 
                 // Calculate Timeline Position
                 const relativeStart = Math.max(0, absoluteCapStart - visibleStart);
                 const duration = Math.min(absoluteCapEnd, visibleEnd) - Math.max(absoluteCapStart, visibleStart);
                 
                 // Filter out extremely short captions (micro-segments)
                 if (duration < 0.5) {
                     return; 
                 }

                 const timelineStart = selectedClip!.start + relativeStart;
                 
                 // Create Asset
                 const textAssetId = `text-cap-${generateId()}`;
                 const textAsset: MediaAsset = {
                     id: textAssetId,
                     type: 'text',
                     name: `Caption: ${cap.text.substring(0, 15)}...`,
                     duration: duration
                 };
                 newAssets.push(textAsset);
                 
                 const newClip: TimelineClip = {
                     id: generateId(),
                     assetId: textAssetId,
                     trackId: targetTrack.id,
                     start: timelineStart,
                     duration: duration,
                     offset: 0,
                     properties: {
                         ...selectedStyle.props,
                         text: cap.text,
                         x: 0, scale: 1, rotation: 0, flipH: false, flipV: false, fit: 'contain',
                         opacity: 100
                     } as any
                 };
                 newClips.push(newClip);
             });
             
             if (newAssets.length > 0) {
                 dispatch(addAssets(newAssets));
                 // Dispatch clips one by one as projectSlice doesn't support bulk addClip yet
                 newClips.forEach(clip => dispatch(addClip(clip)));
             }
             
             setStatus('');
             setIsGenerating(false);
        }, 500);

    } catch (e: any) {
        console.error(e);
        setError(e.message || "Failed to generate captions.");
        setIsGenerating(false);
    }
  };

  // Coming Soon UI
  if (COMING_SOON) {
    return (
      <div className="flex flex-col h-full bg-card">
        <div className="p-4 border-b border-border/40 shrink-0">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Captions size={20} className="text-primary" />
            Auto Captions
          </h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Clock size={40} className="text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-2">Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-[250px] leading-relaxed">
            AI-powered auto captions are under development. Stay tuned for updates!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card">
       <div className="p-4 border-b border-border/40 shrink-0">
            <h2 className="font-bold text-lg flex items-center gap-2">
                <Captions size={20} className="text-primary" />
                Auto Captions
            </h2>
        </div>

        <ScrollArea className="flex-1 p-4">
            {!selectedClip || !isEligible ? (
                <div className="flex flex-col gap-6">
                    {/* Empty State / Instruction */}
                    <div className="text-center space-y-3 py-6 rounded-xl bg-muted/20 border border-border/50">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary mb-2 shadow-sm">
                            <Wand2 size={24} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-medium text-foreground">AI Auto-Captions</h3>
                            <p className="text-xs text-muted-foreground px-6 leading-relaxed">
                                Automatically generate synchronized subtitles for your video or audio clips.
                            </p>
                        </div>
                    </div>

                    {/* List of Eligible Clips */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                             <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Select a clip to start
                            </h4>
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{eligibleClips.length} available</span>
                        </div>
                        
                        {eligibleClips.length === 0 ? (
                            <div className="p-6 border border-dashed border-border rounded-lg text-center text-xs text-muted-foreground bg-muted/10">
                                <p>No eligible media found on timeline.</p>
                                <p className="mt-1 opacity-70">Drag a video or audio file to the timeline to begin.</p>
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                {eligibleClips.map(({ clip, track, asset }) => (
                                    <button
                                        key={clip.id}
                                        onClick={() => dispatch(setSelectedClipId(clip.id))}
                                        className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 hover:border-primary/50 transition-all text-left group relative overflow-hidden"
                                    >
                                        <div className={cn(
                                            "h-10 w-10 rounded-md flex items-center justify-center shrink-0 transition-colors",
                                            asset.type === 'video' ? "bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20" : "bg-teal-500/10 text-teal-500 group-hover:bg-teal-500/20"
                                        )}>
                                            {asset.type === 'video' ? <Video size={18} /> : <Music size={18} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">{asset.name}</div>
                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                <span className="bg-muted px-1.5 py-0.5 rounded text-foreground/70">{track.name}</span>
                                                <span>•</span>
                                                <span>{clip.duration.toFixed(1)}s</span>
                                            </div>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-primary">
                                            <MousePointerClick size={16} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    <div className="p-3 bg-muted/30 rounded-lg border border-border flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-xs text-muted-foreground uppercase font-semibold">Selected Media</span>
                            <span className="text-sm font-medium truncate">{selectedAsset?.name}</span>
                            <span className="text-[10px] text-muted-foreground">{selectedClip.duration.toFixed(1)}s selection</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-7 text-[10px] text-muted-foreground hover:text-foreground"
                                onClick={() => dispatch(setSelectedClipId(null))}
                            >
                                Change
                            </Button>
                            <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-medium text-muted-foreground">Caption Style</label>
                        <div className="grid grid-cols-1 gap-2">
                            {STYLES.map(style => (
                                <button
                                    key={style.id}
                                    onClick={() => setSelectedStyle(style)}
                                    className={cn(
                                        "flex items-center p-3 rounded-lg border text-left transition-all hover:bg-accent",
                                        selectedStyle.id === style.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"
                                    )}
                                >
                                    <div className="flex-1">
                                        <div className="text-xs font-semibold mb-1">{style.name}</div>
                                        <div 
                                            className="text-[10px] px-2 py-1 rounded w-fit"
                                            style={{
                                                color: style.props.textColor,
                                                backgroundColor: style.props.backgroundColor || 'transparent',
                                                fontFamily: style.props.fontFamily,
                                                fontWeight: style.props.fontWeight as any
                                            }}
                                        >
                                            Sample Text
                                        </div>
                                    </div>
                                    {selectedStyle.id === style.id && <div className="h-2 w-2 rounded-full bg-primary" />}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded text-[11px] text-yellow-600 dark:text-yellow-400 leading-snug">
                        <strong>Note:</strong> Captions will be added to the <strong>last track</strong>. Make sure you have an empty track available.
                    </div>

                    <Button 
                        className="w-full gap-2 shadow-lg shadow-primary/20" 
                        onClick={handleGenerateCaptions}
                        disabled={isGenerating}
                    >
                        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                        {isGenerating ? 'Processing Audio...' : 'Generate Captions'}
                    </Button>
                    
                    {status && (
                        <div className="text-center text-xs text-muted-foreground animate-pulse">
                            {status}
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2 text-destructive text-sm">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span className="text-xs">{error}</span>
                        </div>
                    )}
                </div>
            )}
        </ScrollArea>
    </div>
  );
};