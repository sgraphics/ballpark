import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import type { AppEvent } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const listingId = url.searchParams.get('listing_id');
  const negotiationId = url.searchParams.get('negotiation_id');
  const userId = url.searchParams.get('user_id');

  const encoder = new TextEncoder();
  let lastEventId: string | null = null;
  let isClosing = false;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: unknown) => {
        if (isClosing) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          isClosing = true;
        }
      };

      const fetchEvents = async () => {
        if (!process.env.DATABASE_URL || isClosing) return;

        try {
          const conditions: string[] = [];
          const params: unknown[] = [];
          let paramIdx = 1;

          if (listingId) {
            conditions.push(`payload->>'listing_id' = $${paramIdx++}`);
            params.push(listingId);
          }

          if (negotiationId) {
            conditions.push(`payload->>'negotiation_id' = $${paramIdx++}`);
            params.push(negotiationId);
          }

          if (userId) {
            conditions.push(`user_id = $${paramIdx++}`);
            params.push(userId);
          }

          if (lastEventId) {
            conditions.push(`id > $${paramIdx++}`);
            params.push(lastEventId);
          }

          const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
          const sql = `SELECT * FROM events ${where} ORDER BY created_at ASC LIMIT 50`;

          const result = await query<AppEvent>(sql, params);

          if (result.rows.length > 0) {
            for (const event of result.rows) {
              sendEvent({ type: 'event', event });
              lastEventId = event.id;
            }
          }
        } catch (err) {
          console.error('Error fetching events:', err);
        }
      };

      const initialFetch = async () => {
        if (!process.env.DATABASE_URL || isClosing) {
          sendEvent({ type: 'init', events: [] });
          return;
        }

        try {
          const conditions: string[] = [];
          const params: unknown[] = [];
          let paramIdx = 1;

          if (listingId) {
            conditions.push(`payload->>'listing_id' = $${paramIdx++}`);
            params.push(listingId);
          }

          if (negotiationId) {
            conditions.push(`payload->>'negotiation_id' = $${paramIdx++}`);
            params.push(negotiationId);
          }

          if (userId) {
            conditions.push(`user_id = $${paramIdx++}`);
            params.push(userId);
          }

          const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
          const sql = `SELECT * FROM events ${where} ORDER BY created_at DESC LIMIT 50`;

          const result = await query<AppEvent>(sql, params);
          const events = result.rows.reverse();

          sendEvent({ type: 'init', events });

          if (events.length > 0) {
            lastEventId = events[events.length - 1].id;
          }
        } catch (err) {
          console.error('Error fetching initial events:', err);
          sendEvent({ type: 'init', events: [] });
        }
      };

      await initialFetch();

      const pollInterval = setInterval(() => {
        if (isClosing) {
          clearInterval(pollInterval);
          return;
        }
        fetchEvents();
      }, 2000);

      const keepaliveInterval = setInterval(() => {
        if (isClosing) {
          clearInterval(keepaliveInterval);
          return;
        }
        sendEvent({ type: 'keepalive', timestamp: Date.now() });
      }, 15000);

      req.signal.addEventListener('abort', () => {
        isClosing = true;
        clearInterval(pollInterval);
        clearInterval(keepaliveInterval);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
