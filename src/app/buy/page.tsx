'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Search, Bot, RefreshCw, Inbox, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BuyAgentCard } from '@/components/buy/buy-agent-card';
import { MatchCard } from '@/components/buy/match-card';
import { useAppStore } from '@/store/app-store';
import type { BuyAgentStatus } from '@/types/database';

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

interface CacheEntry {
  matches: EnrichedMatch[];
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export default function BuyAgentsPage() {
  const router = useRouter();
  const { buyAgents, setBuyAgents } = useAppStore();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [matches, setMatches] = useState<EnrichedMatch[]>([]);
  const [running, setRunning] = useState(false);
  const [autoSearching, setAutoSearching] = useState(false);
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
  const [actionLoading, setActionLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [matchesLoading, setMatchesLoading] = useState(false);

  // Cache for finder results keyed by agent ID
  const matchCacheRef = useRef<Record<string, CacheEntry>>({});
  // Debounce ref to prevent concurrent auto-searches
  const autoSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSearchInFlightRef = useRef<string | null>(null);

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
      const fetchedMatches = data.matches || [];
      setMatches(fetchedMatches);

      // Update cache
      matchCacheRef.current[agentId] = {
        matches: fetchedMatches,
        timestamp: Date.now(),
      };
    } catch (err) {
      console.error('Failed to load matches:', err);
      setMatches([]);
    } finally {
      setMatchesLoading(false);
    }
  }, []);

  // Auto-search: run finder when selecting an agent
  const runAutoSearch = useCallback(async (agentId: string) => {
    // Check if agent is active
    const agent = buyAgents.find(a => a.id === agentId);
    if (!agent || (agent.status || 'active') !== 'active') return;

    // Check cache - skip if fresh results exist
    const cached = matchCacheRef.current[agentId];
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
      return; // Cache is still fresh, skip auto-search
    }

    // Prevent duplicate concurrent searches for same agent
    if (autoSearchInFlightRef.current === agentId) return;
    autoSearchInFlightRef.current = agentId;
    setAutoSearching(true);

    try {
      const res = await fetch('/api/finder/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buy_agent_id: agentId }),
      });

      const finderData = await res.json();

      // If we got new matches, refresh the matches list
      if (finderData.total_matched > 0 || !cached) {
        const matchRes = await fetch(`/api/matches?buy_agent_id=${agentId}`);
        const matchData = await matchRes.json();
        const newMatches = matchData.matches || [];

        // Only update if this agent is still selected
        setSelectedAgentId(current => {
          if (current === agentId) {
            setMatches(newMatches);
          }
          return current;
        });

        // Update cache
        matchCacheRef.current[agentId] = {
          matches: newMatches,
          timestamp: Date.now(),
        };

        // Update match count
        setMatchCounts(prev => ({
          ...prev,
          [agentId]: newMatches.filter((m: EnrichedMatch) => m.status === 'potential').length,
        }));
      } else {
        // No new matches found, just update cache timestamp
        if (cached) {
          cached.timestamp = Date.now();
        }
      }
    } catch (err) {
      console.error('Auto-search failed:', err);
    } finally {
      autoSearchInFlightRef.current = null;
      setAutoSearching(false);
    }
  }, [buyAgents]);

  const handleSelectAgent = useCallback((agentId: string) => {
    setSelectedAgentId(agentId);
    fetchMatchesForAgent(agentId);

    // Debounced auto-search (300ms delay to avoid rapid-fire)
    if (autoSearchTimerRef.current) {
      clearTimeout(autoSearchTimerRef.current);
    }
    autoSearchTimerRef.current = setTimeout(() => {
      runAutoSearch(agentId);
    }, 300);
  }, [fetchMatchesForAgent, runAutoSearch]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSearchTimerRef.current) {
        clearTimeout(autoSearchTimerRef.current);
      }
    };
  }, []);

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
      const newMatches = matchData.matches || [];
      setMatches(newMatches);

      // Update cache
      matchCacheRef.current[selectedAgentId] = {
        matches: newMatches,
        timestamp: Date.now(),
      };

      setMatchCounts((prev) => ({
        ...prev,
        [selectedAgentId]: newMatches.filter(
          (m: EnrichedMatch) => m.status === 'potential'
        ).length,
      }));
    } catch (err) {
      console.error('Finder run failed:', err);
    } finally {
      setRunning(false);
    }
  };

  const handleStatusChange = async (agentId: string, newStatus: BuyAgentStatus) => {
    // Optimistic update
    setBuyAgents(
      buyAgents.map(a => a.id === agentId ? { ...a, status: newStatus } : a)
    );

    try {
      await fetch('/api/buy-agents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: agentId, status: newStatus }),
      });
    } catch (err) {
      console.error('Failed to update agent status:', err);
      // Revert on failure
      const res = await fetch('/api/buy-agents');
      const data = await res.json();
      if (data.agents) setBuyAgents(data.agents);
    }
  };

  const handleNegotiate = async (matchId: string) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/negotiations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buy_agent_id: match.buy_agent_id,
          listing_id: match.listing_id,
          match_id: matchId,
          auto_start: true,
        }),
      });

      const data = await res.json();
      if (data.negotiation?.id) {
        router.push(`/arena/${data.negotiation.id}`);
        return;
      }
    } catch (err) {
      console.error('Failed to create negotiation:', err);
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

  const activeAgentCount = buyAgents.filter(a => (a.status || 'active') === 'active').length;

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
              {activeAgentCount} active, {buyAgents.length - activeAgentCount} inactive
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
                  onStatusChange={handleStatusChange}
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
                  <div className="flex items-center gap-3">
                    <h2 className="font-heading text-lg font-medium">
                      Potential Matches
                      {potentialMatches.length > 0 && (
                        <span className="text-bp-muted font-normal ml-2 text-sm">
                          ({potentialMatches.length})
                        </span>
                      )}
                    </h2>
                    {autoSearching && (
                      <div className="flex items-center gap-1.5 text-bp-buyer">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span className="text-[11px] font-medium">Auto-searching...</span>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRunFinder}
                    loading={running}
                    disabled={running || autoSearching}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${running ? 'animate-spin' : ''}`} />
                    {running ? 'Searching...' : 'Run Finder'}
                  </Button>
                </div>

                {matchesLoading && !autoSearching && (
                  <Card className="text-center py-12">
                    <Loader2 className="w-6 h-6 text-bp-buyer animate-spin mx-auto mb-3" />
                    <p className="text-sm text-bp-muted">Loading matches...</p>
                  </Card>
                )}

                {potentialMatches.length === 0 && !running && !matchesLoading && !autoSearching && (
                  <Card className="text-center py-12">
                    <Inbox className="w-8 h-8 text-bp-muted-light mx-auto mb-3" />
                    <p className="text-sm text-bp-muted">No potential matches yet</p>
                    <p className="text-xs text-bp-muted-light mt-1">
                      The finder runs automatically, or click &quot;Run Finder&quot; to search now
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
