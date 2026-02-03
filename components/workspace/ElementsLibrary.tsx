import { useState, FC } from 'react';
import { Shapes, Smile, Sticker, Image as ImageIcon, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';

interface ElementsLibraryProps {
  onAddElement: (url: string, type: 'sticker' | 'emoji' | 'gif' | 'shape') => void;
}

// ... (Data constants SHAPES, STICKERS, EMOJIS, GIFS remain the same)
const SHAPES = [
  { id: 'rect_red', url: 'https://placehold.co/200x200/ef4444/ef4444.png', type: 'shape' },
  { id: 'circle_orange', url: 'https://placehold.co/200x200/f97316/f97316.png?text= ', type: 'shape', style: { borderRadius: '50%' } }, 
  { id: 'rect_yellow', url: 'https://placehold.co/200x200/eab308/eab308.png', type: 'shape' },
  { id: 'rect_green', url: 'https://placehold.co/200x200/22c55e/22c55e.png', type: 'shape' },
  { id: 'rect_blue', url: 'https://placehold.co/200x200/3b82f6/3b82f6.png', type: 'shape' },
];

const STICKERS = [
  { id: 's1', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbWw5b3p4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4/3o7TKSjRrfIPjeiVyM/giphy.gif', type: 'sticker' },
  { id: 's2', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbWw5b3p4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4/l0HlHFRbYdbYBpslO/giphy.gif', type: 'sticker' },
  { id: 's3', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbWw5b3p4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4/xT5LMHxhOfscxPfIfm/giphy.gif', type: 'sticker' },
  { id: 's4', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbWw5b3p4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4/3o6ZtpvPW6fqxkE1ll/giphy.gif', type: 'sticker' },
];

const EMOJIS = [
  { id: 'e1', url: 'https://em-content.zobj.net/source/microsoft-teams/363/grinning-face-with-big-eyes_1f603.png', type: 'emoji' },
  { id: 'e2', url: 'https://em-content.zobj.net/source/microsoft-teams/363/rolling-on-the-floor-laughing_1f923.png', type: 'emoji' },
  { id: 'e3', url: 'https://em-content.zobj.net/source/microsoft-teams/363/smiling-face-with-heart-eyes_1f60d.png', type: 'emoji' },
  { id: 'e4', url: 'https://em-content.zobj.net/source/microsoft-teams/363/smiling-face-with-hearts_1f970.png', type: 'emoji' },
  { id: 'e5', url: 'https://em-content.zobj.net/source/microsoft-teams/363/face-blowing-a-kiss_1f618.png', type: 'emoji' },
];

const GIFS = [
  { id: 'g1', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbWw5b3p4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4/JIX9t2j0ZTN9S/giphy.gif', type: 'gif' },
  { id: 'g2', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbWw5b3p4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4/l0HlHFRbYdbYBpslO/giphy.gif', type: 'gif' },
  { id: 'g3', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbWw5b3p4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4/3o6UB3VhArvomJHtdK/giphy.gif', type: 'gif' },
  { id: 'g4', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbWw5b3p4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4b3Z4/3o7TKSjRrfIPjeiVyM/giphy.gif', type: 'gif' },
];

export const ElementsLibrary: FC<ElementsLibraryProps> = ({ onAddElement }) => {
  const Section = ({ title, items, type, onViewAll }: any) => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          {title}
        </h3>
        {onViewAll && (
          <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground hover:text-primary" onClick={onViewAll}>
            View all
          </Button>
        )}
      </div>
      <div className="grid grid-cols-4 gap-3">
        {items.slice(0, 8).map((item: any) => (
          <button
            key={item.id}
            onClick={() => onAddElement(item.url, item.type)}
            className="aspect-square rounded-xl bg-card border border-border/40 hover:border-primary/50 hover:bg-muted/50 transition-all duration-200 p-2 flex items-center justify-center overflow-hidden hover:scale-105 shadow-sm hover:shadow-md"
          >
            <img src={item.url} alt={item.type} className="w-full h-full object-contain drop-shadow-sm" style={item.style} />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border/40 flex items-center justify-between shrink-0">
        <h2 className="font-bold text-lg">Elements</h2>
      </div>

      <ScrollArea className="flex-1 p-6">
        <Section title="Shapes" items={SHAPES} type="shape" />
        <Section title="Stickers" items={STICKERS} type="sticker" />
        <Section title="Emoji" items={EMOJIS} type="emoji" />
        <Section title="GIFs" items={GIFS} type="gif" />
      </ScrollArea>
    </div>
  );
};