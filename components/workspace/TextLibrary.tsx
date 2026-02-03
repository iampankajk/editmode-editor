import { FC } from 'react';
import { Type, Info } from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';

interface TextLibraryProps {
  onAddText: (preset: any) => void;
}

export const TextLibrary: FC<TextLibraryProps> = ({ onAddText }) => {
  const presets = [
    { label: 'Title text', style: { fontSize: 80, fontWeight: 'bold', text: 'Title Text' } },
    { label: 'Regular text', style: { fontSize: 40, fontWeight: 'normal', text: 'Regular text' } },
    { label: 'Hand Write', style: { fontSize: 60, fontFamily: 'cursive', text: 'Hand Write' } },
    { label: 'Italic Text', style: { fontSize: 50, fontStyle: 'italic', text: 'Italic Text' } },
    { label: 'Underline', style: { fontSize: 50, textDecoration: 'underline', text: 'Underline' } },
    { label: 'UPPERCASE', style: { fontSize: 50, text: 'UPPERCASE' } },
    { label: 'Rounded', style: { fontSize: 50, backgroundColor: '#333333', text: 'Rounded', textColor: '#ffffff' } },
    { label: 'BLACK', style: { fontSize: 50, backgroundColor: '#000000', text: 'BLACK', textColor: '#ffffff' } },
    { label: 'WHITE', style: { fontSize: 50, backgroundColor: '#ffffff', text: 'WHITE', textColor: '#000000' } },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center gap-2 shrink-0 bg-background z-10">
        <h2 className="font-semibold">Text</h2>
        <div className="group relative flex items-center">
             <Info size={14} className="text-muted-foreground/70 cursor-help hover:text-primary transition-colors" />
             <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 w-48 bg-popover text-popover-foreground text-xs p-3 rounded-md shadow-lg border border-border pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                 Click a preset to add it to the top track, or <span className="font-bold text-primary">drag and drop</span> presets directly onto any track in the timeline.
                 {/* Little arrow for tooltip */}
                 <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 border-8 border-transparent border-r-popover w-0 h-0"></div>
             </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="grid grid-cols-2 gap-3">
          {presets.map((preset, idx) => (
            <button
              key={idx}
              draggable
              onDragStart={(e) => {
                  e.dataTransfer.setData('application/json', JSON.stringify({
                      type: 'NEW_TEXT',
                      style: preset.style
                  }));
                  e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => onAddText(preset.style)}
              className="aspect-[2/1] rounded-lg border border-border bg-card hover:bg-accent transition-colors flex items-center justify-center p-2 group relative overflow-hidden active:scale-95 duration-75 cursor-grab active:cursor-grabbing"
            >
              <span 
                className="text-center truncate w-full"
                style={{
                    fontFamily: preset.style.fontFamily,
                    fontWeight: preset.style.fontWeight as any,
                    fontStyle: preset.style.fontStyle as any,
                    textDecoration: preset.style.textDecoration as any,
                    fontSize: '14px', // Preview size
                }}
              >
                {preset.label}
              </span>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <Type className="text-white" />
              </div>
            </button>
          ))}
        </div>
        
        <div className="mt-6">
            <h3 className="text-xs font-medium text-muted-foreground mb-3">More Fonts</h3>
            <div className="grid grid-cols-3 gap-2">
                 {['Classic', 'Meme', 'Spacing', 'Manuscript', 'Strict', 'Cheerful'].map(font => (
                     <button key={font} className="p-3 rounded bg-secondary/50 hover:bg-secondary text-xs text-center transition-colors">
                         {font}
                     </button>
                 ))}
            </div>
        </div>
      </ScrollArea>
    </div>
  );
};