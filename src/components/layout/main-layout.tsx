'use client';

import { ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { MobileBottomNav } from './mobile-bottom-nav';
import { FloatingActionButton } from './floating-action-button';

export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50/50 font-body">
      <Sidebar />
      <Header />
      <main className="ml-0 md:ml-60 pt-14 pb-16 md:pb-0 min-h-screen">
        <div className="p-4 md:p-6">{children}</div>
      </main>
      <MobileBottomNav />
      <FloatingActionButton />
    </div>
  );
}
