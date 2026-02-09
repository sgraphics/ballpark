import { NextRequest, NextResponse } from 'next/server';
import { getPrivyIdFromRequest, getOrCreateUser } from '@/lib/auth';

/**
 * POST /api/auth/sync
 *
 * Called by the client immediately after Privy authentication.
 * Verifies the access token server-side, then creates or updates the
 * user record — fetching the wallet address from the Privy API
 * (never trusting client-supplied wallet data).
 *
 * Returns { user: { id, privy_id, wallet_address } }
 */
export async function POST(req: NextRequest) {
  try {
    const privyId = await getPrivyIdFromRequest(req);

    if (!privyId) {
      return NextResponse.json(
        { error: 'Invalid or missing authentication token' },
        { status: 401 }
      );
    }

    const user = await getOrCreateUser(privyId);

    return NextResponse.json({ user });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to sync user';
    console.error('[auth/sync] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
