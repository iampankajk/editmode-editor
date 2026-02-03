import { useRef, useState, useEffect, DragEvent, FC } from 'react';
import { UploadCloud, FileVideo, Image as ImageIcon, Music, FolderOpen, Search, Play, Pause, Plus, Loader2, Check } from 'lucide-react';
import { MediaAsset, SidebarTab } from '../../types';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { cn, generateId } from '../../lib/utils';
import { saveAssetToDB } from '../../lib/persistence';

interface MediaLibraryProps {
  activeTab: SidebarTab;
  assets: MediaAsset[];
  onFilesSelected: (files: FileList) => void;
  onDragStart: (e: DragEvent, assetId: string, type: string) => void;
  onAddAssets?: (assets: MediaAsset[]) => void;
}

// Pixabay API Key
const PIXABAY_API_KEY = '53510414-bc6e5e778c6418d403a0792e7'; 

// Fallback/Curated Music (Pixabay does not have a public Audio API endpoint)
const STOCK_MUSIC = [
  { id: 'stock_1', name: 'Cinematic Ambient', artist: 'Nature', duration: 180, url: 'https://cdn.pixabay.com/download/audio/2022/10/05/audio_68619da372.mp3', category: 'Cinematic' },
  { id: 'stock_2', name: 'Upbeat Corporate', artist: 'Business', duration: 120, url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3', category: 'Corporate' },
  { id: 'stock_3', name: 'LoFi Chill', artist: 'Study Time', duration: 150, url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3', category: 'Lo-Fi' },
  { id: 'stock_4', name: 'Acoustic Breeze', artist: 'Folk', duration: 200, url: 'https://cdn.pixabay.com/download/audio/2022/01/21/audio_31743c58bd.mp3', category: 'Acoustic' },
  { id: 'stock_5', name: 'Action Trailer', artist: 'Epic', duration: 140, url: 'https://cdn.pixabay.com/download/audio/2021/11/24/audio_c0c53e8392.mp3', category: 'Cinematic' },
  { id: 'stock_6', name: 'Happy Vibes', artist: 'Sunshine', duration: 160, url: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_51cc6e5d84.mp3', category: 'Upbeat' },
  { id: 'stock_7', name: 'Relaxing Piano', artist: 'Relax', duration: 190, url: 'https://cdn.pixabay.com/download/audio/2022/02/10/audio_fc8c859d28.mp3', category: 'Piano' },
  { id: 'stock_8', name: 'Techno Beat', artist: 'Club', duration: 130, url: 'https://cdn.pixabay.com/download/audio/2022/03/09/audio_82200215b2.mp3', category: 'Electronic' },
];

export const MediaLibrary: FC<MediaLibraryProps> = ({
  activeTab,
  assets,
  onFilesSelected,
  onDragStart,
  onAddAssets
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // API State
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preview States
  const [previewAudioId, setPreviewAudioId] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const [hoverVideoId, setHoverVideoId] = useState<string | null>(null);

  // Feedback State
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [downloadingItems, setDownloadingItems] = useState<Set<string>>(new Set());

  // Debounce Search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    return () => {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current = null;
      }
    };
  }, []);

  // Fetch Stock Data
  useEffect(() => {
    const fetchPixabayAssets = async () => {
      // If it's music, we use local mock because Pixabay has no public Audio API
      if (activeTab === 'audio') {
          let filtered = STOCK_MUSIC;
          if (debouncedSearch) {
              const q = debouncedSearch.toLowerCase();
              filtered = STOCK_MUSIC.filter(s => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
          }
          setStockItems(filtered);
          return;
      }

      if (activeTab !== 'videos' && activeTab !== 'images') {
          setStockItems([]);
          return;
      }

      setIsLoading(true);
      setError(null);

      try {
          const type = activeTab === 'videos' ? 'video' : 'photo';
          const endpoint = activeTab === 'videos' 
              ? `https://pixabay.com/api/videos/` 
              : `https://pixabay.com/api/`;
          
          const params = new URLSearchParams({
              key: PIXABAY_API_KEY,
              q: debouncedSearch || (activeTab === 'videos' ? 'nature' : 'background'), // Default query
              per_page: '20',
              safesearch: 'true'
          });

          if (activeTab === 'images') params.append('image_type', 'photo');

          const res = await fetch(`${endpoint}?${params.toString()}`);
          if (!res.ok) throw new Error('Failed to fetch from Pixabay');
          const data = await res.json();

          const mappedItems = data.hits.map((hit: any) => {
              if (activeTab === 'videos') {
                  // Pixabay video object structure
                  const videoFile = hit.videos?.medium || hit.videos?.small || hit.videos?.tiny;
                  return {
                      id: `pix_vid_${hit.id}`,
                      name: hit.tags || 'Stock Video',
                      duration: hit.duration,
                      url: videoFile?.url,
                      thumb: hit.userImageURL || `https://i.vimeocdn.com/video/${hit.picture_id}_295x166.jpg`, // Fallback thumbnail logic often needed for Pixabay
                      type: 'video',
                      category: hit.tags
                  };
              } else {
                  return {
                      id: `pix_img_${hit.id}`,
                      name: hit.tags || 'Stock Image',
                      duration: 5,
                      url: hit.largeImageURL, // High res for usage
                      thumb: hit.webformatURL, // Low res for grid
                      type: 'image',
                      category: hit.tags
                  };
              }
          });

          setStockItems(mappedItems);
      } catch (err) {
          console.error(err);
          setError('Failed to load stock assets');
      } finally {
          setIsLoading(false);
      }
    };

    fetchPixabayAssets();
  }, [activeTab, debouncedSearch]);

  const handleToggleAudioPreview = (url: string, id: string) => {
    if (previewAudioId === id) {
      audioPreviewRef.current?.pause();
      setPreviewAudioId(null);
    } else {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      const audio = new Audio(url);
      audio.volume = 0.5;
      audio.onended = () => setPreviewAudioId(null);
      audio.play().catch(e => console.error("Preview failed", e));
      audioPreviewRef.current = audio;
      setPreviewAudioId(id);
    }
  };

  const handleAddStockAsset = async (item: any, type: 'audio' | 'video' | 'image') => {
    if (!onAddAssets) return;
    if (downloadingItems.has(item.id)) return;

    // Start Download State
    setDownloadingItems(prev => {
        const next = new Set(prev);
        next.add(item.id);
        return next;
    });

    try {
        // 1. Download Content (Resolve Network Issues/Seek Latency)
        const response = await fetch(item.url);
        if (!response.ok) throw new Error('Download failed');
        const blob = await response.blob();
        
        // 2. Prepare Asset Data
        const assetId = `stock-${generateId()}`;
        const mimeType = blob.type || (type === 'video' ? 'video/mp4' : type === 'audio' ? 'audio/mpeg' : 'image/jpeg');
        const file = new File([blob], item.name, { type: mimeType });
        
        // 3. Save to IndexedDB (Persistence for fast seek)
        await saveAssetToDB(assetId, file);
        
        // 4. Create Local URL
        const localUrl = URL.createObjectURL(file);

        // 5. Create Asset
        const asset: MediaAsset = {
            id: assetId,
            url: localUrl,
            file: file,
            type: type,
            name: item.name.split(',')[0], 
            duration: item.duration || (type === 'image' ? 5 : 0)
        };

        // 6. Add to Project
        onAddAssets([asset]);

        // Visual Feedback
        setAddedItems(prev => {
            const next = new Set(prev);
            next.add(item.id);
            return next;
        });
        setTimeout(() => {
            setAddedItems(prev => {
               const next = new Set(prev);
               next.delete(item.id);
               return next;
            });
        }, 2000);

    } catch (error) {
        console.error("Failed to download stock asset, falling back to remote", error);
        // Fallback: If download fails (CORS etc), add remote URL directly
        const asset: MediaAsset = {
            id: `stock-remote-${generateId()}`,
            url: item.url,
            type: type,
            name: item.name.split(',')[0],
            duration: item.duration || (type === 'image' ? 5 : 0)
        };
        onAddAssets([asset]);
    } finally {
        setDownloadingItems(prev => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
        });
    }
  };

  // Filter User Assets (Local)
  const filteredAssets = assets.filter(a => {
    let typeMatch = true;
    switch (activeTab) {
        case 'audio': typeMatch = a.type === 'audio'; break;
        case 'videos': typeMatch = a.type === 'video'; break;
        case 'images': typeMatch = a.type === 'image'; break;
        case 'media': typeMatch = true; break;
        default: typeMatch = true;
    }
    const searchMatch = searchQuery 
      ? a.name.toLowerCase().includes(searchQuery.toLowerCase()) 
      : true;
    return typeMatch && searchMatch;
  });

  let acceptedTypes = '*/*';
  switch (activeTab) {
      case 'audio': acceptedTypes = 'audio/*'; break;
      case 'videos': acceptedTypes = 'video/*'; break;
      case 'images': acceptedTypes = 'image/*'; break;
      default: acceptedTypes = 'video/*,image/*,audio/*'; break;
  }

  const isAudioTab = activeTab === 'audio';
  const showStock = activeTab === 'audio' || activeTab === 'videos' || activeTab === 'images';

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border/40 shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg capitalize tracking-tight">{activeTab}</h2>
          <Button size="sm" className="gap-2 rounded-full px-4 font-medium shadow-md shadow-primary/20" onClick={() => fileInputRef.current?.click()}>
            <UploadCloud size={16} />
            Import
          </Button>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <input 
              type="text" 
              placeholder={`Search ${activeTab}...`} 
              className="w-full h-9 pl-9 pr-3 rounded-md bg-muted/20 border border-border focus:border-primary focus:outline-none text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept={acceptedTypes} 
          multiple
          onChange={(e) => { if (e.target.files) { onFilesSelected(e.target.files); e.target.value = ''; } }} 
        />

        {/* --- USER UPLOADS SECTION (Now at top) --- */}
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
             {isAudioTab ? 'Your Uploads' : 'Library'}
        </h3>

        {filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2 border-2 border-dashed border-border/50 rounded-xl bg-muted/10">
                <div className="p-3 bg-muted/30 rounded-full"><FolderOpen size={24} className="opacity-50" /></div>
                <div className="text-center">
                    <p className="font-medium text-xs mb-1">No uploads found</p>
                </div>
            </div>
        ) : (
            <div className={cn("grid gap-4", isAudioTab ? "grid-cols-1" : "grid-cols-2")}>
                {!searchQuery && (
                  <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "rounded-xl border-2 border-dashed border-border/60 bg-muted/10 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/30 hover:border-primary/50 transition-all duration-200 group",
                        isAudioTab ? "h-16 flex-row gap-4" : "aspect-video"
                      )}
                  >
                      <div className="p-1.5 rounded-full bg-background border border-border/50 group-hover:scale-110 transition-transform">
                          <UploadCloud size={16} className="text-muted-foreground group-hover:text-primary" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">Upload</span>
                  </div>
                )}

                {filteredAssets.map(asset => (
                    <div 
                        key={asset.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, asset.id, asset.type)}
                        className={cn(
                          "group relative bg-card border border-border/40 overflow-hidden cursor-grab active:cursor-grabbing hover:border-primary/50 hover:shadow-lg hover:shadow-black/20 transition-all duration-300",
                          isAudioTab ? "flex items-center p-2 rounded-lg gap-3" : "aspect-video rounded-xl hover:scale-[1.02]"
                        )}
                    >
                        {isAudioTab ? (
                            <>
                                <div className="h-8 w-8 rounded bg-muted/30 flex items-center justify-center text-muted-foreground">
                                    <Music size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{asset.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{Math.round(asset.duration)}s</p>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-primary/10 rounded p-1">
                                      <Music size={14} className="text-primary" />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                {asset.type === 'video' ? (
                                    <video src={asset.url} className="w-full h-full object-cover pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity" />
                                ) : asset.type === 'image' || asset.type === 'element' ? (
                                    <img src={asset.url} alt={asset.name} className="w-full h-full object-cover pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-muted/20 to-muted/50 text-muted-foreground">
                                        <Music size={32} />
                                    </div>
                                )}
                                
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                                    <span className="text-[10px] text-white font-medium truncate">{asset.name}</span>
                                </div>

                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 transform translate-y-1 group-hover:translate-y-0">
                                    <div className="bg-black/60 backdrop-blur-sm rounded-md p-1.5 text-white shadow-sm">
                                        {asset.type === 'video' ? <FileVideo size={12} /> : 
                                        asset.type === 'audio' ? <Music size={12} /> : <ImageIcon size={12} />}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        )}

        {/* --- STOCK SECTION (Now at bottom) --- */}
        {showStock && (
            <div className="mt-8">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Stock {activeTab === 'videos' ? 'Footage' : activeTab === 'images' ? 'Photos' : 'Music'}
                    </h3>
                    <span className="text-[10px] text-muted-foreground opacity-70">
                        {activeTab === 'audio' ? 'Royalty Free' : 'Powered by Pixabay'}
                    </span>
                </div>
                
                {isLoading ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                        <Loader2 className="animate-spin mr-2" size={16} /> Loading...
                    </div>
                ) : error ? (
                    <div className="text-xs text-destructive py-4 text-center border border-destructive/20 rounded-lg bg-destructive/5">
                        {error === 'API Key missing' ? 'Please configure PIXABAY_API_KEY in code.' : 'Failed to load stock.'}
                    </div>
                ) : stockItems.length === 0 ? (
                     <div className="text-xs text-muted-foreground py-4 text-center">No stock items found.</div>
                ) : (
                    // GRID or LIST based on type
                    <div className={cn("grid gap-3", isAudioTab ? "grid-cols-1" : "grid-cols-2")}>
                        {stockItems.map(item => (
                            <div 
                                key={item.id} 
                                className={cn(
                                    "group relative bg-card border border-border/40 overflow-hidden hover:border-primary/50 transition-all hover:bg-accent/50",
                                    isAudioTab ? "flex items-center justify-between p-2 rounded-lg" : "aspect-video rounded-xl shadow-sm hover:shadow-md"
                                )}
                                onMouseEnter={() => !isAudioTab && activeTab === 'videos' && setHoverVideoId(item.id)}
                                onMouseLeave={() => !isAudioTab && activeTab === 'videos' && setHoverVideoId(null)}
                            >
                                {isAudioTab ? (
                                    // AUDIO ROW
                                    <>
                                        <div className="flex items-center gap-3 min-w-0">
                                            <button 
                                                onClick={() => handleToggleAudioPreview(item.url, item.id)}
                                                className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors shrink-0"
                                            >
                                                {previewAudioId === item.id ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                                            </button>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-medium truncate">{item.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{item.category}</span>
                                                    <span className="text-[10px] text-muted-foreground">{item.artist}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className={cn(
                                                "h-8 w-8 transition-colors",
                                                addedItems.has(item.id) 
                                                    ? "text-green-500 hover:text-green-600 bg-green-500/10 hover:bg-green-500/20" 
                                                    : "text-muted-foreground hover:text-primary"
                                            )}
                                            onClick={() => handleAddStockAsset(item, 'audio')} 
                                            title={addedItems.has(item.id) ? "Added" : "Add to project"}
                                            disabled={addedItems.has(item.id) || downloadingItems.has(item.id)}
                                        >
                                            {downloadingItems.has(item.id) ? <Loader2 size={16} className="animate-spin" /> : addedItems.has(item.id) ? <Check size={16} /> : <Plus size={16} />}
                                        </Button>
                                    </>
                                ) : (
                                    // VIDEO / IMAGE CARD
                                    <>
                                        {item.type === 'video' ? (
                                            hoverVideoId === item.id ? (
                                                <video 
                                                    src={item.url} 
                                                    autoPlay 
                                                    muted 
                                                    loop 
                                                    className="w-full h-full object-cover animate-in fade-in" 
                                                />
                                            ) : (
                                                <img 
                                                    src={item.thumb || item.url} 
                                                    alt={item.name} 
                                                    className="w-full h-full object-cover" 
                                                />
                                            )
                                        ) : (
                                            <img 
                                                src={item.thumb || item.url} 
                                                alt={item.name} 
                                                className="w-full h-full object-cover" 
                                            />
                                        )}

                                        {/* Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-white font-medium truncate drop-shadow-sm pr-2">{item.name}</span>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleAddStockAsset(item, item.type); }}
                                                    className={cn(
                                                        "h-6 w-6 rounded-full flex items-center justify-center hover:scale-110 transition-all shadow-lg shrink-0",
                                                        addedItems.has(item.id) ? "bg-green-500 text-white" : "bg-primary text-white",
                                                        downloadingItems.has(item.id) && "cursor-not-allowed opacity-80"
                                                    )}
                                                    title={addedItems.has(item.id) ? "Added" : "Add"}
                                                    disabled={addedItems.has(item.id) || downloadingItems.has(item.id)}
                                                >
                                                    {downloadingItems.has(item.id) ? <Loader2 size={12} className="animate-spin" /> : addedItems.has(item.id) ? <Check size={14} /> : <Plus size={14} />}
                                                </button>
                                            </div>
                                            {item.type === 'video' && <span className="text-[9px] text-white/70 absolute top-2 right-2 bg-black/50 px-1 rounded">{item.duration}s</span>}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}
      </ScrollArea>
    </div>
  );
};