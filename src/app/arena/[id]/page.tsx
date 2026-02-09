'use client';

import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { DuelArena } from '@/components/arena/duel-arena';
import { TurnIndicator, TurnBadge } from '@/components/negotiation/turn-indicator';
import type { Listing, BuyAgent, SellAgent, Negotiation, NegMessage, ParsedMessage, Escrow } from '@/types/database';

interface ArenaPageProps {
  params: { id: string };
}

export default function ArenaPage({ params }: ArenaPageProps) {
  const [negotiation, setNegotiation] = useState<Negotiation | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [buyAgent, setBuyAgent] = useState<BuyAgent | null>(null);
  const [sellAgent, setSellAgent] = useState<SellAgent | null>(null);
  const [messages, setMessages] = useState<NegMessage[]>([]);
  const [escrow, setEscrow] = useState<Escrow | null>(null);
  const [buyerWallet, setBuyerWallet] = useState<string | null>(null);
  const [sellerWallet, setSellerWallet] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const negRes = await fetch(`/api/negotiations?id=${params.id}`);
      const negData = await negRes.json();

      if (negData.negotiations?.length > 0) {
        const neg = negData.negotiations[0];
        setNegotiation(neg);

        const fetches: Promise<Response>[] = [
          fetch(`/api/listings?id=${neg.listing_id}`),
          fetch(`/api/buy-agents?id=${neg.buy_agent_id}`),
          fetch(`/api/sell-agents?listing_id=${neg.listing_id}`),
          fetch(`/api/messages?negotiation_id=${params.id}`),
          fetch(`/api/escrow?negotiation_id=${params.id}`),
        ];

        const [listingRes, buyAgentRes, sellAgentRes, messagesRes, escrowRes] = await Promise.all(fetches);

        const [listingData, buyAgentData, sellAgentData, messagesData, escrowData] = await Promise.all([
          listingRes.json(),
          buyAgentRes.json(),
          sellAgentRes.json(),
          messagesRes.json(),
          escrowRes.json(),
        ]);

        const loadedListing = listingData.listings?.[0] || null;
        const loadedBuyAgent = buyAgentData.agents?.[0] || null;

        if (loadedListing) setListing(loadedListing);
        if (loadedBuyAgent) setBuyAgent(loadedBuyAgent);
        if (sellAgentData.agents?.length > 0) {
          setSellAgent(sellAgentData.agents[0]);
        }
        setMessages(messagesData.messages || []);
        if (escrowData.escrows?.length > 0) {
          setEscrow(escrowData.escrows[0]);
        }

        // Fetch wallet addresses for buyer and seller
        const userIds = new Set<string>();
        if (loadedBuyAgent?.user_id) userIds.add(loadedBuyAgent.user_id);
        if (loadedListing?.seller_user_id) userIds.add(loadedListing.seller_user_id);

        if (userIds.size > 0) {
          try {
            const walletRes = await fetch(`/api/users/wallet?user_ids=${[...userIds].join(',')}`);
            const walletData = await walletRes.json();
            if (walletData.wallets) {
              if (loadedBuyAgent?.user_id) {
                setBuyerWallet(walletData.wallets[loadedBuyAgent.user_id] || null);
              }
              if (loadedListing?.seller_user_id) {
                setSellerWallet(walletData.wallets[loadedListing.seller_user_id] || null);
              }
            }
          } catch {
            console.error('Failed to fetch wallet addresses');
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch negotiation data:', err);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // SSE for real-time updates
  useEffect(() => {
    const eventSource = new EventSource(`/api/negotiations/${params.id}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'init') {
          setNegotiation(data.negotiation);
          setMessages(data.messages || []);
        } else if (data.type === 'update') {
          if (data.negotiation) {
            setNegotiation(prev => prev ? { ...prev, ...data.negotiation } : data.negotiation);
          }
          if (data.message) {
            setMessages(prev => {
              // Deduplicate by checking if we already have a message with same role+content
              const dominated = prev.some(m =>
                m.role === data.message.role &&
                m.parsed?.price_proposal === data.message.parsed?.price_proposal &&
                m.parsed?.status_message === data.message.parsed?.status_message
              );
              if (dominated) return prev;
              return [...prev, data.message];
            });
          }
        }
      } catch {
        // Ignore parse errors
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [params.id]);

  // Polling fallback: refresh negotiation state every 3s while active
  useEffect(() => {
    if (!negotiation || negotiation.state === 'confirmed') return;

    const poll = setInterval(async () => {
      try {
        const [negRes, msgRes] = await Promise.all([
          fetch(`/api/negotiations?id=${params.id}`),
          fetch(`/api/messages?negotiation_id=${params.id}`),
        ]);
        const [negData, msgData] = await Promise.all([negRes.json(), msgRes.json()]);

        if (negData.negotiations?.[0]) {
          setNegotiation(negData.negotiations[0]);
        }
        if (msgData.messages) {
          setMessages(msgData.messages);
        }

        // Also poll escrow data if we're in an escrow-related state
        const currentState = negData.negotiations?.[0]?.state;
        if (['escrow_created', 'funded', 'confirmed', 'flagged', 'resolved'].includes(currentState)) {
          const escrowRes = await fetch(`/api/escrow?negotiation_id=${params.id}`);
          const escrowData = await escrowRes.json();
          if (escrowData.escrows?.length > 0) {
            setEscrow(escrowData.escrows[0]);
          }
        }
      } catch {
        // Silent - polling is best-effort
      }
    }, 3000);

    return () => clearInterval(poll);
  }, [params.id, negotiation?.state]);

  const handleRunStep = async () => {
    if (!negotiation) return;
    setRunning(true);

    try {
      const res = await fetch('/api/orchestrate/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ negotiation_id: negotiation.id, auto_continue: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(`[arena] Orchestration failed (${res.status}):`, data.error || data);
        return;
      }

      if (data.message) {
        setMessages(prev => [...prev, {
          id: `temp-${Date.now()}`,
          negotiation_id: negotiation.id,
          role: data.message.role,
          raw: data.message.raw,
          parsed: data.message.parsed,
          created_at: new Date().toISOString(),
        }]);
      }

      if (data.negotiation) {
        setNegotiation(prev => prev ? { ...prev, ...data.negotiation } : null);
      }
    } catch (err) {
      console.error('Failed to run orchestration step:', err);
    } finally {
      setRunning(false);
    }
  };

  const handleHumanResponse = async (response: string) => {
    if (!negotiation) return;

    const lastMessage = messages[messages.length - 1];
    const target = (lastMessage?.parsed as ParsedMessage)?.user_prompt?.target || 'buyer';

    setSubmitting(true);

    try {
      const res = await fetch('/api/orchestrate/human-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          negotiation_id: negotiation.id,
          response,
          target,
          auto_continue: true,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessages(prev => [...prev, {
          id: `human-${Date.now()}`,
          negotiation_id: negotiation.id,
          role: 'human',
          raw: response,
          parsed: {
            answer: response,
            status_message: `Human (${target}) responded`,
            price_proposal: null,
            concessions: [],
            user_prompt: null,
          },
          created_at: new Date().toISOString(),
        }]);

        setNegotiation(prev => prev ? { ...prev, ball: data.negotiation.ball } : null);
      }
    } catch (err) {
      console.error('Failed to submit human response:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="w-6 h-6 animate-spin text-bp-muted" />
        </div>
      </MainLayout>
    );
  }

  if (!negotiation || !listing || !buyAgent) {
    return (
      <MainLayout>
        <div className="text-center py-16">
          <p className="text-bp-muted">Negotiation not found</p>
          <Link href="/arena" className="mt-4 inline-block">
            <Button variant="secondary">Back to Arena</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/arena">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-heading text-xl tracking-tight">{listing.title}</h1>
              </div>
              <p className="text-xs text-bp-muted mt-0.5">Negotiation #{negotiation.id.slice(0, 8)}</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <TurnIndicator ball={negotiation.ball} state={negotiation.state} />
            <Link href={`/listings/${listing.id}`}>
              <Button variant="secondary" size="sm">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> View Listing
              </Button>
            </Link>
          </div>
        </div>

        <DuelArena
          listing={listing}
          buyAgent={buyAgent}
          sellAgent={sellAgent}
          negotiation={negotiation}
          messages={messages}
          onRunStep={handleRunStep}
          isRunning={running}
          onHumanResponse={handleHumanResponse}
          isSubmitting={submitting}
          escrow={escrow}
          buyerWallet={buyerWallet}
          sellerWallet={sellerWallet}
          onEscrowCreated={(esc) => setEscrow(esc)}
          onStateChange={(newState) => {
            setNegotiation(prev => prev ? { ...prev, state: newState } : null);
            fetchData();
          }}
        />
      </div>
    </MainLayout>
  );
}
