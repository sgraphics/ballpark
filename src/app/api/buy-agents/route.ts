import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { BuyAgent } from '@/types/database';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const userId = url.searchParams.get('user_id');

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (id) {
      conditions.push(`id = $${paramIdx++}`);
      params.push(id);
    }

    if (userId) {
      conditions.push(`user_id = $${paramIdx++}`);
      params.push(userId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM buy_agents ${where} ORDER BY created_at DESC`;

    const result = await query<BuyAgent>(sql, params);
    return NextResponse.json({ agents: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch buy agents';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUserId = await getUserIdFromRequest(req);
    const body = await req.json();
    const { user_id, name, category, filters, prompt, max_price, urgency } = body;

    if (!name || !category) {
      return NextResponse.json(
        { error: 'name and category are required' },
        { status: 400 }
      );
    }

    const finalUserId = authUserId || user_id || null;

    const result = await query<BuyAgent>(
      `INSERT INTO buy_agents (user_id, name, category, filters, prompt, max_price, urgency)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        finalUserId,
        name,
        category,
        JSON.stringify(filters || {}),
        prompt || '',
        max_price || 0,
        urgency || 'medium',
      ]
    );

    return NextResponse.json({ agent: result.rows[0] }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create buy agent';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
