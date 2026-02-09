'use client';

import { useState } from 'react';
import { Zap } from 'lucide-react';
import { MainLayout } from '@/components/layout/main-layout';
import { EventFeed } from '@/components/feed/event-feed';
import { HorizontalCategoryFilter } from '@/components/feed/horizontal-category-filter';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const [finderRunning, setFinderRunning] = useState(false);

  const handleRunFinder = async () => {
    setFinderRunning(true);
    try {
      await fetch('/api/finder/run', { method: 'POST' });
    } catch { /* will work once DB is connected */ }
    setTimeout(() => setFinderRunning(false), 2000);
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
          <div>
            <h1 className="font-heading text-2xl tracking-tight">Activity Feed</h1>
            <p className="text-sm text-bp-muted mt-0.5">Real-time updates from your agents</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" loading={finderRunning} onClick={handleRunFinder}>
              <Zap className="w-3.5 h-3.5 mr-1.5" /> <span className="hidden sm:inline">Run Finder</span><span className="sm:hidden">Finder</span>
            </Button>
          </div>
        </div>

        {/* Horizontal category filter */}
        <div className="mb-6">
          <HorizontalCategoryFilter />
        </div>

        {/* Main content */}
        <EventFeed
          title="Live Activity"
          showPromptFilter={true}
          emptyMessage="No activity yet. Create a listing or buy agent to get started."
        />
      </div>
    </MainLayout>
  );
}
