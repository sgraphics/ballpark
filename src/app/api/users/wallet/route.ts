import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { User } from '@/types/database';

/**
 * GET /api/users/wallet?user_id=...&user_ids=id1,id2
 * Returns wallet addresses for the given user ID(s).
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const singleId = url.searchParams.get('user_id');
    const multipleIds = url.searchParams.get('user_ids');

    const userIds: string[] = [];
    if (singleId) userIds.push(singleId);
    if (multipleIds) userIds.push(...multipleIds.split(',').map(s => s.trim()).filter(Boolean));

    if (userIds.length === 0) {
      return NextResponse.json(
        { error: 'user_id or user_ids query parameter is required' },
        { status: 400 }
      );
    }

    // Build parameterised query: WHERE id IN ($1, $2, ...)
    const placeholders = userIds.map((_, i) => `$${i + 1}`).join(', ');
    const result = await query<Pick<User, 'id' | 'wallet_address'>>(
      `SELECT id, wallet_address FROM users WHERE id IN (${placeholders})`,
      userIds
    );

    // Return a map of user_id -> wallet_address
    const wallets: Record<string, string | null> = {};
    for (const row of result.rows) {
      wallets[row.id] = row.wallet_address || null;
    }

    return NextResponse.json({ wallets });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch wallet addresses';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
