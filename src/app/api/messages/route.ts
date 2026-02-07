import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { NegMessage } from '@/types/database';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const negotiationId = url.searchParams.get('negotiation_id');

    if (!negotiationId) {
      return NextResponse.json(
        { error: 'negotiation_id is required' },
        { status: 400 }
      );
    }

    const result = await query<NegMessage>(
      `SELECT * FROM messages WHERE negotiation_id = $1 ORDER BY created_at ASC`,
      [negotiationId]
    );

    return NextResponse.json({ messages: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch messages';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { negotiation_id, role, raw, parsed } = body;

    if (!negotiation_id || !role || !raw) {
      return NextResponse.json(
        { error: 'negotiation_id, role, and raw are required' },
        { status: 400 }
      );
    }

    const validRoles = ['buyer_agent', 'seller_agent', 'system', 'human'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await query<NegMessage>(
      `INSERT INTO messages (negotiation_id, role, raw, parsed)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [negotiation_id, role, raw, JSON.stringify(parsed || {})]
    );

    return NextResponse.json({ message: result.rows[0] }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create message';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
