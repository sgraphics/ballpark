import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { Negotiation, NegMessage, Match } from '@/types/database';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const listingId = url.searchParams.get('listing_id');
    const buyAgentId = url.searchParams.get('buy_agent_id');
    const state = url.searchParams.get('state');

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (id) {
      conditions.push(`id = $${paramIdx++}`);
      params.push(id);
    }
    if (listingId) {
      conditions.push(`listing_id = $${paramIdx++}`);
      params.push(listingId);
    }
    if (buyAgentId) {
      conditions.push(`buy_agent_id = $${paramIdx++}`);
      params.push(buyAgentId);
    }
    if (state) {
      conditions.push(`state = $${paramIdx++}`);
      params.push(state);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM negotiations ${where} ORDER BY updated_at DESC`;

    const result = await query<Negotiation>(sql, params);
    return NextResponse.json({ negotiations: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch negotiations';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { buy_agent_id, listing_id, match_id } = body;

    if (!buy_agent_id || !listing_id) {
      return NextResponse.json(
        { error: 'buy_agent_id and listing_id are required' },
        { status: 400 }
      );
    }

    const existing = await query<Negotiation>(
      `SELECT * FROM negotiations WHERE buy_agent_id = $1 AND listing_id = $2 AND state NOT IN ('confirmed', 'resolved')`,
      [buy_agent_id, listing_id]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({ negotiation: existing.rows[0] });
    }

    const result = await query<Negotiation>(
      `INSERT INTO negotiations (buy_agent_id, listing_id, state, ball)
       VALUES ($1, $2, 'negotiating', 'buyer')
       RETURNING *`,
      [buy_agent_id, listing_id]
    );

    if (match_id) {
      await query<Match>(
        `UPDATE matches SET status = 'negotiating' WHERE id = $1`,
        [match_id]
      );
    }

    await query(
      `UPDATE listings SET status = 'negotiating' WHERE id = $1 AND status = 'active'`,
      [listing_id]
    );

    return NextResponse.json({ negotiation: result.rows[0] }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create negotiation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, state, agreed_price, ball } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (state) {
      updates.push(`state = $${paramIdx++}`);
      params.push(state);
    }
    if (agreed_price !== undefined) {
      updates.push(`agreed_price = $${paramIdx++}`);
      params.push(agreed_price);
    }
    if (ball) {
      updates.push(`ball = $${paramIdx++}`);
      params.push(ball);
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const sql = `UPDATE negotiations SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`;
    const result = await query<Negotiation>(sql, params);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Negotiation not found' }, { status: 404 });
    }

    return NextResponse.json({ negotiation: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update negotiation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
