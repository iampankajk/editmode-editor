import { FC } from 'react';
import { CircleDot, Clock } from 'lucide-react';

// Feature flag - set to false when ready to launch
const COMING_SOON = true;

export const RecordPanel: FC = () => {
  // Coming Soon UI
  if (COMING_SOON) {
    return (
      <div className="flex flex-col h-full bg-card">
        <div className="p-4 border-b border-border/40 shrink-0">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <CircleDot size={20} className="text-primary" />
            Record
          </h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Clock size={40} className="text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-2">Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-[250px] leading-relaxed">
            Screen and webcam recording is under development. Stay tuned for updates!
          </p>
        </div>
      </div>
    );
  }

  // Actual implementation will go here
  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-4 border-b border-border/40 shrink-0">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <CircleDot size={20} className="text-primary" />
          Record
        </h2>
      </div>
      <div className="flex-1 p-4">
        {/* Future implementation */}
      </div>
    </div>
  );
};
