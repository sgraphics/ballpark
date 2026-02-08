'use client';

import { useState } from 'react';
import { Zap, TrendingUp, Bot, ShoppingBag, Target } from 'lucide-react';
import { MainLayout } from '@/components/layout/main-layout';
import { EventFeed } from '@/components/feed/event-feed';
import { CategoryFilter } from '@/components/feed/category-filter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl font-light tracking-tight">Activity Feed</h1>
            <p className="text-sm text-bp-muted mt-0.5">Real-time updates from your agents</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" loading={finderRunning} onClick={handleRunFinder}>
              <Zap className="w-3.5 h-3.5 mr-1.5" /> Run Finder
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3 space-y-4">
            <CategoryFilter />
            <Card>
              <h3 className="font-heading text-sm font-medium mb-3">Quick Stats</h3>
              <div className="space-y-2.5">
                {[
                  { icon: ShoppingBag, label: 'Active Listings', value: '12', color: 'text-bp-seller' },
                  { icon: Bot, label: 'Buy Agents', value: '3', color: 'text-bp-buyer' },
                  { icon: TrendingUp, label: 'Negotiations', value: '5', color: 'text-bp-black' },
                  { icon: Target, label: 'Pending Matches', value: '8', color: 'text-bp-warning' },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-bp-muted">
                      <stat.icon className="w-3.5 h-3.5" />
                      {stat.label}
                    </div>
                    <span className={`font-medium ${stat.color}`}>{stat.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="col-span-9">
            <EventFeed
              title="Live Activity"
              showPromptFilter={true}
              emptyMessage="No activity yet. Create a listing or buy agent to get started."
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
