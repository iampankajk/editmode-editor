'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft, Play, Search, HelpCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-3xl -z-10" />
      
      {/* Animated Grid Background */}
      <div 
        className="absolute inset-0 -z-20 opacity-[0.03]" 
        style={{ 
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }} 
      />

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 font-bold text-xl mb-12 group">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
          <Play size={18} fill="currentColor" />
        </div>
        <span className="group-hover:text-primary transition-colors">EditMode</span>
      </Link>

      {/* 404 Display */}
      <div className="relative mb-8">
        <h1 className="text-[150px] md:text-[200px] font-black text-transparent bg-clip-text bg-gradient-to-br from-muted-foreground/20 to-muted-foreground/5 leading-none select-none">
          404
        </h1>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <Search size={40} className="text-primary" />
          </div>
        </div>
      </div>

      {/* Message */}
      <div className="text-center mb-10 space-y-3 max-w-md">
        <h2 className="text-2xl md:text-3xl font-bold">Page Not Found</h2>
        <p className="text-muted-foreground leading-relaxed">
          Oops! The page you're looking for doesn't exist or has been moved. 
          Let's get you back on track.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <Link href="/">
          <Button size="lg" className="h-12 px-8 rounded-full gap-2 shadow-lg shadow-primary/20">
            <Home size={18} />
            Back to Home
          </Button>
        </Link>
        <Button 
          size="lg" 
          variant="outline" 
          className="h-12 px-8 rounded-full gap-2"
          onClick={() => window.history.back()}
        >
          <ArrowLeft size={18} />
          Go Back
        </Button>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-xs text-muted-foreground/50 flex items-center gap-2">
        <span>© {new Date().getFullYear()} EditMode</span>
        <span>•</span>
        <span>Built by</span>
        <a 
          href="https://www.linkedin.com/in/iampankajk/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-primary hover:underline"
        >
          Pankaj Kumar
        </a>
      </div>
    </div>
  );
}
