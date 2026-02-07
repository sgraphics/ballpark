import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { Negotiation, NegMessage, ParsedMessage } from '@/types/database';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { negotiation_id, response, target } = body;

    if (!negotiation_id || !response) {
      return NextResponse.json(
        { error: 'negotiation_id and response are required' },
        { status: 400 }
      );
    }

    const negResult = await query<Negotiation>(
      'SELECT * FROM negotiations WHERE id = $1',
      [negotiation_id]
    );

    if (negResult.rows.length === 0) {
      return NextResponse.json({ error: 'Negotiation not found' }, { status: 404 });
    }

    const negotiation = negResult.rows[0];

    if (negotiation.ball !== 'human') {
      return NextResponse.json(
        { error: 'Not waiting for human input' },
        { status: 400 }
      );
    }

    const parsed: ParsedMessage = {
      answer: response,
      status_message: `Human (${target || 'user'}) responded`,
      price_proposal: null,
      concessions: [],
      user_prompt: null,
    };

    await query<NegMessage>(
      `INSERT INTO messages (negotiation_id, role, raw, parsed)
       VALUES ($1, 'human', $2, $3)`,
      [negotiation_id, response, JSON.stringify(parsed)]
    );

    const newBall = target === 'seller' ? 'seller' : 'buyer';
    await query(
      `UPDATE negotiations SET ball = $1, updated_at = NOW() WHERE id = $2`,
      [newBall, negotiation_id]
    );

    await query(
      `INSERT INTO events (type, payload) VALUES ($1, $2)`,
      [
        'human_input_required',
        JSON.stringify({
          negotiation_id,
          response: response.slice(0, 100),
        }),
      ]
    );

    return NextResponse.json({
      success: true,
      negotiation: {
        id: negotiation_id,
        ball: newBall,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to process human response';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
