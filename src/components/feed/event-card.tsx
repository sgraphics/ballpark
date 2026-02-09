'use client';

import Link from 'next/link';
import {
  Plus,
  Target,
  MessageSquare,
  Reply,
  HelpCircle,
  Handshake,
  Lock,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  CheckSquare,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TurnBadge } from '@/components/negotiation/turn-indicator';
import { formatRelativeTime, formatPrice } from '@/lib/utils';
import type { AppEvent, EventType, BallOwner, NegotiationState } from '@/types/database';

const eventConfig: Record<EventType, {
  icon: typeof Plus;
  label: string;
  variant: 'default' | 'buyer' | 'seller' | 'success' | 'warning' | 'error';
  spinning?: boolean;
}> = {
  listing_created: { icon: Plus, label: 'New Listing', variant: 'seller' },
  match_found: { icon: Target, label: 'Match Found', variant: 'buyer' },
  negotiation_started: { icon: MessageSquare, label: 'Negotiation Started', variant: 'default' },
  agent_processing: { icon: Loader2, label: 'Agent Thinking', variant: 'default', spinning: true },
  buyer_proposes: { icon: MessageSquare, label: 'Buyer Proposes', variant: 'buyer' },
  seller_counters: { icon: Reply, label: 'Seller Counters', variant: 'seller' },
  human_input_required: { icon: HelpCircle, label: 'Input Needed', variant: 'warning' },
  deal_agreed: { icon: Handshake, label: 'Deal Agreed', variant: 'success' },
  escrow_created: { icon: Lock, label: 'Escrow Created', variant: 'warning' },
  escrow_funded: { icon: DollarSign, label: 'Escrow Funded', variant: 'success' },
  delivery_confirmed: { icon: CheckCircle, label: 'Delivered', variant: 'success' },
  issue_flagged: { icon: AlertTriangle, label: 'Issue Flagged', variant: 'error' },
  issue_resolved: { icon: CheckSquare, label: 'Resolved', variant: 'success' },
};

interface EventCardProps {
  event: AppEvent;
  compact?: boolean;
  showThumbnail?: boolean;
}

export function EventCard({ event, compact = false, showThumbnail = false }: EventCardProps) {
  const config = eventConfig[event.type] || {
    icon: MessageSquare,
    label: event.type,
    variant: 'default' as const,
  };
  const Icon = config.icon;
  const isSpinning = config.spinning;
  const p = event.payload;
  const title = typeof p.listing_title === 'string' ? p.listing_title : (typeof p.title === 'string' ? p.title : null);
  const message = typeof p.status_message === 'string' ? p.status_message : (typeof p.message === 'string' ? p.message : null);
  const price = typeof p.price_proposal === 'number' ? p.price_proposal : (typeof p.price === 'number' ? p.price : null);
  const thumbnail = showThumbnail && typeof p.thumbnail_url === 'string' ? p.thumbnail_url : null;
  const ball = typeof p.ball === 'string' ? (p.ball as BallOwner) : null;

  // Determine negotiation state from event type for turn badge
  const negotiationEventTypes: EventType[] = [
    'negotiation_started', 'agent_processing', 'buyer_proposes',
    'seller_counters', 'human_input_required',
  ];
  const isNegotiationEvent = negotiationEventTypes.includes(event.type);
  const inferredState: NegotiationState = event.type === 'deal_agreed' ? 'agreed' : 'negotiating';

  const link =
    typeof p.negotiation_id === 'string'
      ? `/arena/${p.negotiation_id}`
      : typeof p.listing_id === 'string'
        ? `/listings/${p.listing_id}`
        : null;

  const inner = (
    <Card interactive={!!link} className={`animate-fade-in group ${compact ? 'p-2' : ''}`}>
      <div className="flex items-start gap-3">
        {thumbnail && (
          <img src={thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
        )}
        <div className={`p-2 rounded-lg bg-gray-50 text-bp-muted group-hover:scale-105 transition-transform ${isSpinning ? 'animate-pulse' : ''}`}>
          <Icon className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={config.variant}>{config.label}</Badge>
            <span className="text-[11px] text-bp-muted-light">{formatRelativeTime(event.created_at)}</span>
          </div>
          {title && <h4 className="text-sm truncate">{title}</h4>}
          {message && <p className="text-xs text-bp-muted mt-0.5 line-clamp-2">{message}</p>}
          {price !== null && (
            <p className="text-sm font-medium mt-1">{formatPrice(price)}</p>
          )}
          {isNegotiationEvent && ball && (
            <div className="mt-1.5">
              <TurnBadge ball={ball} state={inferredState} />
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  if (link) return <Link href={link}>{inner}</Link>;
  return inner;
}
