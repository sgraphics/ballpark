'use client';

import { Handshake, X, ExternalLink, AlertCircle, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice, getConfidenceColor } from '@/lib/utils';
import type { ConditionNote } from '@/types/database';
import Link from 'next/link';

interface MatchCardProps {
  match: {
    id: string;
    listing_id: string;
    score: number;
    reason: string;
    status: string;
    listing_title?: string;
    listing_price?: number;
    listing_images?: string[];
    listing_category?: string;
    listing_condition_notes?: ConditionNote[];
  };
  onNegotiate: (matchId: string) => void;
  onDismiss: (matchId: string) => void;
  loading?: boolean;
}

function ScoreIndicator({ score }: { score: number }) {
  const color =
    score >= 70
      ? 'text-bp-success'
      : score >= 50
        ? 'text-bp-warning'
        : 'text-bp-muted';

  const bg =
    score >= 70
      ? 'bg-bp-success-soft'
      : score >= 50
        ? 'bg-bp-warning-soft'
        : 'bg-gray-100';

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${bg}`}>
      <TrendingUp className={`w-3.5 h-3.5 ${color}`} />
      <span className={`text-sm font-medium font-body ${color}`}>{score}</span>
    </div>
  );
}

export function MatchCard({ match, onNegotiate, onDismiss, loading }: MatchCardProps) {
  const imageUrl =
    match.listing_images && match.listing_images.length > 0
      ? match.listing_images[0]
      : 'https://images.pexels.com/photos/4439901/pexels-photo-4439901.jpeg?auto=compress&cs=tinysrgb&w=400';

  const conditionNotes = match.listing_condition_notes || [];
  const isDismissed = match.status === 'dismissed';

  return (
    <Card className={`overflow-hidden transition-all ${isDismissed ? 'opacity-50' : ''}`}>
      <div className="flex gap-4">
        <div className="w-28 h-28 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
          <img
            src={imageUrl}
            alt={match.listing_title || 'Listing'}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0 py-0.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/listings/${match.listing_id}`}
                className="font-heading text-sm font-medium hover:underline truncate block"
              >
                {match.listing_title || 'Unknown Listing'}
              </Link>
              {match.listing_category && (
                <Badge className="mt-1">{match.listing_category}</Badge>
              )}
            </div>
            <ScoreIndicator score={match.score} />
          </div>

          <p className="text-xs text-bp-muted mt-1.5 line-clamp-1 font-body">{match.reason}</p>

          {conditionNotes.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              <AlertCircle className="w-3 h-3 text-bp-muted" />
              <span className="text-[11px] text-bp-muted font-body">
                {conditionNotes.length} condition note{conditionNotes.length > 1 ? 's' : ''}
                {conditionNotes.filter((n) => n.confidence === 'high').length > 0 && (
                  <> ({conditionNotes.filter((n) => n.confidence === 'high').length} high conf.)</>
                )}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between mt-2.5">
            {match.listing_price != null && (
              <span className="font-heading text-base font-medium">
                {formatPrice(match.listing_price)}
              </span>
            )}

            {!isDismissed && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDismiss(match.id)}
                  disabled={loading}
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Dismiss
                </Button>
                <Button
                  variant="buyer"
                  size="sm"
                  onClick={() => onNegotiate(match.id)}
                  disabled={loading}
                >
                  <Handshake className="w-3.5 h-3.5 mr-1" /> Negotiate
                </Button>
              </div>
            )}

            {isDismissed && (
              <Badge variant="default">Dismissed</Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
