import { useState, useEffect, FC } from 'react';
import { Check, Square, RectangleHorizontal, RectangleVertical } from 'lucide-react';
import { TimelineClip, MediaAsset } from '../../types';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '../../lib/utils';

interface CropToolProps {
  selectedClip: { clip: TimelineClip; track: any } | null;
  onUpdateClip: (trackId: string, clipId: string, updates: Partial<TimelineClip>) => void;
  onExit: () => void;
  getAsset: (id: string) => MediaAsset | undefined;
  getVideoDimensions: (id: string) => { width: number; height: number } | null;
}

export const CropTool: FC<CropToolProps> = ({
  selectedClip,
  onUpdateClip,
  onExit,
  getAsset,
  getVideoDimensions
}) => {
  const [activeRatio, setActiveRatio] = useState<number>(0);

  // Initialize state based on current clip properties
  useEffect(() => {
    if (selectedClip && !selectedClip.clip.properties.crop) {
      setActiveRatio(0); // Free/Original
    }
  }, [selectedClip]);

  const updateTransform = (updates: Partial<TimelineClip['properties']>) => {
    if (!selectedClip) return;
    const { clip, track } = selectedClip;
    const newProps = { ...clip.properties, ...updates };
    onUpdateClip(track.id, clip.id, { properties: newProps });
  };

  const handleApplyCropRatio = (ratio: number) => {
    if (!selectedClip) return;
    setActiveRatio(ratio);
    
    const asset = getAsset(selectedClip.clip.assetId);
    if (!asset) return;

    let vidW = 1920; 
    let vidH = 1080;
    
    // Try to get cached dimensions
    const dims = getVideoDimensions(asset.id);
    if (dims) {
        vidW = dims.width;
        vidH = dims.height;
    }

    const sourceRatio = vidW / vidH;
    let newW = 1, newH = 1;
    let newX = 0, newY = 0;

    if (sourceRatio > ratio) {
        // Source wider than target: Crop Width
        const w = (ratio * vidH) / vidW;
        newW = w;
        newX = (1 - w) / 2;
    } else {
        // Source taller than target: Crop Height
        const h = vidW / (ratio * vidH);
        newH = h;
        newY = (1 - h) / 2;
    }

    updateTransform({
        crop: { x: newX, y: newY, width: newW, height: newH }
    });
  };

  const handleRevertCrop = () => {
      setActiveRatio(0);
      updateTransform({ crop: undefined });
  };

  const handleRotationChange = (val: number) => updateTransform({ rotation: val });

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="h-14 flex items-center justify-between px-4 border-b shrink-0 bg-muted/40">
        <span className="font-medium">Crop</span>
        <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onExit} className="hover:bg-destructive/10 hover:text-destructive">
                Cancel
            </Button>
            <Button size="sm" onClick={onExit} className="gap-1 bg-primary text-primary-foreground">
                <Check size={16} /> Done
            </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-6">
        <div className="flex flex-col gap-8">
          {/* Aspect Ratios */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Free', ratio: 0, icon: <Square size={16} /> },
              { label: '16:9', ratio: 16/9, icon: <RectangleHorizontal size={16} /> },
              { label: '9:16', ratio: 9/16, icon: <RectangleVertical size={16} /> },
              { label: '1:1', ratio: 1, icon: <Square size={16} /> },
              { label: '4:3', ratio: 4/3, icon: <RectangleHorizontal size={16} /> },
              { label: '4:5', ratio: 4/5, icon: <RectangleVertical size={16} /> },
            ].map(opt => (
              <Button 
                key={opt.label}
                variant={activeRatio === opt.ratio ? "secondary" : "outline"}
                className={cn(
                    "flex-col h-auto py-4 gap-2 bg-background hover:bg-accent transition-all",
                    activeRatio === opt.ratio && "border-primary bg-primary/5 text-primary"
                )}
                onClick={() => opt.ratio === 0 ? handleRevertCrop() : handleApplyCropRatio(opt.ratio)}
              >
                {opt.icon}
                <span className="text-xs">{opt.label}</span>
              </Button>
            ))}
          </div>

          {/* Rotation */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Rotate</span>
              <span>{(selectedClip?.clip.properties.rotation || 0)}°</span>
            </div>
            <Slider 
              min={-45} max={45} step={1}
              value={selectedClip?.clip.properties.rotation || 0}
              onChange={(e) => handleRotationChange(Number(e.target.value))}
            />
          </div>
          
          <div className="mt-4 flex justify-center">
            <Button variant="secondary" size="sm" onClick={handleRevertCrop}>
              Revert to original
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};