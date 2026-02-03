'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Button } from './ui/button';
import { LogOut } from 'lucide-react';
import { AuthModal } from './AuthModal';

export function UserMenu() {
  const { data: session } = useSession();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  if (!session?.user) {
    return (
      <>
        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)} 
          initialTab="login" 
        />
        <Button 
          variant="ghost" 
          size="sm" 
          className="hidden sm:flex text-muted-foreground hover:text-foreground"
          onClick={() => setIsAuthModalOpen(true)}
        >
          Sign In
        </Button>
      </>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="text-xs text-muted-foreground hidden sm:block">
        {session.user.name}
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        className="gap-2 text-muted-foreground hover:text-foreground" 
        onClick={() => signOut()}
      >
        <LogOut size={16} />
        <span className="hidden sm:inline">Sign Out</span>
      </Button>
    </div>
  );
}
