import { useState, FC } from 'react';
import { Sparkles, Plus, Loader2, AlertCircle, RectangleHorizontal, RectangleVertical, Square, Image as ImageIcon, Clock } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { generateId, cn } from '../../lib/utils';
import { MediaAsset } from '../../types';
import { saveAssetToDB } from '../../lib/persistence';

// Feature flag - set to false when ready to launch
const COMING_SOON = true;

interface AIImagePanelProps {
  onAddAssets: (assets: MediaAsset[]) => void;
}

const RATIOS = [
    { label: '1:1', value: '1:1', icon: <Square size={16} /> },
    { label: '16:9', value: '16:9', icon: <RectangleHorizontal size={16} /> },
    { label: '9:16', value: '9:16', icon: <RectangleVertical size={16} /> },
    { label: '4:3', value: '4:3', icon: <RectangleHorizontal size={14} className="scale-y-125" /> },
    { label: '3:4', value: '3:4', icon: <RectangleVertical size={14} className="scale-x-125" /> },
];

export const AIImagePanel: FC<AIImagePanelProps> = ({ onAddAssets }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key not found in environment");

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }]
        },
        config: {
          imageConfig: { aspectRatio: aspectRatio as any }
        }
      });

      let base64Image = null;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                base64Image = part.inlineData.data;
                break;
            }
        }
      }

      if (!base64Image) throw new Error("No image data received from Gemini");
      setGeneratedImage(`data:image/png;base64,${base64Image}`);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddToProject = async () => {
    if (!generatedImage) return;

    try {
        // Convert Data URL to File
        const res = await fetch(generatedImage);
        const blob = await res.blob();
        
        const assetId = `ai-img-${generateId()}`;
        const fileName = `ai-${aspectRatio.replace(':','-')}-${Date.now()}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });

        await saveAssetToDB(assetId, file);

        const asset: MediaAsset = {
            id: assetId,
            file,
            url: generatedImage,
            type: 'image',
            duration: 5,
            name: `AI: ${prompt.slice(0, 15)}${prompt.length > 15 ? '...' : ''}`
        };

        onAddAssets([asset]);
    } catch (e) {
        console.error("Failed to add image asset", e);
    }
  };

  // Coming Soon UI
  if (COMING_SOON) {
    return (
      <div className="flex flex-col h-full bg-card">
        <div className="p-4 border-b border-border/40 shrink-0">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Sparkles size={20} className="text-primary" />
            AI Image Gen
          </h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Clock size={40} className="text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-2">Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-[250px] leading-relaxed">
            AI-powered image generation is under development. Stay tuned for updates!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card">
        {/* Header */}
        <div className="p-4 border-b border-border/40 shrink-0">
            <h2 className="font-bold text-lg flex items-center gap-2">
                <Sparkles size={20} className="text-primary" />
                AI Image Gen
            </h2>
        </div>

        <ScrollArea className="flex-1 p-4">
            <div className="flex flex-col gap-6">
                
                {/* Prompt Input */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Prompt</label>
                    <textarea 
                        className="w-full h-32 bg-muted/30 border border-border rounded-lg p-3 text-sm focus:border-primary outline-none resize-none transition-all placeholder:text-muted-foreground/50"
                        placeholder="Describe the image you want to generate..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        maxLength={500}
                    />
                </div>

                {/* Aspect Ratio */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Aspect Ratio</label>
                    <div className="grid grid-cols-5 gap-2">
                        {RATIOS.map(r => (
                            <button
                                key={r.value}
                                onClick={() => setAspectRatio(r.value)}
                                className={cn(
                                    "flex flex-col items-center justify-center p-2 rounded-md border transition-all gap-1",
                                    aspectRatio === r.value 
                                        ? "bg-primary/10 border-primary text-primary" 
                                        : "bg-background border-border hover:border-primary/50 text-muted-foreground"
                                )}
                                title={r.label}
                            >
                                {r.icon}
                                <span className="text-[10px] font-medium">{r.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Generate Button */}
                <Button 
                    className="w-full gap-2" 
                    onClick={handleGenerate} 
                    disabled={isGenerating || !prompt.trim()}
                >
                    {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {isGenerating ? 'Generating...' : 'Generate Image'}
                </Button>

                {/* Error Message */}
                {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2 text-destructive text-sm">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <span className="text-xs">{error}</span>
                    </div>
                )}

                {/* Result Preview */}
                {generatedImage && (
                    <div className="mt-2 p-4 border border-border rounded-xl bg-muted/10 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Result</span>
                        </div>
                        
                        <div className="relative rounded-lg overflow-hidden border border-border/50 shadow-sm bg-black/20">
                             <img src={generatedImage} alt="Generated" className="w-full h-auto max-h-[300px] object-contain" />
                        </div>

                        <Button className="w-full gap-2" variant="secondary" onClick={handleAddToProject}>
                            <Plus size={16} />
                            Add to Project
                        </Button>
                    </div>
                )}

                {/* Info Tip */}
                <div className="p-3 rounded-lg bg-accent/30 text-[11px] text-muted-foreground leading-relaxed">
                   Powered by Gemini 2.5 Flash Image. Generates high-quality images based on your description.
                </div>
            </div>
        </ScrollArea>
    </div>
  );
};