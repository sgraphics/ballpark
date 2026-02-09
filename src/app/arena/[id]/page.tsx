'use client';

import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DuelArena } from '@/components/arena/duel-arena';
import { StatusRail } from '@/components/arena/status-rail';
import { HumanInput } from '@/components/arena/human-input';
import { EscrowPanel } from '@/components/escrow/escrow-panel';
import { ImageGallery } from '@/components/listings/image-gallery';
import { EventFeed } from '@/components/feed/event-feed';
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

        if (listingData.listings?.length > 0) {
          setListing(listingData.listings[0]);
        }
        if (buyAgentData.agents?.length > 0) {
          setBuyAgent(buyAgentData.agents[0]);
        }
        if (sellAgentData.agents?.length > 0) {
          setSellAgent(sellAgentData.agents[0]);
        }
        setMessages(messagesData.messages || []);
        if (escrowData.escrows?.length > 0) {
          setEscrow(escrowData.escrows[0]);
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

  const handleInitiateEscrow = async () => {
    if (!negotiation || !listing) return;

    // For now, auto-create escrow via the API (seller action)
    try {
      const res = await fetch('/api/escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          negotiation_id: negotiation.id,
          item_id: listing.id,
          usdc_amount: negotiation.agreed_price,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('[arena] Failed to create escrow:', data.error);
        return;
      }

      if (data.escrow) {
        setEscrow(data.escrow);
        setNegotiation(prev => prev ? { ...prev, state: 'escrow_created', ball: 'buyer' } : null);
      }
    } catch (err) {
      console.error('Failed to initiate escrow:', err);
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

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const pendingPrompt = negotiation.ball === 'human' && lastMessage
    ? (lastMessage.parsed as ParsedMessage).user_prompt
    : null;

  // Show escrow panel when negotiation reaches escrow-related states
  const showEscrow = ['agreed', 'escrow_created', 'funded', 'confirmed', 'flagged', 'resolved'].includes(negotiation.state);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/arena">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-heading text-xl tracking-tight">{listing.title}</h1>
                <TurnBadge ball={negotiation.ball} state={negotiation.state} />
              </div>
              <p className="text-xs text-bp-muted mt-0.5">Negotiation #{negotiation.id.slice(0, 8)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <TurnIndicator ball={negotiation.ball} state={negotiation.state} />
            <Link href={`/listings/${listing.id}`}>
              <Button variant="secondary" size="sm">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> View Listing
              </Button>
            </Link>
          </div>
        </div>

        <div className="mb-6">
          <DuelArena
            listing={listing}
            buyAgent={buyAgent}
            sellAgent={sellAgent}
            negotiation={negotiation}
            messages={messages}
            onRunStep={handleRunStep}
            onInitiateEscrow={handleInitiateEscrow}
            isRunning={running}
          />
        </div>

        {pendingPrompt && (
          <div className="mb-6">
            <HumanInput
              prompt={pendingPrompt}
              onSubmit={handleHumanResponse}
              isSubmitting={submitting}
            />
          </div>
        )}

        {showEscrow && (
          <div className="mb-6">
            <EscrowPanel
              negotiation={negotiation}
              escrow={escrow}
              listingId={listing.id}
              isOwner={true}
              isBuyer={true}
              isAdmin={false}
              onEscrowCreated={(esc) => setEscrow(esc)}
              onStateChange={(newState) => {
                setNegotiation(prev => prev ? { ...prev, state: newState } : null);
                // Refetch to get latest data
                fetchData();
              }}
            />
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3">
            <div className="sticky top-4 space-y-4">
              <ImageGallery images={listing.image_urls} />
              <Card>
                <div className="text-xs text-bp-muted space-y-1">
                  <div className="flex justify-between">
                    <span>Ask Price</span>
                    <span className="font-medium text-bp-seller">${listing.ask_price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Category</span>
                    <span className="font-medium">{listing.category}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
          <div className="col-span-5">
            <StatusRail messages={messages} listing={listing} />
          </div>
          <div className="col-span-4">
            <Card dark>
              <EventFeed
                negotiationId={negotiation.id}
                title="Live Feed"
                compact={true}
                showPromptFilter={true}
                emptyMessage="Waiting for activity..."
                autoScroll={true}
              />
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
