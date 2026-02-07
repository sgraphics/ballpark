import { usePrivy } from '@privy-io/react-auth';
import { useAppStore } from '@/store/app-store';
import { useCallback } from 'react';

export function useAuth() {
  const { ready, authenticated, user, getAccessToken } = usePrivy();
  const currentUser = useAppStore((s) => s.currentUser);

  const fetchWithAuth = useCallback(
    async (url: string, options: RequestInit = {}) => {
      if (!authenticated) {
        throw new Error('Not authenticated');
      }

      const token = await getAccessToken();
      const headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      return fetch(url, { ...options, headers });
    },
    [authenticated, getAccessToken]
  );

  return {
    ready,
    authenticated,
    user,
    currentUser,
    userId: currentUser?.privy_id || null,
    walletAddress: currentUser?.wallet_address || null,
    fetchWithAuth,
  };
}
