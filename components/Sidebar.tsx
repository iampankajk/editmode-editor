import { FC, ReactNode } from 'react';
import { 
  UploadCloud, Monitor, Type, Music, Video, Image as ImageIcon, 
  Shapes, CircleDot, AudioWaveform, Sparkles, Captions
} from 'lucide-react';
import { SidebarTab } from '../types';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
}

const Sidebar: FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems: { id: SidebarTab; label: string; icon: ReactNode }[] = [
    { id: 'media', label: 'Media', icon: <UploadCloud size={24} /> },
    { id: 'canvas', label: 'Canvas', icon: <Monitor size={24} /> },
    { id: 'ai-images', label: 'AI Images', icon: <Sparkles size={24} /> },
    { id: 'captions', label: 'Captions', icon: <Captions size={24} /> },
    { id: 'text', label: 'Text', icon: <Type size={24} /> },
    { id: 'audio', label: 'Audio', icon: <Music size={24} /> },
    { id: 'videos', label: 'Videos', icon: <Video size={24} /> },
    { id: 'images', label: 'Images', icon: <ImageIcon size={24} /> },
    { id: 'elements', label: 'Elements', icon: <Shapes size={24} /> },
    { id: 'record', label: 'Record', icon: <CircleDot size={24} /> },
    { id: 'tts', label: 'TTS', icon: <AudioWaveform size={24} /> },
  ];

  return (
    <aside className="w-[72px] bg-card border-r border-border flex flex-col shrink-0 z-30 h-full">
      {/* Navigation Items */}
      <ScrollArea className="flex-1 w-full">
        <div className="flex flex-col gap-2 py-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex flex-col items-center justify-center w-full py-3 gap-1 relative group transition-all duration-200",
                activeTab === item.id 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {activeTab === item.id && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full" />
              )}
              <div className={cn("transition-transform duration-200 group-hover:scale-110")}>
                {item.icon}
              </div>
              <span className="text-[10px] font-medium tracking-wide text-center leading-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
};

export default Sidebar;