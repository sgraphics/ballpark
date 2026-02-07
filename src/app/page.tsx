'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { RefreshCw, Zap, TrendingUp, Bot, ShoppingBag, Target } from 'lucide-react';
import { MainLayout } from '@/components/layout/main-layout';
import { EventCard } from '@/components/feed/event-card';
import { CategoryFilter } from '@/components/feed/category-filter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAppStore } from '@/store/app-store';
import type { AppEvent } from '@/types/database';

const DEMO_EVENTS: AppEvent[] = [
  {
    id: '1', user_id: null, type: 'listing_created',
    payload: { title: 'Vintage Leather Jacket', price: 450, listing_id: 'demo-1' },
    created_at: new Date(Date.now() - 300_000).toISOString(),
  },
  {
    id: '2', user_id: null, type: 'match_found',
    payload: { title: 'Match: Designer Bags agent', message: 'Louis Vuitton Neverfull MM matches your search criteria', listing_id: 'demo-2' },
    created_at: new Date(Date.now() - 900_000).toISOString(),
  },
  {
    id: '3', user_id: null, type: 'buyer_proposes',
    payload: { title: 'Negotiation: Vintage Watch', message: 'Buyer agent opened at $380 — citing minor dial patina', price: 380, negotiation_id: 'demo-1' },
    created_at: new Date(Date.now() - 1_800_000).toISOString(),
  },
  {
    id: '4', user_id: null, type: 'seller_counters',
    payload: { title: 'Counter: Vintage Watch', message: 'Seller agent countered at $420 — original box included', price: 420, negotiation_id: 'demo-1' },
    created_at: new Date(Date.now() - 2_700_000).toISOString(),
  },
  {
    id: '5', user_id: null, type: 'human_input_required',
    payload: { title: 'Your Input Needed', message: 'Buyer is asking about return policy — your agent needs guidance', negotiation_id: 'demo-2' },
    created_at: new Date(Date.now() - 3_600_000).toISOString(),
  },
  {
    id: '6', user_id: null, type: 'deal_agreed',
    payload: { title: 'Deal Reached', message: 'Agreed at $395 for Vintage Omega Seamaster', price: 395, negotiation_id: 'demo-3' },
    created_at: new Date(Date.now() - 5_400_000).toISOString(),
  },
  {
    id: '7', user_id: null, type: 'escrow_funded',
    payload: { title: 'Escrow Funded', message: '$395 deposited to smart contract escrow', price: 395, negotiation_id: 'demo-3' },
    created_at: new Date(Date.now() - 7_200_000).toISOString(),
  },
  {
    id: '8', user_id: null, type: 'delivery_confirmed',
    payload: { title: 'Delivery Confirmed', message: 'Buyer confirmed receipt — funds released to seller', negotiation_id: 'demo-4' },
    created_at: new Date(Date.now() - 10_800_000).toISOString(),
  },
];

export default function HomePage() {
  const { events, setEvents, isLoading, setIsLoading, searchQuery } = useAppStore();
  const [finderRunning, setFinderRunning] = useState(false);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/events?limit=20');
      const data = await res.json();
      if (data.events?.length > 0) {
        setEvents(data.events);
      } else {
        setEvents(DEMO_EVENTS);
      }
    } catch {
      setEvents(DEMO_EVENTS);
    } finally {
      setIsLoading(false);
    }
  }, [setEvents, setIsLoading]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filtered = useMemo(() => {
    if (!searchQuery) return events;
    const q = searchQuery.toLowerCase();
    return events.filter((e) => {
      const p = e.payload;
      return (
        (typeof p.title === 'string' && p.title.toLowerCase().includes(q)) ||
        (typeof p.message === 'string' && p.message.toLowerCase().includes(q))
      );
    });
  }, [events, searchQuery]);

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
            <Button variant="secondary" size="sm" onClick={fetchEvents} loading={isLoading}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
            </Button>
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
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bp-black" />
              </div>
            ) : filtered.length === 0 ? (
              <Card className="text-center py-16">
                <p className="text-bp-muted">No activity yet</p>
                <p className="text-xs text-bp-muted-light mt-1">Create a listing or buy agent to get started</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {filtered.map((event, i) => (
                  <div key={event.id} style={{ animationDelay: `${i * 50}ms` }}>
                    <EventCard event={event} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
