import { NextRequest } from 'next/server';
import { createRemoteJWKSet } from 'jose';
import { query } from './db';
import { fetchWalletFromPrivy } from './privy-client';
import type { User } from '@/types/database';

let privyJWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

export function isPrivyConfigured(): boolean {
  const appId = process.env.PRIVY_APP_ID || process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  return !!(appId && appSecret);
}

function getPrivyConfig() {
  const appId = process.env.PRIVY_APP_ID || process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  const verificationKey = process.env.PRIVY_VERIFICATION_KEY;

  return { appId, appSecret, verificationKey };
}

function getPrivyJWKS(appId: string) {
  if (privyJWKS) return privyJWKS;

  const jwksUrl = new URL(`https://auth.privy.io/api/v1/apps/${appId}/jwks.json`);
  privyJWKS = createRemoteJWKSet(jwksUrl);

  return privyJWKS;
}

export interface SyncedUser {
  id: string;
  privy_id: string;
  wallet_address: string | null;
}

/**
 * Find or create a user by Privy DID. If the wallet_address is missing in the DB,
 * it is automatically fetched from the Privy API (server-side, trusted).
 */
export async function getOrCreateUser(privyId: string, walletAddress?: string): Promise<SyncedUser> {
  const existing = await query<User>(
    'SELECT id, privy_id, wallet_address FROM users WHERE privy_id = $1',
    [privyId]
  );

  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    // Back-fill wallet_address from Privy if we don't have one yet
    if (!row.wallet_address) {
      const wallet = walletAddress || await fetchWalletFromPrivy(privyId);
      if (wallet) {
        await query(
          'UPDATE users SET wallet_address = $1 WHERE id = $2',
          [wallet, row.id]
        );
        return { id: row.id, privy_id: privyId, wallet_address: wallet };
      }
    }
    return { id: row.id, privy_id: privyId, wallet_address: row.wallet_address || null };
  }

  // New user: fetch wallet from Privy if not provided by the caller
  const wallet = walletAddress || await fetchWalletFromPrivy(privyId);

  const result = await query<User>(
    'INSERT INTO users (privy_id, wallet_address) VALUES ($1, $2) RETURNING id',
    [privyId, wallet || null]
  );

  return { id: result.rows[0].id, privy_id: privyId, wallet_address: wallet || null };
}

export async function verifyPrivyToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');

  if (!token || token === 'null' || token === 'undefined') {
    return null;
  }

  const { appId, verificationKey } = getPrivyConfig();

  if (!appId) {
    console.warn('PRIVY_APP_ID not configured');
    return null;
  }

  try {
    const { verifyAccessToken } = await import('@privy-io/node');

    const verifyKey = verificationKey || getPrivyJWKS(appId);

    const verifiedClaims = await verifyAccessToken({
      access_token: token,
      app_id: appId,
      verification_key: verifyKey,
    });

    return verifiedClaims.user_id;
  } catch (err) {
    console.error('Failed to verify Privy token:', err);
    return null;
  }
}

export async function getPrivyIdFromRequest(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  return verifyPrivyToken(authHeader);
}

export async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  const privyId = await getPrivyIdFromRequest(req);
  if (!privyId) {
    return null;
  }

  try {
    const user = await getOrCreateUser(privyId);
    return user.id;
  } catch (err) {
    console.error('Failed to get or create user:', err);
    return null;
  }
}

export function requireAuth(userId: string | null, errorMessage = 'Authentication required') {
  if (!userId) {
    throw new Error(errorMessage);
  }
  return userId;
}
