
import { FC, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { Undo2, Redo2, Crown, Download, Loader2, ChevronRight, Cloud, Check, Home } from 'lucide-react';
import { Button } from './ui/button';
import { ThemeSelector } from './ThemeSelector';
import { UserMenu } from './UserMenu';
import { AuthModal } from './AuthModal';
import { setIsExporting } from '../store/slices/editorSlice';
import { undo, redo, saveProjectToCloud } from '../store/slices/projectSlice'; 
import { RootState, AppDispatch } from '../store/store';

interface HeaderProps {
  isDemo?: boolean;
}

const Header: FC<HeaderProps> = ({ isDemo = false }) => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const isExporting = useSelector((state: RootState) => state.editor.isExporting);
  const pastLength = useSelector((state: RootState) => state.project.past.length);
  const futureLength = useSelector((state: RootState) => state.project.future.length);
  const isSaving = useSelector((state: RootState) => state.project.isSaving);
  const lastSavedAt = useSelector((state: RootState) => state.project.lastSavedAt);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleExport = () => {
    if (!isExporting) {
      dispatch(setIsExporting(true));
    }
  };

  const handleSaveToCloud = () => {
    if (isDemo) {
      // In demo mode, show auth modal instead of saving
      setIsAuthModalOpen(true);
    } else {
      dispatch(saveProjectToCloud());
    }
  };

  return (
    <>
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        initialTab="signup" 
      />
      
      <header className="h-16 bg-background/80 backdrop-blur-xl border-b border-border/40 flex items-center justify-between px-6 shrink-0 z-30 transition-all duration-300">
        {/* Left: Brand */}
        <div className="flex items-center gap-4">
          <div 
            onClick={() => router.push(isDemo ? '/' : '/projects')} 
            className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center text-black font-bold shadow-lg shadow-primary/20 cursor-pointer hover:scale-105 transition-transform"
            title={isDemo ? "Back to Home" : "Back to Projects"}
          >
              {isDemo ? (
                <Home size={16} />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M15 19l-7-7 7-7" /></svg>
              )}
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm font-medium text-muted-foreground">
              {isDemo ? (
                <>
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-full text-xs font-semibold">DEMO MODE</span>
                  <span className="text-foreground">Try the Editor</span>
                </>
              ) : (
                <>
                  <span className="hover:text-foreground cursor-pointer transition-colors" onClick={() => router.push('/projects')}>Projects</span>
                  <ChevronRight size={14} className="opacity-50" />
                  <span className="text-foreground">Untitled Video</span>
                  {lastSavedAt && (
                      <span className="text-[10px] text-muted-foreground ml-2 opacity-70">
                          Saved {new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                  )}
                </>
              )}
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-muted/20 p-0.5 rounded-lg border border-border/30">
            <Button 
              variant="ghost" size="icon" className="h-8 w-8 hover:bg-background/50 rounded-md"
              disabled={isExporting || pastLength === 0} 
              onClick={() => dispatch(undo())}
              title="Undo"
            >
              <Undo2 size={16} />
            </Button>
            <Button 
              variant="ghost" size="icon" className="h-8 w-8 hover:bg-background/50 rounded-md"
              disabled={isExporting || futureLength === 0}
              onClick={() => dispatch(redo())}
              title="Redo"
            >
              <Redo2 size={16} />
            </Button>
          </div>

          <UserMenu />

          <div className={isExporting ? "opacity-50 pointer-events-none" : ""}>
            <ThemeSelector />
          </div>
          
          {/* Save to Cloud Button */}
          <Button 
              variant="ghost" 
              size="sm"
              className="gap-2 text-muted-foreground hover:text-foreground hidden sm:flex"
              onClick={handleSaveToCloud}
              disabled={isSaving || isExporting}
          >
               {isSaving ? <Loader2 size={16} className="animate-spin text-primary" /> : <Cloud size={16} />}
               <span>{isDemo ? 'Save Project' : (isSaving ? 'Saving...' : 'Save')}</span>
          </Button>

          {/* PRO Button - commented out
          <Button variant="outline" size="sm" className="hidden sm:flex gap-2 text-amber-400 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 hover:text-amber-300 rounded-full h-8 text-xs font-semibold uppercase tracking-wider">
            <Crown size={14} />
            PRO
          </Button>
          */}

          <Button 
            size="sm" 
            className="gap-2 rounded-full px-6 h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-[0_0_15px_rgba(var(--primary),0.3)] hover:shadow-[0_0_20px_rgba(var(--primary),0.5)] transition-all duration-300 animate-in fade-in zoom-in"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </header>
    </>
  );
};

export default Header;
