import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { BuyAgent } from '@/types/database';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const userId = url.searchParams.get('user_id');
    const status = url.searchParams.get('status');

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

    if (status) {
      conditions.push(`status = $${paramIdx++}`);
      params.push(status);
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
    const { user_id, name, category, filters, prompt, max_price, urgency, internal_notes } = body;

    if (!name || !category) {
      return NextResponse.json(
        { error: 'name and category are required' },
        { status: 400 }
      );
    }

    const finalUserId = authUserId || user_id || null;

    const result = await query<BuyAgent>(
      `INSERT INTO buy_agents (user_id, name, category, filters, prompt, max_price, urgency, status, internal_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        finalUserId,
        name,
        category,
        JSON.stringify(filters || {}),
        prompt || '',
        max_price || 0,
        urgency || 'medium',
        'active',
        internal_notes || '',
      ]
    );

    return NextResponse.json({ agent: result.rows[0] }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create buy agent';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const validStatuses = ['active', 'paused', 'stopped'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (status) {
      updates.push(`status = $${paramIdx++}`);
      params.push(status);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    params.push(id);
    const result = await query<BuyAgent>(
      `UPDATE buy_agents SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Buy agent not found' }, { status: 404 });
    }

    return NextResponse.json({ agent: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update buy agent';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
