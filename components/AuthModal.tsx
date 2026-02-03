'use client';

import { useState, useEffect, FC } from 'react';
import { createPortal } from 'react-dom';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { X, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { registerUser } from '@/app/actions/auth';

// State for portal mount
const usePortalMount = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
};

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'signup';
}

export const AuthModal: FC<AuthModalProps> = ({ isOpen, onClose, initialTab = 'signup' }) => {
  const router = useRouter();
  const mounted = usePortalMount();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Sync activeTab with initialTab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setError(null);
      setFieldErrors({});
    }
  }, [isOpen, initialTab]);

  // Reset state when tab changes
  const handleTabChange = (tab: 'login' | 'signup') => {
    setActiveTab(tab);
    setError(null);
    setFieldErrors({});
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password.');
        setIsLoading(false);
      } else if (result?.ok) {
        onClose();
        router.push('/projects');
        router.refresh();
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);

    try {
      const result = await registerUser({}, formData);
      
      if (result.errors) {
        setFieldErrors(result.errors);
        setIsLoading(false);
        return;
      }
      
      if (result.message) {
        setError(result.message);
        setIsLoading(false);
        return;
      }

      if (!result.success) {
        setError('Something went wrong. Please try again.');
        setIsLoading(false);
        return;
      }

      // If registration successful, auto-login
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      
      const loginResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (loginResult?.ok) {
        onClose();
        router.push('/projects');
        router.refresh();
      } else {
        // Registration succeeded but login failed - redirect to projects anyway
        onClose();
        router.push('/projects');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-card border border-border rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="p-6 pb-0">
          <h2 className="text-2xl font-bold text-center">
            {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-sm text-muted-foreground text-center mt-1">
            {activeTab === 'login' 
              ? 'Sign in to continue to your projects' 
              : 'Start creating amazing videos today'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex mx-6 mt-6 p-1 bg-muted rounded-lg">
          <button
            onClick={() => handleTabChange('login')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'login' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => handleTabChange('signup')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'signup' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <div className="p-6">
          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="Email address"
                  className="w-full px-4 py-3 bg-muted/50 border border-border rounded-lg text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
              <div>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="Password"
                  className="w-full px-4 py-3 bg-muted/50 border border-border rounded-lg text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                />
              </div>

              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}

              <Button type="submit" className="w-full h-12" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Full Name"
                  className="w-full px-4 py-3 bg-muted/50 border border-border rounded-lg text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                />
                {fieldErrors.name && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.name[0]}</p>
                )}
              </div>
              <div>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="Email address"
                  className="w-full px-4 py-3 bg-muted/50 border border-border rounded-lg text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                />
                {fieldErrors.email && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.email[0]}</p>
                )}
              </div>
              <div>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="Password (min 8 chars)"
                  className="w-full px-4 py-3 bg-muted/50 border border-border rounded-lg text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                />
                {fieldErrors.password && (
                  <div className="text-xs text-red-500 mt-1">
                    {fieldErrors.password.map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}

              <Button type="submit" className="w-full h-12" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
