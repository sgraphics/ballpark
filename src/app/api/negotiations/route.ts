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

    const enrich = url.searchParams.get('enrich') === 'true';
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    if (enrich) {
      const sql = `
        SELECT n.*,
          l.title AS listing_title,
          l.ask_price AS listing_price,
          l.hero_thumbnail_url AS listing_hero_thumbnail,
          l.image_urls AS listing_images,
          ba.name AS buy_agent_name
        FROM negotiations n
        LEFT JOIN listings l ON n.listing_id = l.id
        LEFT JOIN buy_agents ba ON n.buy_agent_id = ba.id
        ${where}
        ORDER BY n.updated_at DESC`;
      const result = await query<Negotiation>(sql, params);
      return NextResponse.json({ negotiations: result.rows });
    }

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
    const { buy_agent_id, listing_id, match_id, auto_start } = body;

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

    const negotiation = result.rows[0];

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

    const listingResult = await query<{ title: string }>(
      `SELECT title FROM listings WHERE id = $1`,
      [listing_id]
    );
    const listingTitle = listingResult.rows[0]?.title || 'Unknown';

    await query(
      `INSERT INTO events (type, payload) VALUES ($1, $2)`,
      [
        'negotiation_started',
        JSON.stringify({
          negotiation_id: negotiation.id,
          listing_id,
          listing_title: listingTitle,
          buy_agent_id,
        }),
      ]
    );

    if (auto_start) {
      try {
        const baseUrl = req.nextUrl.origin;
        await fetch(`${baseUrl}/api/orchestrate/step`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ negotiation_id: negotiation.id, auto_continue: true }),
        });
      } catch (stepErr) {
        console.error('Auto-start orchestration failed:', stepErr);
      }
    }

    return NextResponse.json({ negotiation }, { status: 201 });
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
