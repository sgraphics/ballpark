'use client';

import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { DuelArena } from '@/components/arena/duel-arena';
import { StatusRail } from '@/components/arena/status-rail';
import { HumanInput } from '@/components/arena/human-input';
import { ImageGallery } from '@/components/listings/image-gallery';
import type { Listing, BuyAgent, SellAgent, Negotiation, NegMessage, ParsedMessage } from '@/types/database';

interface ArenaPageProps {
  params: { id: string };
}

export default function ArenaPage({ params }: ArenaPageProps) {
  const [negotiation, setNegotiation] = useState<Negotiation | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [buyAgent, setBuyAgent] = useState<BuyAgent | null>(null);
  const [sellAgent, setSellAgent] = useState<SellAgent | null>(null);
  const [messages, setMessages] = useState<NegMessage[]>([]);
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

        const [listingRes, buyAgentRes, sellAgentRes, messagesRes] = await Promise.all([
          fetch(`/api/listings?id=${neg.listing_id}`),
          fetch(`/api/buy-agents?id=${neg.buy_agent_id}`),
          fetch(`/api/sell-agents?listing_id=${neg.listing_id}`),
          fetch(`/api/messages?negotiation_id=${params.id}`),
        ]);

        const [listingData, buyAgentData, sellAgentData, messagesData] = await Promise.all([
          listingRes.json(),
          buyAgentRes.json(),
          sellAgentRes.json(),
          messagesRes.json(),
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

  useEffect(() => {
    const eventSource = new EventSource(`/api/negotiations/${params.id}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'init') {
          setNegotiation(data.negotiation);
          setMessages(data.messages || []);
        } else if (data.type === 'update') {
          if (data.negotiation) setNegotiation(data.negotiation);
          if (data.message) {
            setMessages(prev => [...prev, data.message]);
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

  const handleRunStep = async () => {
    if (!negotiation) return;
    setRunning(true);

    try {
      const res = await fetch('/api/orchestrate/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ negotiation_id: negotiation.id }),
      });

      const data = await res.json();

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

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const pendingPrompt = negotiation.ball === 'human' && lastMessage
    ? (lastMessage.parsed as ParsedMessage).user_prompt
    : null;

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
              <h1 className="font-heading text-xl font-light tracking-tight">{listing.title}</h1>
              <p className="text-xs text-bp-muted mt-0.5">Negotiation #{negotiation.id.slice(0, 8)}</p>
            </div>
          </div>
          <Link href={`/listings/${listing.id}`}>
            <Button variant="secondary" size="sm">
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> View Listing
            </Button>
          </Link>
        </div>

        <div className="mb-6">
          <DuelArena
            listing={listing}
            buyAgent={buyAgent}
            sellAgent={sellAgent}
            negotiation={negotiation}
            messages={messages}
            onRunStep={handleRunStep}
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

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4">
            <ImageGallery images={listing.image_urls} />
          </div>
          <div className="col-span-8">
            <StatusRail messages={messages} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
