'use client';

import { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { store } from '../store/store';
import { ThemeProvider } from '../components/theme-provider';
import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={true} refetchWhenOffline={false}>
      <Provider store={store}>
        <ThemeProvider defaultTheme="dark" storageKey="video-editor-theme">
          {children}
        </ThemeProvider>
      </Provider>
    </SessionProvider>
  );
}
