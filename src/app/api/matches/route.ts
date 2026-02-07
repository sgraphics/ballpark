import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { Match } from '@/types/database';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const buyAgentId = url.searchParams.get('buy_agent_id');
    const status = url.searchParams.get('status');

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (buyAgentId) {
      conditions.push(`m.buy_agent_id = $${paramIdx++}`);
      params.push(buyAgentId);
    }

    if (status) {
      conditions.push(`m.status = $${paramIdx++}`);
      params.push(status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT m.*,
        l.title as listing_title,
        l.ask_price as listing_price,
        l.image_urls as listing_images,
        l.category as listing_category,
        l.condition_notes as listing_condition_notes
      FROM matches m
      LEFT JOIN listings l ON m.listing_id = l.id
      ${where}
      ORDER BY m.score DESC, m.created_at DESC
    `;

    const result = await query(sql, params);
    return NextResponse.json({ matches: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch matches';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'id and status are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['potential', 'negotiating', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await query<Match>(
      'UPDATE matches SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    return NextResponse.json({ match: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update match';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
