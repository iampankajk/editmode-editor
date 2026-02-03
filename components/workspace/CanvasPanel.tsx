import { useState, FC } from 'react';
import { Monitor, Smartphone, Square, RectangleHorizontal, RectangleVertical, ChevronDown, Check } from 'lucide-react';
import { CanvasSettings } from '../../types';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '../../lib/utils';

interface CanvasPanelProps {
  settings: CanvasSettings;
  onUpdate: (updates: Partial<CanvasSettings>) => void;
}

const PRESETS = [
  { label: '16:9 (Widescreen)', width: 1920, height: 1080, icon: <RectangleHorizontal size={18} /> },
  { label: '9:16 (Story)', width: 1080, height: 1920, icon: <Smartphone size={18} /> },
  { label: '1:1 (Instagram)', width: 1080, height: 1080, icon: <Square size={18} /> },
  { label: '4:5 (Portrait)', width: 1080, height: 1350, icon: <RectangleVertical size={18} /> },
  { label: '21:9 (Cinema)', width: 2560, height: 1080, icon: <Monitor size={18} /> },
];

const COLORS = [
  '#000000', '#ffffff', '#1f2937', '#ef4444', '#f97316', '#f59e0b', '#eab308', 
  '#84cc16', '#22c55e', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', 
  '#d946ef', '#ec4899', '#f43f5e'
];

export const CanvasPanel: FC<CanvasPanelProps> = ({ settings, onUpdate }) => {
  const [isPresetOpen, setIsPresetOpen] = useState(false);

  const currentPreset = PRESETS.find(p => p.width === settings.width && p.height === settings.height) || { label: 'Custom', icon: <RectangleHorizontal /> };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between shrink-0">
        <h2 className="font-semibold">Canvas</h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-8 p-6">
          
          {/* Resize Section */}
          <div className="space-y-4">
            <label className="text-sm text-muted-foreground font-medium">Resize</label>
            <div className="relative">
              <button 
                onClick={() => setIsPresetOpen(!isPresetOpen)}
                className="w-full flex items-center justify-between bg-muted/30 border border-border rounded-lg px-4 py-3 text-sm hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {currentPreset.icon}
                  <span>{currentPreset.label}</span>
                </div>
                <ChevronDown size={16} className="text-muted-foreground" />
              </button>

              {isPresetOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-xl z-50 overflow-hidden">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => {
                        onUpdate({ width: preset.width, height: preset.height });
                        setIsPresetOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-accent hover:text-accent-foreground text-left transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {preset.icon}
                        <span>{preset.label}</span>
                      </div>
                      {settings.width === preset.width && settings.height === preset.height && (
                        <Check size={14} className="text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Background Section */}
          <div className="space-y-4">
            <label className="text-sm text-muted-foreground font-medium">Background</label>
            <div className="flex flex-wrap gap-3">
               {COLORS.map(color => (
                 <button
                   key={color}
                   onClick={() => onUpdate({ backgroundColor: color })}
                   className={cn(
                     "w-8 h-8 rounded-full border border-white/10 hover:scale-110 transition-transform shadow-sm flex items-center justify-center",
                     settings.backgroundColor === color && "ring-2 ring-primary ring-offset-2 ring-offset-card"
                   )}
                   style={{ backgroundColor: color }}
                   title={color}
                 >
                    {settings.backgroundColor === color && (
                        <Check size={14} className="text-white drop-shadow-md mix-blend-difference" />
                    )}
                 </button>
               ))}
               
               {/* Custom Color Picker */}
               <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-red-500 via-green-500 to-blue-500 border border-white/10 hover:scale-110 transition-transform cursor-pointer shadow-sm">
                   <input 
                      type="color" 
                      className="opacity-0 w-full h-full cursor-pointer absolute inset-0"
                      value={settings.backgroundColor}
                      onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
                   />
               </div>
            </div>
          </div>

        </div>
      </ScrollArea>
    </div>
  );
};