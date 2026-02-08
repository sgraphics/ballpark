'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Bot, RefreshCw, Inbox, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BuyAgentCard } from '@/components/buy/buy-agent-card';
import { MatchCard } from '@/components/buy/match-card';
import { useAppStore } from '@/store/app-store';

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

export default function BuyAgentsPage() {
  const { buyAgents, setBuyAgents } = useAppStore();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [matches, setMatches] = useState<EnrichedMatch[]>([]);
  const [running, setRunning] = useState(false);
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
  const [actionLoading, setActionLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [matchesLoading, setMatchesLoading] = useState(false);

  // Fetch buy agents from API on mount
  useEffect(() => {
    async function loadAgents() {
      try {
        const res = await fetch('/api/buy-agents');
        const data = await res.json();
        if (data.agents) {
          setBuyAgents(data.agents);
        }
      } catch (err) {
        console.error('Failed to load buy agents:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAgents();
  }, [setBuyAgents]);

  // Fetch match counts for all agents once agents are loaded
  useEffect(() => {
    if (buyAgents.length === 0) return;

    async function loadMatchCounts() {
      try {
        const res = await fetch('/api/matches');
        const data = await res.json();
        const allMatches: EnrichedMatch[] = data.matches || [];
        const counts: Record<string, number> = {};
        for (const m of allMatches) {
          if (m.status === 'potential') {
            counts[m.buy_agent_id] = (counts[m.buy_agent_id] || 0) + 1;
          }
        }
        setMatchCounts(counts);
      } catch (err) {
        console.error('Failed to load match counts:', err);
      }
    }
    loadMatchCounts();
  }, [buyAgents]);

  // Fetch matches for the selected agent
  const fetchMatchesForAgent = useCallback(async (agentId: string) => {
    setMatchesLoading(true);
    try {
      const res = await fetch(`/api/matches?buy_agent_id=${agentId}`);
      const data = await res.json();
      setMatches(data.matches || []);
    } catch (err) {
      console.error('Failed to load matches:', err);
      setMatches([]);
    } finally {
      setMatchesLoading(false);
    }
  }, []);

  const handleSelectAgent = useCallback((agentId: string) => {
    setSelectedAgentId(agentId);
    fetchMatchesForAgent(agentId);
  }, [fetchMatchesForAgent]);

  // Auto-select first agent once loaded
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

      await res.json();

      // Refresh matches for the selected agent
      const matchRes = await fetch(`/api/matches?buy_agent_id=${selectedAgentId}`);
      const matchData = await matchRes.json();
      setMatches(matchData.matches || []);

      setMatchCounts((prev) => ({
        ...prev,
        [selectedAgentId]: (matchData.matches || []).filter(
          (m: EnrichedMatch) => m.status === 'potential'
        ).length,
      }));
    } catch (err) {
      console.error('Finder run failed:', err);
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

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 text-bp-buyer animate-spin" />
        </div>
      </MainLayout>
    );
  }

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

                {matchesLoading && (
                  <Card className="text-center py-12">
                    <Loader2 className="w-6 h-6 text-bp-buyer animate-spin mx-auto mb-3" />
                    <p className="text-sm text-bp-muted">Loading matches...</p>
                  </Card>
                )}

                {potentialMatches.length === 0 && !running && !matchesLoading && (
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
