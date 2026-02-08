import { NextRequest } from 'next/server';
import { query } from './db';
import type { User } from '@/types/database';

let privyClient: any = null;

export function isPrivyConfigured(): boolean {
  const appId = process.env.PRIVY_APP_ID || process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  return !!(appId && appSecret);
}

async function getPrivyClient(): Promise<any | null> {
  if (privyClient) return privyClient;

  const appId = process.env.PRIVY_APP_ID || process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;

  if (!appId || !appSecret) {
    console.warn('Privy credentials not configured (need PRIVY_APP_ID and PRIVY_APP_SECRET)');
    return null;
  }

  try {
    const { PrivyClient } = await import('@privy-io/node');
    privyClient = new PrivyClient({ appId, appSecret });
    return privyClient;
  } catch (err) {
    console.error('Failed to initialize Privy client:', err);
    return null;
  }
}

export async function getOrCreateUser(privyId: string, walletAddress?: string): Promise<string> {
  const existing = await query<User>(
    'SELECT id, wallet_address FROM users WHERE privy_id = $1',
    [privyId]
  );

  if (existing.rows.length > 0) {
    if (walletAddress && !existing.rows[0].wallet_address) {
      await query(
        'UPDATE users SET wallet_address = $1 WHERE id = $2',
        [walletAddress, existing.rows[0].id]
      );
    }
    return existing.rows[0].id;
  }

  const result = await query<User>(
    'INSERT INTO users (privy_id, wallet_address) VALUES ($1, $2) RETURNING id',
    [privyId, walletAddress || null]
  );

  return result.rows[0].id;
}

export async function verifyPrivyToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const client = await getPrivyClient();

  if (!client) {
    return null;
  }

  try {
    const verifiedClaims = await client.utils().auth().verifyAccessToken({
      access_token: token
    });
    return verifiedClaims.userId;
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
    return await getOrCreateUser(privyId);
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
