import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { SellAgent } from '@/types/database';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id');
    const listingId = url.searchParams.get('listing_id');

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (userId) {
      conditions.push(`user_id = $${paramIdx++}`);
      params.push(userId);
    }

    if (listingId) {
      conditions.push(`listing_id = $${paramIdx++}`);
      params.push(listingId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM sell_agents ${where} ORDER BY created_at DESC`;

    const result = await query<SellAgent>(sql, params);
    return NextResponse.json({ agents: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch sell agents';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUserId = await getUserIdFromRequest(req);
    const body = await req.json();
    const { user_id, listing_id, name, min_price, urgency, preferences } = body;

    if (!listing_id || !name) {
      return NextResponse.json(
        { error: 'listing_id and name are required' },
        { status: 400 }
      );
    }

    const finalUserId = authUserId || user_id || null;

    const result = await query<SellAgent>(
      `INSERT INTO sell_agents (user_id, listing_id, name, min_price, urgency, preferences)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        finalUserId,
        listing_id,
        name,
        min_price || 0,
        urgency || 'medium',
        JSON.stringify(preferences || {}),
      ]
    );

    return NextResponse.json({ agent: result.rows[0] }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create sell agent';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
