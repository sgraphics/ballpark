import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { pushUpdate } from '@/lib/sse';
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

/**
 * POST: Seller creates the escrow (provides buyer wallet and agreed USDC price).
 * Transitions: negotiation state -> escrow_created, ball -> buyer
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { negotiation_id, item_id, buyer_wallet, seller_wallet, usdc_amount, tx_create } = body;

    if (!negotiation_id || !item_id) {
      return NextResponse.json(
        { error: 'negotiation_id and item_id are required' },
        { status: 400 }
      );
    }

    // Validate negotiation is in agreed state
    const negResult = await query<Negotiation>(
      'SELECT * FROM negotiations WHERE id = $1',
      [negotiation_id]
    );
    if (negResult.rows.length === 0) {
      return NextResponse.json({ error: 'Negotiation not found' }, { status: 404 });
    }
    const negotiation = negResult.rows[0];

    if (negotiation.state !== 'agreed') {
      return NextResponse.json(
        { error: `Cannot create escrow: negotiation state is "${negotiation.state}", expected "agreed"` },
        { status: 400 }
      );
    }

    const contractAddress = process.env.ESCROW_CONTRACT_ADDRESS ||
      process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS || '';

    const result = await query<Escrow>(
      `INSERT INTO escrow (negotiation_id, contract_address, item_id, buyer_wallet, seller_wallet, usdc_amount, tx_create)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [negotiation_id, contractAddress, item_id, buyer_wallet || null, seller_wallet || null, usdc_amount || negotiation.agreed_price, tx_create || null]
    );

    // Transition: state -> escrow_created, ball -> buyer (buyer must pay)
    await query<Negotiation>(
      `UPDATE negotiations SET state = 'escrow_created', ball = 'buyer', updated_at = NOW() WHERE id = $1`,
      [negotiation_id]
    );

    await query(
      `INSERT INTO events (type, payload) VALUES ($1, $2)`,
      [
        'escrow_created',
        JSON.stringify({
          negotiation_id,
          item_id,
          buyer_wallet,
          seller_wallet,
          usdc_amount: usdc_amount || negotiation.agreed_price,
          tx_hash: tx_create,
          ball: 'buyer',
        }),
      ]
    );

    // Push SSE: buyer now needs to deposit
    pushUpdate(negotiation_id, {
      type: 'update',
      negotiation: {
        id: negotiation_id,
        state: 'escrow_created',
        ball: 'buyer',
        agreed_price: negotiation.agreed_price,
      },
    });

    return NextResponse.json({ escrow: result.rows[0] }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create escrow record';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH: State transitions within escrow.
 * - deposit: buyer pays -> state=funded, ball stays buyer (buyer must confirm delivery later)
 * - confirm: buyer confirms delivery -> state=confirmed, ball=seller (done)
 * - flag:    buyer flags issue -> state=flagged
 * - update_price: resolution -> state=resolved
 */
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

    // Ball transitions:
    // deposit: buyer paid, ball stays 'buyer' (buyer must later confirm delivery)
    // confirm: buyer confirms delivery, ball -> 'seller' (seller receives funds, done)
    // flag: buyer flags issue, ball -> 'human' (needs resolution)
    // update_price: resolved, ball -> 'buyer' (may need new payment)
    const ballMap: Record<string, string> = {
      deposit: 'buyer',
      confirm: 'seller',
      flag: 'human',
      update_price: 'buyer',
    };

    const eventMap: Record<string, string> = {
      deposit: 'escrow_funded',
      confirm: 'delivery_confirmed',
      flag: 'issue_flagged',
      update_price: 'issue_resolved',
    };

    await query<Negotiation>(
      `UPDATE negotiations SET state = $1, ball = $2, updated_at = NOW() WHERE id = $3`,
      [stateMap[action], ballMap[action], escrow.negotiation_id]
    );

    await query(
      `INSERT INTO events (type, payload) VALUES ($1, $2)`,
      [
        eventMap[action],
        JSON.stringify({
          negotiation_id: escrow.negotiation_id,
          item_id: escrow.item_id,
          tx_hash,
          ball: ballMap[action],
        }),
      ]
    );

    // Push SSE update for the escrow state change
    pushUpdate(escrow.negotiation_id, {
      type: 'update',
      negotiation: {
        id: escrow.negotiation_id,
        state: stateMap[action],
        ball: ballMap[action],
      },
    });

    return NextResponse.json({ escrow: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update escrow record';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
