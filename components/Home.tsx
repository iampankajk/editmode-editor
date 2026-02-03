'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from './ui/button';
import { Wand2, Video, Music, Type, ArrowRight, Play, CheckCircle2, Cloud, Zap } from 'lucide-react';
import { AuthModal } from './AuthModal';

export default function Home() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('signup');

  const openAuthModal = (tab: 'login' | 'signup') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  return (
    <>
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        initialTab={authModalTab} 
      />
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans overflow-y-auto">
       {/* Nav */}
       <nav className="border-b border-border/40 backdrop-blur-md sticky top-0 z-50 bg-background/80">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
                      <Play size={16} fill="currentColor" />
                  </div>
                  EditMode
              </div>
              <div className="flex items-center gap-4">
                  <Button 
                    variant="ghost" 
                    className="hidden sm:flex text-muted-foreground hover:text-foreground"
                    onClick={() => openAuthModal('login')}
                  >
                    Sign In
                  </Button>
                  <Button 
                    className="rounded-full px-6"
                    onClick={() => openAuthModal('signup')}
                  >
                    Get Started
                  </Button>
              </div>
          </div>
       </nav>

       {/* Hero */}
       <main className="flex-1">
          <section className="py-24 md:py-32 px-6 text-center relative overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl -z-10" />
              
              <div className="relative z-10 max-w-5xl mx-auto space-y-8">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/50 border border-border/50 text-xs font-medium text-accent-foreground mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                      </span>
                      New: AI Text-to-Speech & Image Generation
                  </div>

                  <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                      Video Editing <br className="hidden md:block"/>
                      <span className="bg-gradient-to-r from-primary via-purple-500 to-blue-500 bg-clip-text text-transparent">Made Simple</span>
                  </h1>
                  
                  <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
                      Create professional videos right in your browser. Powerful timeline editing, 
                      AI tools, and cloud save support—no installation required.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
                      <Button 
                        size="lg" 
                        className="h-14 px-8 text-lg rounded-full gap-2 shadow-[0_0_30px_rgba(var(--primary),0.3)] hover:shadow-[0_0_50px_rgba(var(--primary),0.5)] transition-all"
                        onClick={() => openAuthModal('signup')}
                      >
                          Start Creating <ArrowRight size={20} />
                      </Button>
                      <Link href="/demo">
                        <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full gap-2">
                            View Demo
                        </Button>
                      </Link>
                  </div>
              </div>
          </section>

          {/* Preview Image / Mockup */}
          <section className="px-6 pb-20">
              <div className="max-w-6xl mx-auto rounded-xl border border-border/50 shadow-2xl overflow-hidden bg-card/50 backdrop-blur-sm animate-in fade-in zoom-in duration-1000 delay-300">
                   <div className="w-full relative">
                        <img 
                          src="/editor-preview.png" 
                          alt="EditMode Editor Interface Preview" 
                          className="w-full h-auto object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/20 pointer-events-none" />
                   </div>
              </div>
          </section>

          {/* Features Grid */}
          <section className="py-24 px-6 bg-muted/20 border-y border-border/40">
              <div className="max-w-7xl mx-auto">
                  <div className="text-center mb-16 space-y-4">
                      <h2 className="text-3xl md:text-4xl font-bold">Everything you need</h2>
                      <p className="text-muted-foreground max-w-2xl mx-auto">From basic cutting to advanced AI generation, we have the tools to bring your vision to life.</p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-8">
                      {[
                          { icon: <Wand2 className="text-purple-500" size={32} />, title: "AI Generation", desc: "Generate realistic images and voiceovers instantly using Gemini AI models." },
                          { icon: <Video className="text-blue-500" size={32} />, title: "Timeline Editing", desc: "Multi-track timeline with precision trimming, splitting, and drag-and-drop simplicity." },
                          { icon: <Type className="text-orange-500" size={32} />, title: "Rich Typography", desc: "Add beautiful text overlays with customizable fonts, colors, and animations." },
                          { icon: <Cloud className="text-cyan-500" size={32} />, title: "Cloud Save", desc: "Sync your projects to the cloud and pick up where you left off on any device." },
                          { icon: <Zap className="text-yellow-500" size={32} />, title: "Instant Export", desc: "Render your videos client-side with high performance and no watermarks." },
                          { icon: <Music className="text-pink-500" size={32} />, title: "Audio Mixing", desc: "Layer background music, sound effects, and voiceovers with volume control." }
                      ].map((f, i) => (
                          <div key={i} className="p-8 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300 group">
                              <div className="w-14 h-14 rounded-2xl bg-background border border-border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                                  {f.icon}
                              </div>
                              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                              <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
                          </div>
                      ))}
                  </div>
              </div>
          </section>

          {/* CTA */}
          <section className="py-24 px-6">
              <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-br from-primary/20 via-primary/5 to-background border border-primary/20 p-12 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-3xl rounded-full -mr-32 -mt-32 pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-3xl rounded-full -ml-32 -mb-32 pointer-events-none" />
                  
                  <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to create?</h2>
                  <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                      Join thousands of creators making amazing videos with EditMode. Free to use, no credit card required.
                  </p>
                  <Button 
                    size="lg" 
                    className="h-14 px-10 text-lg rounded-full shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all"
                    onClick={() => openAuthModal('signup')}
                  >
                      Launch Editor
                  </Button>
                  <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> No Watermark</div>
                      <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> Unlimited Exports</div>
                      <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> Secure & Private</div>
                  </div>
              </div>
          </section>
       </main>
       
       <footer className="py-8 px-6 text-center text-muted-foreground text-sm border-t border-border/40 bg-muted/5">
           <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 font-bold opacity-70">
                    <div className="w-6 h-6 bg-foreground rounded flex items-center justify-center text-background">
                        <Play size={10} fill="currentColor" />
                    </div>
                    EditMode
                </div>
                <div className="flex items-center gap-2">
                    <span>© {new Date().getFullYear()} EditMode.</span>
                    <span className="opacity-50">•</span>
                    <span>Built by</span>
                    <a 
                      href="https://www.linkedin.com/in/iampankajk/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium"
                    >
                      Pankaj Kumar
                    </a>
                </div>
           </div>
       </footer>
     </div>
    </>
  )
}