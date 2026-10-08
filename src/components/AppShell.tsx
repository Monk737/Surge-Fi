import React from 'react';
import { Toaster } from 'react-hot-toast';
import Providers from './Providers';
import { Header } from './Header';
import { ErrorBoundary } from './ErrorBoundary';
import { ConfigNotice } from './ConfigNotice';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 selection:bg-accent selection:text-black">
        <Header />

        <main className="container mx-auto px-4 py-8 max-w-7xl">
          <ConfigNotice />
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: 'border-2 border-black shadow-neo font-bold rounded-lg',
            style: {
              background: '#fff',
              color: '#000',
            },
            success: {
              iconTheme: {
                primary: '#00C853',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#FF2E2E',
                secondary: '#fff',
              },
            }
          }}
        />
      </div>
    </Providers>
  );
}
