import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { addConnection, removeConnection } from '@/lib/sse';
import type { Negotiation, NegMessage } from '@/types/database';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const negotiationId = params.id;

  const negResult = await query<Negotiation>(
    'SELECT * FROM negotiations WHERE id = $1',
    [negotiationId]
  );

  if (negResult.rows.length === 0) {
    return new Response('Negotiation not found', { status: 404 });
  }

  const messagesResult = await query<NegMessage>(
    'SELECT * FROM messages WHERE negotiation_id = $1 ORDER BY created_at ASC',
    [negotiationId]
  );

  const stream = new ReadableStream({
    start(controller) {
      addConnection(negotiationId, controller);

      const encoder = new TextEncoder();

      const initialData = {
        type: 'init',
        negotiation: negResult.rows[0],
        messages: messagesResult.rows,
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`));

      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          clearInterval(keepAlive);
        }
      }, 30000);

      req.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        removeConnection(negotiationId, controller);
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
