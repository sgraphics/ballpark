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
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime, formatPrice } from '@/lib/utils';
import type { AppEvent, EventType } from '@/types/database';

const eventConfig: Record<EventType, {
  icon: typeof Plus;
  label: string;
  variant: 'default' | 'buyer' | 'seller' | 'success' | 'warning' | 'error';
}> = {
  listing_created: { icon: Plus, label: 'New Listing', variant: 'seller' },
  match_found: { icon: Target, label: 'Match Found', variant: 'buyer' },
  negotiation_started: { icon: MessageSquare, label: 'Negotiation Started', variant: 'default' },
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

export function EventCard({ event }: { event: AppEvent }) {
  const config = eventConfig[event.type] || {
    icon: MessageSquare,
    label: event.type,
    variant: 'default' as const,
  };
  const Icon = config.icon;
  const p = event.payload;
  const title = typeof p.title === 'string' ? p.title : null;
  const message = typeof p.message === 'string' ? p.message : null;
  const price = typeof p.price === 'number' ? p.price : null;

  const link =
    typeof p.negotiation_id === 'string'
      ? `/arena/${p.negotiation_id}`
      : typeof p.listing_id === 'string'
        ? `/listings/${p.listing_id}`
        : null;

  const inner = (
    <Card interactive={!!link} className="animate-fade-in group">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-gray-50 text-bp-muted group-hover:scale-105 transition-transform">
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={config.variant}>{config.label}</Badge>
            <span className="text-[11px] text-bp-muted-light">{formatRelativeTime(event.created_at)}</span>
          </div>
          {title && <h4 className="text-sm font-medium truncate">{title}</h4>}
          {message && <p className="text-xs text-bp-muted mt-0.5 line-clamp-2">{message}</p>}
          {price !== null && (
            <p className="text-sm font-medium mt-1">{formatPrice(price)}</p>
          )}
        </div>
      </div>
    </Card>
  );

  if (link) return <Link href={link}>{inner}</Link>;
  return inner;
}
