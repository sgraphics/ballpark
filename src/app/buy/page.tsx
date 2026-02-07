'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Bot, RefreshCw, Inbox } from 'lucide-react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BuyAgentCard } from '@/components/buy/buy-agent-card';
import { MatchCard } from '@/components/buy/match-card';
import { useAppStore } from '@/store/app-store';
import type { BuyAgent } from '@/types/database';

interface EnrichedMatch {
  id: string;
  buy_agent_id: string;
  listing_id: string;
  score: number;
  reason: string;
  status: string;
  created_at: string;
  listing_title?: string;
  listing_price?: number;
  listing_images?: string[];
  listing_category?: string;
  listing_condition_notes?: { issue: string; confidence: 'high' | 'medium' | 'low' }[];
}

const DEMO_AGENTS: BuyAgent[] = [
  {
    id: 'demo-buy-1',
    user_id: '',
    name: 'Vintage Jacket Finder',
    category: 'clothing',
    filters: { condition: 'Good', gender: 'Men' },
    prompt: 'Looking for vintage leather jackets in good condition. Prefer classic styles.',
    max_price: 500,
    urgency: 'medium',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'demo-buy-2',
    user_id: '',
    name: 'Laptop Deal Hunter',
    category: 'electronics',
    filters: { brand: 'Apple', condition: 'Like New' },
    prompt: 'Need a MacBook Pro for work. M-series chip preferred.',
    max_price: 2000,
    urgency: 'high',
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'demo-buy-3',
    user_id: '',
    name: 'Office Furniture Scout',
    category: 'furniture',
    filters: { material: 'Wood' },
    prompt: 'Looking for a solid desk and ergonomic chair for home office.',
    max_price: 1200,
    urgency: 'low',
    created_at: new Date(Date.now() - 345600000).toISOString(),
  },
];

const DEMO_MATCHES: Record<string, EnrichedMatch[]> = {
  'demo-buy-1': [
    {
      id: 'match-1',
      buy_agent_id: 'demo-buy-1',
      listing_id: 'demo-1',
      score: 82,
      reason: 'Within budget. 2/3 filters matched. 2 verified condition details',
      status: 'potential',
      created_at: new Date().toISOString(),
      listing_title: 'Vintage Leather Jacket',
      listing_price: 450,
      listing_images: ['https://images.pexels.com/photos/1124468/pexels-photo-1124468.jpeg?auto=compress&cs=tinysrgb&w=400'],
      listing_category: 'clothing',
      listing_condition_notes: [
        { issue: 'Light scuffing on left elbow', confidence: 'high' },
        { issue: 'Minor fading on collar', confidence: 'medium' },
      ],
    },
    {
      id: 'match-2',
      buy_agent_id: 'demo-buy-1',
      listing_id: 'demo-6',
      score: 58,
      reason: 'Within budget. 1/3 filters matched',
      status: 'potential',
      created_at: new Date().toISOString(),
      listing_title: 'Nike Air Jordan 1 Retro High OG',
      listing_price: 380,
      listing_images: ['https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=400'],
      listing_category: 'clothing',
      listing_condition_notes: [
        { issue: 'Deadstock, never worn', confidence: 'high' },
      ],
    },
  ],
  'demo-buy-2': [
    {
      id: 'match-3',
      buy_agent_id: 'demo-buy-2',
      listing_id: 'demo-2',
      score: 91,
      reason: 'Within budget. 2/2 filters matched. 2 verified condition details',
      status: 'potential',
      created_at: new Date().toISOString(),
      listing_title: 'MacBook Pro 16" M2 Pro',
      listing_price: 1800,
      listing_images: ['https://images.pexels.com/photos/303383/pexels-photo-303383.jpeg?auto=compress&cs=tinysrgb&w=400'],
      listing_category: 'electronics',
      listing_condition_notes: [
        { issue: 'Battery cycle count: 47', confidence: 'high' },
        { issue: 'Hairline mark near trackpad', confidence: 'low' },
      ],
    },
  ],
  'demo-buy-3': [
    {
      id: 'match-4',
      buy_agent_id: 'demo-buy-3',
      listing_id: 'demo-3',
      score: 76,
      reason: 'Within budget. 1/1 filters matched. 2 verified condition details',
      status: 'potential',
      created_at: new Date().toISOString(),
      listing_title: 'Mid-Century Modern Desk',
      listing_price: 650,
      listing_images: ['https://images.pexels.com/photos/2451264/pexels-photo-2451264.jpeg?auto=compress&cs=tinysrgb&w=400'],
      listing_category: 'furniture',
      listing_condition_notes: [
        { issue: 'Small water ring on top surface', confidence: 'high' },
        { issue: 'One drawer slightly stiff', confidence: 'medium' },
      ],
    },
    {
      id: 'match-5',
      buy_agent_id: 'demo-buy-3',
      listing_id: 'demo-5',
      score: 62,
      reason: 'Within budget. Verified condition details',
      status: 'potential',
      created_at: new Date().toISOString(),
      listing_title: 'Herman Miller Aeron Chair',
      listing_price: 890,
      listing_images: ['https://images.pexels.com/photos/1957478/pexels-photo-1957478.jpeg?auto=compress&cs=tinysrgb&w=400'],
      listing_category: 'furniture',
      listing_condition_notes: [
        { issue: 'Mesh in excellent condition, no sag', confidence: 'high' },
      ],
    },
  ],
};

export default function BuyAgentsPage() {
  const { buyAgents, setBuyAgents } = useAppStore();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [matches, setMatches] = useState<EnrichedMatch[]>([]);
  const [running, setRunning] = useState(false);
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (buyAgents.length === 0) {
      setBuyAgents(DEMO_AGENTS);
    }
  }, [buyAgents.length, setBuyAgents]);

  useEffect(() => {
    const counts: Record<string, number> = {};
    for (const agent of DEMO_AGENTS) {
      const demoMatches = DEMO_MATCHES[agent.id] || [];
      counts[agent.id] = demoMatches.filter((m) => m.status === 'potential').length;
    }
    setMatchCounts(counts);
  }, []);

  const handleSelectAgent = useCallback((agentId: string) => {
    setSelectedAgentId(agentId);
    const demoMatches = DEMO_MATCHES[agentId] || [];
    setMatches(demoMatches);
  }, []);

  useEffect(() => {
    if (buyAgents.length > 0 && !selectedAgentId) {
      handleSelectAgent(buyAgents[0].id);
    }
  }, [buyAgents, selectedAgentId, handleSelectAgent]);

  const handleRunFinder = async () => {
    if (!selectedAgentId) return;
    setRunning(true);

    try {
      const res = await fetch('/api/finder/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buy_agent_id: selectedAgentId }),
      });

      const data = await res.json();

      if (data.matches && data.matches.length > 0) {
        const matchRes = await fetch(`/api/matches?buy_agent_id=${selectedAgentId}`);
        const matchData = await matchRes.json();
        setMatches(matchData.matches || []);

        setMatchCounts((prev) => ({
          ...prev,
          [selectedAgentId]: (matchData.matches || []).filter(
            (m: EnrichedMatch) => m.status === 'potential'
          ).length,
        }));
      }
    } catch {
      // If DB not connected, keep demo data
    } finally {
      setRunning(false);
    }
  };

  const handleNegotiate = async (matchId: string) => {
    setActionLoading(true);
    try {
      await fetch('/api/matches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: matchId, status: 'negotiating' }),
      });
    } catch {
      // Fall through to optimistic update
    }

    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, status: 'negotiating' } : m))
    );
    setActionLoading(false);
  };

  const handleDismiss = async (matchId: string) => {
    setActionLoading(true);
    try {
      await fetch('/api/matches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: matchId, status: 'dismissed' }),
      });
    } catch {
      // Fall through to optimistic update
    }

    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, status: 'dismissed' } : m))
    );

    if (selectedAgentId) {
      setMatchCounts((prev) => ({
        ...prev,
        [selectedAgentId]: Math.max(0, (prev[selectedAgentId] || 0) - 1),
      }));
    }
    setActionLoading(false);
  };

  const potentialMatches = matches.filter((m) => m.status === 'potential');
  const otherMatches = matches.filter((m) => m.status !== 'potential');

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl font-light tracking-tight">My Buy Agents</h1>
            <p className="text-sm text-bp-muted mt-0.5">
              {buyAgents.length} agent{buyAgents.length !== 1 ? 's' : ''} active
            </p>
          </div>
          <Link href="/buy/new">
            <Button variant="buyer" size="sm">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> New Buy Agent
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4 space-y-3">
            {buyAgents.map((agent, i) => (
              <div key={agent.id} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                <BuyAgentCard
                  agent={agent}
                  matchCount={matchCounts[agent.id] || 0}
                  onClick={() => handleSelectAgent(agent.id)}
                  selected={selectedAgentId === agent.id}
                />
              </div>
            ))}

            {buyAgents.length === 0 && (
              <Card className="text-center py-12">
                <Bot className="w-8 h-8 text-bp-muted-light mx-auto mb-3" />
                <p className="text-sm text-bp-muted">No buy agents yet</p>
                <Link href="/buy/new" className="inline-block mt-3">
                  <Button variant="buyer" size="sm">
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Create One
                  </Button>
                </Link>
              </Card>
            )}
          </div>

          <div className="col-span-8">
            {selectedAgentId ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-lg font-medium">
                    Potential Matches
                    {potentialMatches.length > 0 && (
                      <span className="text-bp-muted font-normal ml-2 text-sm">
                        ({potentialMatches.length})
                      </span>
                    )}
                  </h2>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRunFinder}
                    loading={running}
                    disabled={running}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${running ? 'animate-spin' : ''}`} />
                    {running ? 'Searching...' : 'Run Finder'}
                  </Button>
                </div>

                {potentialMatches.length === 0 && !running && (
                  <Card className="text-center py-12">
                    <Inbox className="w-8 h-8 text-bp-muted-light mx-auto mb-3" />
                    <p className="text-sm text-bp-muted">No potential matches yet</p>
                    <p className="text-xs text-bp-muted-light mt-1">
                      Click &quot;Run Finder&quot; to search for listings
                    </p>
                  </Card>
                )}

                <div className="space-y-3">
                  {potentialMatches.map((match, i) => (
                    <div key={match.id} className="animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
                      <MatchCard
                        match={match}
                        onNegotiate={handleNegotiate}
                        onDismiss={handleDismiss}
                        loading={actionLoading}
                      />
                    </div>
                  ))}
                </div>

                {otherMatches.length > 0 && (
                  <>
                    <h3 className="font-heading text-sm font-medium text-bp-muted mt-6">
                      Reviewed ({otherMatches.length})
                    </h3>
                    <div className="space-y-2">
                      {otherMatches.map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          onNegotiate={handleNegotiate}
                          onDismiss={handleDismiss}
                          loading={actionLoading}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Card className="text-center py-16">
                <Search className="w-8 h-8 text-bp-muted-light mx-auto mb-3" />
                <p className="text-sm text-bp-muted">Select a buy agent to view matches</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
