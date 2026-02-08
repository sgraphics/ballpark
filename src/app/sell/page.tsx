'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Bot, Package, DollarSign, Clock, RefreshCw } from 'lucide-react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import type { SellAgent, Listing } from '@/types/database';

interface SellAgentWithListings extends SellAgent {
  listings?: Listing[];
}

const DEMO_SELL_AGENTS: SellAgentWithListings[] = [
  {
    id: 'sa-1',
    user_id: 'user-1',
    listing_id: 'l-1',
    name: 'Vintage Items Agent',
    min_price: 360,
    urgency: 'medium',
    preferences: { auto_counter: true },
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    listings: [
      {
        id: 'l-1',
        seller_user_id: 'user-1',
        title: 'Vintage Leather Jacket',
        description: 'Classic 80s style',
        category: 'clothing',
        structured: { size: 'M' },
        ask_price: 450,
        condition_notes: [],
        haggling_ammo: [],
        image_urls: ['https://images.pexels.com/photos/1124468/pexels-photo-1124468.jpeg?auto=compress&cs=tinysrgb&w=400'],
        hero_image_url: null,
        hero_thumbnail_url: null,
        status: 'active',
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
    ],
  },
  {
    id: 'sa-2',
    user_id: 'user-1',
    listing_id: 'l-2',
    name: 'Tech Gear Agent',
    min_price: 1530,
    urgency: 'low',
    preferences: { auto_counter: true },
    created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
    listings: [
      {
        id: 'l-2',
        seller_user_id: 'user-1',
        title: 'MacBook Pro 16"',
        description: 'M2 Pro chip',
        category: 'electronics',
        structured: { brand: 'Apple' },
        ask_price: 1800,
        condition_notes: [],
        haggling_ammo: [],
        image_urls: ['https://images.pexels.com/photos/303383/pexels-photo-303383.jpeg?auto=compress&cs=tinysrgb&w=400'],
        hero_image_url: null,
        hero_thumbnail_url: null,
        status: 'active',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
  },
];

export default function SellAgentsPage() {
  const [agents, setAgents] = useState<SellAgentWithListings[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
  }, []);

  async function fetchAgents() {
    setLoading(true);
    try {
      const res = await fetch('/api/sell-agents');
      const data = await res.json();
      if (data.agents?.length > 0) {
        setAgents(data.agents);
      } else {
        setAgents(DEMO_SELL_AGENTS);
      }
    } catch {
      setAgents(DEMO_SELL_AGENTS);
    } finally {
      setLoading(false);
    }
  }

  const totalListings = agents.reduce((sum, a) => sum + (a.listings?.length || 0), 0);
  const totalValue = agents.reduce(
    (sum, a) => sum + (a.listings?.reduce((s, l) => s + l.ask_price, 0) || 0),
    0
  );

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl font-light tracking-tight">My Sell Agents</h1>
            <p className="text-sm text-bp-muted mt-0.5">Manage your listings and automated selling</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={fetchAgents}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link href="/sell/new">
              <Button className="bg-bp-seller hover:bg-bp-seller/90">
                <Plus className="w-4 h-4 mr-2" />
                New Listing
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-bp-seller-soft flex items-center justify-center">
                <Bot className="w-5 h-5 text-bp-seller" />
              </div>
              <div>
                <p className="text-2xl font-heading font-medium">{agents.length}</p>
                <p className="text-xs text-bp-muted">Active Agents</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-bp-black" />
              </div>
              <div>
                <p className="text-2xl font-heading font-medium">{totalListings}</p>
                <p className="text-xs text-bp-muted">Total Listings</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-heading font-medium">{formatPrice(totalValue)}</p>
                <p className="text-xs text-bp-muted">Total Value</p>
              </div>
            </div>
          </Card>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bp-seller" />
          </div>
        ) : agents.length === 0 ? (
          <Card className="text-center py-16">
            <Bot className="w-12 h-12 text-bp-muted-light mx-auto mb-4" />
            <h3 className="font-heading text-lg font-medium mb-2">No Sell Agents Yet</h3>
            <p className="text-sm text-bp-muted mb-4">Create your first listing to start selling</p>
            <Link href="/sell/new">
              <Button className="bg-bp-seller hover:bg-bp-seller/90">
                <Plus className="w-4 h-4 mr-2" />
                Create Listing
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {agents.map((agent) => (
              <Card key={agent.id} className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-bp-seller-soft flex items-center justify-center">
                      <Bot className="w-5 h-5 text-bp-seller" />
                    </div>
                    <div>
                      <h3 className="font-heading text-sm font-medium">{agent.name}</h3>
                      <p className="text-xs text-bp-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Created {formatRelativeTime(agent.created_at)}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-bp-seller-soft text-bp-seller border-0">
                    {agent.listings?.length || 0} listings
                  </Badge>
                </div>

                {agent.listings && agent.listings.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {agent.listings.map((listing) => (
                      <Link key={listing.id} href={`/listings/${listing.id}`}>
                        <div className="group border border-bp-border rounded-lg overflow-hidden hover:border-bp-seller transition-colors">
                          <div className="aspect-[4/3] relative overflow-hidden bg-gray-100">
                            {listing.image_urls?.[0] && (
                              <img
                                src={listing.image_urls[0]}
                                alt={listing.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            )}
                          </div>
                          <div className="p-2">
                            <p className="text-xs font-medium truncate">{listing.title}</p>
                            <p className="text-sm font-heading text-bp-seller">
                              {formatPrice(listing.ask_price)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
