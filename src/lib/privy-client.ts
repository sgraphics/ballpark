import { PrivyClient } from '@privy-io/node';

let _client: PrivyClient | null = null;

/**
 * Get (or create) a singleton PrivyClient for server-side operations.
 * Returns null if Privy credentials are not configured.
 */
export function getPrivyClient(): PrivyClient | null {
  if (_client) return _client;

  const appId = process.env.PRIVY_APP_ID || process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;

  if (!appId || !appSecret) {
    return null;
  }

  _client = new PrivyClient({ appId, appSecret });
  return _client;
}

/**
 * Extract the first Ethereum wallet address from a Privy user's linked accounts.
 */
function extractEthereumWallet(
  linkedAccounts: Array<{ type: string; address?: string; chain_type?: string }>
): string | null {
  // Prefer embedded wallets (Privy-managed), then external wallets
  const embedded = linkedAccounts.find(
    (a) => a.type === 'wallet' && a.chain_type === 'ethereum' && 'wallet_client' in a && (a as Record<string, unknown>).wallet_client === 'privy'
  );
  if (embedded?.address) return embedded.address;

  const external = linkedAccounts.find(
    (a) => a.type === 'wallet' && a.chain_type === 'ethereum'
  );
  return external?.address || null;
}

/**
 * Fetch a user's Ethereum wallet address from Privy by their Privy DID.
 * Returns null if not found or Privy is not configured.
 */
export async function fetchWalletFromPrivy(privyDid: string): Promise<string | null> {
  const client = getPrivyClient();
  if (!client) return null;

  try {
    const user = await client.users()._get(privyDid);
    return extractEthereumWallet(user.linked_accounts);
  } catch (err) {
    console.error(`[privy-client] Failed to fetch wallet for ${privyDid}:`, err);
    return null;
  }
}
