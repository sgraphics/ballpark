'use client';

import Link from 'next/link';
import { Bot, ArrowRight, DollarSign, MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TurnIndicator, TurnBadge } from './turn-indicator';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import type { Negotiation, BuyAgent, ParsedMessage } from '@/types/database';

interface NegotiationCardProps {
  negotiation: Negotiation;
  buyAgent?: BuyAgent | null;
  lastMessage?: { parsed: ParsedMessage; role: string } | null;
  messageCount?: number;
}

export function NegotiationCard({
  negotiation,
  buyAgent,
  lastMessage,
  messageCount = 0,
}: NegotiationCardProps) {
  const currentPrice = negotiation.agreed_price || lastMessage?.parsed.price_proposal || null;
  const statusMessage = lastMessage?.parsed.status_message;
  const hasPendingPrompt = negotiation.ball === 'human' && lastMessage?.parsed.user_prompt;

  return (
    <Card className="group hover:border-zinc-300 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            <Bot className="w-4 h-4 text-cyan-500" />
          </div>
          <div>
            <p className="text-sm font-medium">{buyAgent?.name || 'Buy Agent'}</p>
            <p className="text-[10px] text-bp-muted">
              {formatRelativeTime(negotiation.updated_at)}
            </p>
          </div>
        </div>
        <TurnBadge ball={negotiation.ball} state={negotiation.state} />
      </div>

      <div className="space-y-2 mb-4">
        {currentPrice && (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-50">
            <span className="text-xs text-bp-muted">Current Price</span>
            <span className="text-sm font-semibold flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-bp-muted" />
              {formatPrice(currentPrice).replace('$', '')}
            </span>
          </div>
        )}

        {statusMessage && (
          <p className="text-xs text-bp-muted line-clamp-2 px-1">
            {statusMessage}
          </p>
        )}

        {hasPendingPrompt && lastMessage?.parsed.user_prompt && (
          <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-xs font-medium text-amber-700 mb-1">Question for you:</p>
            <p className="text-xs text-amber-600">{lastMessage.parsed.user_prompt.question}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
        <div className="flex items-center gap-3 text-[10px] text-bp-muted">
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {messageCount} messages
          </span>
          <TurnIndicator ball={negotiation.ball} state={negotiation.state} compact />
        </div>

        <Link href={`/arena/${negotiation.id}`}>
          <Button variant="secondary" size="sm" className="gap-1 group-hover:bg-zinc-100">
            View <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}
