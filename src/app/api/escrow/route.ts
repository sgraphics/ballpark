import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { Escrow, Negotiation } from '@/types/database';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const negotiationId = url.searchParams.get('negotiation_id');
    const id = url.searchParams.get('id');

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (id) {
      conditions.push(`id = $${paramIdx++}`);
      params.push(id);
    }

    if (negotiationId) {
      conditions.push(`negotiation_id = $${paramIdx++}`);
      params.push(negotiationId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM escrow ${where} ORDER BY created_at DESC`;

    const result = await query<Escrow>(sql, params);
    return NextResponse.json({ escrows: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch escrow records';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { negotiation_id, item_id, tx_create } = body;

    if (!negotiation_id || !item_id) {
      return NextResponse.json(
        { error: 'negotiation_id and item_id are required' },
        { status: 400 }
      );
    }

    const contractAddress = process.env.ESCROW_CONTRACT_ADDRESS ||
      process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS || '';

    const result = await query<Escrow>(
      `INSERT INTO escrow (negotiation_id, contract_address, item_id, tx_create)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [negotiation_id, contractAddress, item_id, tx_create || null]
    );

    await query<Negotiation>(
      `UPDATE negotiations SET state = 'escrow_created', updated_at = NOW() WHERE id = $1`,
      [negotiation_id]
    );

    await query(
      `INSERT INTO events (type, payload) VALUES ($1, $2)`,
      [
        'escrow_created',
        JSON.stringify({
          negotiation_id,
          item_id,
          tx_hash: tx_create,
        }),
      ]
    );

    return NextResponse.json({ escrow: result.rows[0] }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create escrow record';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, negotiation_id, action, tx_hash } = body;

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    const validActions = ['deposit', 'confirm', 'flag', 'update_price'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    let escrowId = id;
    if (!escrowId && negotiation_id) {
      const existing = await query<Escrow>(
        'SELECT id FROM escrow WHERE negotiation_id = $1',
        [negotiation_id]
      );
      if (existing.rows.length > 0) {
        escrowId = existing.rows[0].id;
      }
    }

    if (!escrowId) {
      return NextResponse.json({ error: 'Escrow record not found' }, { status: 404 });
    }

    const columnMap: Record<string, string> = {
      deposit: 'tx_deposit',
      confirm: 'tx_confirm',
      flag: 'tx_flag',
      update_price: 'tx_update_price',
    };

    const column = columnMap[action];

    const result = await query<Escrow>(
      `UPDATE escrow SET ${column} = $1 WHERE id = $2 RETURNING *`,
      [tx_hash, escrowId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Escrow record not found' }, { status: 404 });
    }

    const escrow = result.rows[0];

    const stateMap: Record<string, string> = {
      deposit: 'funded',
      confirm: 'confirmed',
      flag: 'flagged',
      update_price: 'resolved',
    };

    const eventMap: Record<string, string> = {
      deposit: 'escrow_funded',
      confirm: 'delivery_confirmed',
      flag: 'issue_flagged',
      update_price: 'issue_resolved',
    };

    await query<Negotiation>(
      `UPDATE negotiations SET state = $1, updated_at = NOW() WHERE id = $2`,
      [stateMap[action], escrow.negotiation_id]
    );

    await query(
      `INSERT INTO events (type, payload) VALUES ($1, $2)`,
      [
        eventMap[action],
        JSON.stringify({
          negotiation_id: escrow.negotiation_id,
          item_id: escrow.item_id,
          tx_hash,
        }),
      ]
    );

    return NextResponse.json({ escrow: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update escrow record';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
