import { useState, FC } from 'react';
import { AudioWaveform, Play, Plus, Loader2, AlertCircle, RefreshCw, Clock } from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { generateId } from '../../lib/utils';
import { MediaAsset } from '../../types';
import { saveAssetToDB } from '../../lib/persistence';

// Feature flag - set to false when ready to launch
const COMING_SOON = true;

interface TTSPanelProps {
  onAddAssets: (assets: MediaAsset[]) => void;
}

const VOICES = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];

// Helper to convert raw PCM to WAV
const pcmToWav = (base64PCM: string, sampleRate = 24000) => {
  const binaryString = atob(base64PCM);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + len, true); // ChunkSize
  writeString(8, 'WAVE');

  // fmt sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true); // NumChannels (1 for mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * BlockAlign)
  view.setUint16(32, 2, true); // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true); // BitsPerSample

  // data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, len, true); // Subchunk2Size

  const blob = new Blob([view, bytes], { type: 'audio/wav' });
  return blob;
};

export const TTSPanel: FC<TTSPanelProps> = ({ onAddAssets }) => {
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState<{ url: string; blob: Blob } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setIsGenerating(true);
    setError(null);
    setGeneratedAudio(null);

    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key not found in environment");

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("No audio data received from Gemini");

      const wavBlob = pcmToWav(base64Audio);
      const url = URL.createObjectURL(wavBlob);
      setGeneratedAudio({ url, blob: wavBlob });

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate speech");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddToProject = async () => {
    if (!generatedAudio) return;
    
    // Create a robust ID
    const assetId = `tts-${generateId()}`;
    const fileName = `tts-${selectedVoice}-${Date.now()}.wav`;
    const file = new File([generatedAudio.blob], fileName, { type: 'audio/wav' });
    
    // Persist the file so it survives reloads
    await saveAssetToDB(assetId, file);

    const asset: MediaAsset = {
      id: assetId,
      file,
      url: generatedAudio.url,
      type: 'audio',
      duration: 0, // Duration will be calculated by the engine when loaded
      name: `TTS: ${text.slice(0, 20)}${text.length > 20 ? '...' : ''}`
    };
    
    onAddAssets([asset]);
  };

  // Coming Soon UI
  if (COMING_SOON) {
    return (
      <div className="flex flex-col h-full bg-card">
        <div className="p-4 border-b border-border/40 shrink-0">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <AudioWaveform size={20} className="text-primary" />
            Text to Speech
          </h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Clock size={40} className="text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-2">Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-[250px] leading-relaxed">
            AI-powered text to speech is under development. Stay tuned for updates!
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
                <AudioWaveform size={20} className="text-primary" />
                Text to Speech
            </h2>
        </div>

        <ScrollArea className="flex-1 p-4">
            <div className="flex flex-col gap-6">
                
                {/* Prompt Input */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Text Prompt</label>
                    <textarea 
                        className="w-full h-32 bg-muted/30 border border-border rounded-lg p-3 text-sm focus:border-primary outline-none resize-none transition-all placeholder:text-muted-foreground/50"
                        placeholder="Enter text to generate speech..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        maxLength={500}
                    />
                    <div className="flex justify-end">
                        <span className="text-[10px] text-muted-foreground">{text.length}/500</span>
                    </div>
                </div>

                {/* Voice Selection */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Voice</label>
                    <div className="grid grid-cols-3 gap-2">
                        {VOICES.map(voice => (
                            <button
                                key={voice}
                                onClick={() => setSelectedVoice(voice)}
                                className={`px-3 py-2 rounded-md text-sm border transition-all ${selectedVoice === voice ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:border-primary/50'}`}
                            >
                                {voice}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Generate Button */}
                <Button 
                    className="w-full gap-2" 
                    onClick={handleGenerate} 
                    disabled={isGenerating || !text.trim()}
                >
                    {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    {isGenerating ? 'Generating...' : 'Generate Speech'}
                </Button>

                {/* Error Message */}
                {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2 text-destructive text-sm">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <span className="text-xs">{error}</span>
                    </div>
                )}

                {/* Result Preview */}
                {generatedAudio && (
                    <div className="mt-2 p-4 border border-border rounded-xl bg-muted/10 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Preview Result</span>
                        </div>
                        
                        <audio controls src={generatedAudio.url} className="w-full h-8" />

                        <Button className="w-full gap-2" variant="secondary" onClick={handleAddToProject}>
                            <Plus size={16} />
                            Add to Project
                        </Button>
                    </div>
                )}
                
                {/* Info Tip */}
                <div className="p-3 rounded-lg bg-accent/30 text-[11px] text-muted-foreground leading-relaxed">
                   Powered by Gemini 2.5 Flash TTS. Generates high-quality speech in multiple voice personas.
                </div>
            </div>
        </ScrollArea>
    </div>
  );
};