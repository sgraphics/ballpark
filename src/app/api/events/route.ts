import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { AppEvent } from '@/types/database';

export async function GET(req: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ events: [] });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id');
    const type = url.searchParams.get('type');
    const types = url.searchParams.get('types');
    const listingId = url.searchParams.get('listing_id');
    const negotiationId = url.searchParams.get('negotiation_id');
    const promptOnly = url.searchParams.get('prompt_only') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (userId) {
      conditions.push(`user_id = $${paramIdx++}`);
      params.push(userId);
    }

    if (type) {
      conditions.push(`type = $${paramIdx++}`);
      params.push(type);
    }

    if (types) {
      const typeList = types.split(',');
      conditions.push(`type = ANY($${paramIdx++})`);
      params.push(typeList);
    }

    if (listingId) {
      conditions.push(`payload->>'listing_id' = $${paramIdx++}`);
      params.push(listingId);
    }

    if (negotiationId) {
      conditions.push(`payload->>'negotiation_id' = $${paramIdx++}`);
      params.push(negotiationId);
    }

    if (promptOnly) {
      conditions.push(`type = 'human_input_required'`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM events ${where} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx}`;
    params.push(limit, offset);

    const result = await query<AppEvent>(sql, params);
    return NextResponse.json({ events: result.rows });
  } catch (err) {
    return NextResponse.json({ events: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, type, payload } = body;

    if (!type) {
      return NextResponse.json({ error: 'type is required' }, { status: 400 });
    }

    const result = await query<AppEvent>(
      `INSERT INTO events (user_id, type, payload)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user_id || null, type, JSON.stringify(payload || {})]
    );

    return NextResponse.json({ event: result.rows[0] }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create event';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
