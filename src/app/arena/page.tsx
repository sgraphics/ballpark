'use client';

import { useEffect, useState } from 'react';
import { Swords, Plus, ArrowRight, Clock, Check, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatRelativeTime, getStateLabel } from '@/lib/utils';
import type { Negotiation } from '@/types/database';

interface EnrichedNegotiation extends Negotiation {
  listing_title?: string;
  listing_price?: number;
  listing_images?: string[];
  listing_hero_thumbnail?: string | null;
  buy_agent_name?: string;
}

const DEMO_NEGOTIATIONS: EnrichedNegotiation[] = [
  {
    id: 'neg-demo-1',
    buy_agent_id: 'demo-buy-1',
    listing_id: 'demo-1',
    state: 'negotiating',
    agreed_price: null,
    ball: 'seller',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
    listing_title: 'Vintage Leather Jacket',
    listing_price: 450,
    listing_images: ['https://images.pexels.com/photos/1124468/pexels-photo-1124468.jpeg?auto=compress&cs=tinysrgb&w=400'],
    buy_agent_name: 'Vintage Jacket Finder',
  },
  {
    id: 'neg-demo-2',
    buy_agent_id: 'demo-buy-2',
    listing_id: 'demo-2',
    state: 'agreed',
    agreed_price: 1650,
    ball: 'buyer',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 600000).toISOString(),
    listing_title: 'MacBook Pro 16" M2 Pro',
    listing_price: 1800,
    listing_images: ['https://images.pexels.com/photos/303383/pexels-photo-303383.jpeg?auto=compress&cs=tinysrgb&w=400'],
    buy_agent_name: 'Laptop Deal Hunter',
  },
  {
    id: 'neg-demo-3',
    buy_agent_id: 'demo-buy-3',
    listing_id: 'demo-3',
    state: 'negotiating',
    agreed_price: null,
    ball: 'human',
    created_at: new Date(Date.now() - 14400000).toISOString(),
    updated_at: new Date(Date.now() - 300000).toISOString(),
    listing_title: 'Mid-Century Modern Desk',
    listing_price: 650,
    listing_images: ['https://images.pexels.com/photos/2451264/pexels-photo-2451264.jpeg?auto=compress&cs=tinysrgb&w=400'],
    buy_agent_name: 'Office Furniture Scout',
  },
];

function NegotiationCard({ negotiation }: { negotiation: EnrichedNegotiation }) {
  const imageUrl = negotiation.listing_hero_thumbnail
    || negotiation.listing_images?.[0]
    || 'https://images.pexels.com/photos/4439901/pexels-photo-4439901.jpeg?auto=compress&cs=tinysrgb&w=400';

  const stateConfigs: Record<string, { icon: typeof Swords; color: string; bg: string }> = {
    idle: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-50' },
    negotiating: { icon: Swords, color: 'text-blue-500', bg: 'bg-blue-50' },
    agreed: { icon: Check, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    escrow_created: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50' },
    funded: { icon: Check, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    confirmed: { icon: Check, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    flagged: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
    resolved: { icon: Check, color: 'text-gray-500', bg: 'bg-gray-50' },
  };
  const stateConfig = stateConfigs[negotiation.state] || { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-50' };

  const StateIcon = stateConfig.icon;

  return (
    <Link href={`/arena/${negotiation.id}`}>
      <Card interactive className="overflow-hidden">
        <div className="flex gap-4">
          <div className="w-24 h-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
            <img
              src={imageUrl}
              alt={negotiation.listing_title || 'Listing'}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-heading text-sm truncate">
                  {negotiation.listing_title || 'Unknown Listing'}
                </h3>
                <p className="text-xs text-bp-muted mt-0.5">
                  {negotiation.buy_agent_name || 'Buy Agent'}
                </p>
              </div>
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${stateConfig.bg}`}>
                <StateIcon className={`w-3 h-3 ${stateConfig.color}`} />
                <span className={`text-xs font-medium ${stateConfig.color}`}>
                  {getStateLabel(negotiation.state)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-3">
              {negotiation.listing_price && (
                <div>
                  <p className="text-[10px] text-bp-muted uppercase">Ask</p>
                  <p className="text-sm font-medium">{formatPrice(negotiation.listing_price)}</p>
                </div>
              )}
              {negotiation.agreed_price && (
                <div>
                  <p className="text-[10px] text-bp-muted uppercase">Agreed</p>
                  <p className="text-sm font-medium text-emerald-600">
                    {formatPrice(negotiation.agreed_price)}
                  </p>
                </div>
              )}
              <div className="ml-auto">
                <p className="text-[10px] text-bp-muted uppercase">Ball</p>
                <p className={`text-xs font-medium ${
                  negotiation.ball === 'buyer' ? 'text-bp-buyer' :
                  negotiation.ball === 'seller' ? 'text-bp-seller' :
                  'text-bp-warning'
                }`}>
                  {negotiation.ball === 'human' ? 'Needs Input' : `${negotiation.ball}'s turn`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-bp-border">
              <span className="text-[10px] text-bp-muted-light">
                Updated {formatRelativeTime(negotiation.updated_at)}
              </span>
              <ArrowRight className="w-4 h-4 text-bp-muted-light" />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function ArenaPage() {
  const [negotiations, setNegotiations] = useState<EnrichedNegotiation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNegotiations() {
      try {
        const res = await fetch('/api/negotiations?enrich=true');
        const data = await res.json();

        if (data.negotiations?.length > 0) {
          setNegotiations(data.negotiations);
        } else {
          setNegotiations(DEMO_NEGOTIATIONS);
        }
      } catch {
        setNegotiations(DEMO_NEGOTIATIONS);
      } finally {
        setLoading(false);
      }
    }

    fetchNegotiations();
  }, []);

  const activeNegotiations = negotiations.filter(n =>
    ['negotiating', 'agreed', 'escrow_created', 'funded'].includes(n.state)
  );
  const needsAttention = negotiations.filter(n => n.ball === 'human');
  const completedNegotiations = negotiations.filter(n =>
    ['confirmed', 'resolved'].includes(n.state)
  );

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl tracking-tight">Duel Arena</h1>
            <p className="text-sm text-bp-muted mt-0.5">
              {activeNegotiations.length} active negotiation{activeNegotiations.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link href="/buy">
            <Button variant="buyer" size="sm">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Start Negotiation
            </Button>
          </Link>
        </div>

        {needsAttention.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-bp-warning" />
              <h2 className="font-heading text-sm">Needs Your Input</h2>
              <Badge className="bg-bp-warning-soft text-bp-warning">{needsAttention.length}</Badge>
            </div>
            <div className="space-y-3">
              {needsAttention.map((neg) => (
                <NegotiationCard key={neg.id} negotiation={neg} />
              ))}
            </div>
          </div>
        )}

        {activeNegotiations.filter(n => n.ball !== 'human').length > 0 && (
          <div className="mb-6">
            <h2 className="font-heading text-sm mb-3">Active Negotiations</h2>
            <div className="space-y-3">
              {activeNegotiations
                .filter(n => n.ball !== 'human')
                .map((neg) => (
                  <NegotiationCard key={neg.id} negotiation={neg} />
                ))}
            </div>
          </div>
        )}

        {activeNegotiations.length === 0 && !loading && (
          <Card className="text-center py-16">
            <Swords className="w-12 h-12 text-bp-muted-light mx-auto mb-4" />
            <h3 className="font-heading text-lg mb-2">No Active Negotiations</h3>
            <p className="text-sm text-bp-muted mb-4">
              Start a negotiation from your buy agents&apos; matches
            </p>
            <Link href="/buy">
              <Button variant="buyer">
                <Plus className="w-4 h-4 mr-2" /> Browse Buy Agents
              </Button>
            </Link>
          </Card>
        )}

        {completedNegotiations.length > 0 && (
          <div className="mt-8">
            <h2 className="font-heading text-sm text-bp-muted mb-3">
              Completed ({completedNegotiations.length})
            </h2>
            <div className="space-y-2 opacity-60">
              {completedNegotiations.map((neg) => (
                <NegotiationCard key={neg.id} negotiation={neg} />
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
