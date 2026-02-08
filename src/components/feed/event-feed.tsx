'use client';

import { useEffect, useState, useCallback } from 'react';
import { Filter, Bell, Loader2, Radio } from 'lucide-react';
import { EventCard } from './event-card';
import { Button } from '@/components/ui/button';
import type { AppEvent, EventType } from '@/types/database';

interface EventFeedProps {
  listingId?: string;
  negotiationId?: string;
  userId?: string;
  types?: EventType[];
  limit?: number;
  compact?: boolean;
  showThumbnails?: boolean;
  showPromptFilter?: boolean;
  title?: string;
  emptyMessage?: string;
  className?: string;
  autoScroll?: boolean;
}

export function EventFeed({
  listingId,
  negotiationId,
  userId,
  types,
  limit = 50,
  compact = false,
  showThumbnails = false,
  showPromptFilter = false,
  title,
  emptyMessage = 'No events yet',
  className = '',
  autoScroll = false,
}: EventFeedProps) {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [promptOnly, setPromptOnly] = useState(false);
  const [connected, setConnected] = useState(false);

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    if (listingId) params.set('listing_id', listingId);
    if (negotiationId) params.set('negotiation_id', negotiationId);
    if (userId) params.set('user_id', userId);
    if (types?.length) params.set('types', types.join(','));
    if (promptOnly) params.set('prompt_only', 'true');
    params.set('limit', limit.toString());
    return params.toString();
  }, [listingId, negotiationId, userId, types, promptOnly, limit]);

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const res = await fetch(`/api/events?${buildQueryParams()}`);
        const data = await res.json();
        setEvents(data.events || []);
      } catch (err) {
        console.error('Failed to fetch events:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitial();
  }, [buildQueryParams]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (listingId) params.set('listing_id', listingId);
    if (negotiationId) params.set('negotiation_id', negotiationId);
    if (userId) params.set('user_id', userId);

    const eventSource = new EventSource(`/api/events/stream?${params.toString()}`);

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        if (data.type === 'init') {
          if (data.events?.length > 0) {
            setEvents(data.events.reverse());
          }
          setLoading(false);
        } else if (data.type === 'event' && data.event) {
          setEvents(prev => {
            const exists = prev.some(ev => ev.id === data.event.id);
            if (exists) return prev;

            if (promptOnly && data.event.type !== 'human_input_required') {
              return prev;
            }
            if (types?.length && !types.includes(data.event.type)) {
              return prev;
            }

            const updated = [data.event, ...prev];
            return updated.slice(0, limit);
          });
        }
      } catch {
        // Ignore parse errors
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
      setConnected(false);
    };
  }, [listingId, negotiationId, userId, types, promptOnly, limit]);

  const filteredEvents = events.filter(event => {
    if (promptOnly && event.type !== 'human_input_required') return false;
    if (types?.length && !types.includes(event.type)) return false;
    return true;
  });

  const promptCount = events.filter(e => e.type === 'human_input_required').length;

  return (
    <div className={`${className}`}>
      {(title || showPromptFilter) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-sm font-medium text-bp-text">{title}</h3>
              {connected && (
                <div className="flex items-center gap-1 text-emerald-500">
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span className="text-[10px] uppercase tracking-wider">Live</span>
                </div>
              )}
            </div>
          )}
          {showPromptFilter && (
            <Button
              variant={promptOnly ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setPromptOnly(!promptOnly)}
              className="gap-1.5"
            >
              <Bell className="w-3.5 h-3.5" />
              {promptOnly ? 'Show All' : `Prompts${promptCount > 0 ? ` (${promptCount})` : ''}`}
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-bp-muted" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-8 text-bp-muted text-sm">
          {emptyMessage}
        </div>
      ) : (
        <div className={`space-y-2 ${autoScroll ? 'max-h-96 overflow-y-auto' : ''}`}>
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              compact={compact}
              showThumbnail={showThumbnails}
            />
          ))}
        </div>
      )}
    </div>
  );
}
