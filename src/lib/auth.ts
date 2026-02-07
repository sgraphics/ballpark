import { NextRequest } from 'next/server';

let privyClient: any = null;

async function getPrivyClient(): Promise<any | null> {
  if (privyClient) return privyClient;

  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;

  if (!appId || !appSecret) {
    console.warn('Privy credentials not configured');
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
    const user = await client.getUserByAccessToken(token);
    return user.id;
  } catch (err) {
    console.error('Failed to verify Privy token:', err);
    return null;
  }
}

export async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  return verifyPrivyToken(authHeader);
}

export function requireAuth(userId: string | null, errorMessage = 'Authentication required') {
  if (!userId) {
    throw new Error(errorMessage);
  }
  return userId;
}
