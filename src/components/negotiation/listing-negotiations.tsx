'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, Loader2, RefreshCw } from 'lucide-react';
import { NegotiationCard } from './negotiation-card';
import { Button } from '@/components/ui/button';
import type { Negotiation, BuyAgent, NegMessage, ParsedMessage } from '@/types/database';

interface NegotiationWithDetails extends Negotiation {
  buyAgent?: BuyAgent | null;
  lastMessage?: { parsed: ParsedMessage; role: string } | null;
  messageCount: number;
}

interface ListingNegotiationsProps {
  listingId: string;
  title?: string;
  className?: string;
}

export function ListingNegotiations({
  listingId,
  title = 'Active Negotiations',
  className = '',
}: ListingNegotiationsProps) {
  const [negotiations, setNegotiations] = useState<NegotiationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNegotiations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const negRes = await fetch(`/api/negotiations?listing_id=${listingId}`);
      const negData = await negRes.json();

      if (!negData.negotiations || negData.negotiations.length === 0) {
        setNegotiations([]);
        return;
      }

      const enriched: NegotiationWithDetails[] = await Promise.all(
        negData.negotiations.map(async (neg: Negotiation) => {
          let buyAgent: BuyAgent | null = null;
          let lastMessage: { parsed: ParsedMessage; role: string } | null = null;
          let messageCount = 0;

          try {
            const [agentRes, messagesRes] = await Promise.all([
              fetch(`/api/buy-agents?id=${neg.buy_agent_id}`),
              fetch(`/api/messages?negotiation_id=${neg.id}`),
            ]);

            const agentData = await agentRes.json();
            const messagesData = await messagesRes.json();

            if (agentData.agents?.length > 0) {
              buyAgent = agentData.agents[0];
            }

            if (messagesData.messages?.length > 0) {
              messageCount = messagesData.messages.length;
              const last = messagesData.messages[messagesData.messages.length - 1] as NegMessage;
              lastMessage = {
                parsed: last.parsed,
                role: last.role,
              };
            }
          } catch {
            // Continue with partial data
          }

          return {
            ...neg,
            buyAgent,
            lastMessage,
            messageCount,
          };
        })
      );

      setNegotiations(enriched);
    } catch (err) {
      setError('Failed to load negotiations');
      console.error('Error fetching negotiations:', err);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchNegotiations();

    const interval = setInterval(fetchNegotiations, 10000);
    return () => clearInterval(interval);
  }, [fetchNegotiations]);

  const activeNegotiations = negotiations.filter(
    (n) => n.state === 'negotiating' || n.state === 'agreed'
  );
  const pendingPrompts = negotiations.filter((n) => n.ball === 'human');

  if (loading && negotiations.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-bp-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-bp-muted" />
          <h3 className="font-heading text-sm">{title}</h3>
          {activeNegotiations.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-cyan-500/10 text-cyan-600">
              {activeNegotiations.length}
            </span>
          )}
          {pendingPrompts.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-amber-500/10 text-amber-600 animate-pulse">
              {pendingPrompts.length} needs input
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchNegotiations}
          disabled={loading}
          className="h-7 w-7 p-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error && (
        <div className="text-xs text-red-500 mb-3">{error}</div>
      )}

      {negotiations.length === 0 ? (
        <div className="text-center py-6 px-4 rounded-lg bg-zinc-50 border border-zinc-100">
          <p className="text-sm text-bp-muted">No negotiations yet</p>
          <p className="text-xs text-bp-muted-light mt-1">
            Buy agents will appear here when they start negotiating
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {negotiations.map((neg) => (
            <NegotiationCard
              key={neg.id}
              negotiation={neg}
              buyAgent={neg.buyAgent}
              lastMessage={neg.lastMessage}
              messageCount={neg.messageCount}
            />
          ))}
        </div>
      )}
    </div>
  );
}
