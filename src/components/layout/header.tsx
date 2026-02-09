'use client';

import { Search, Wallet, LogIn, LogOut } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import { useEffect, useRef } from 'react';

export function Header() {
  const { searchQuery, setSearchQuery, setCurrentUser, currentUser } = useAppStore();
  const { ready, authenticated, user, getAccessToken, login, logout } = usePrivy();
  const syncedRef = useRef<string | null>(null);

  // On sign-in, call server to create/update user with wallet fetched from Privy API
  useEffect(() => {
    if (!ready || !authenticated || !user) {
      if (ready && !authenticated) setCurrentUser(null);
      return;
    }

    // Prevent duplicate syncs for the same Privy user
    if (syncedRef.current === user.id) return;

    let cancelled = false;

    (async () => {
      try {
        const token = await getAccessToken();
        if (!token || cancelled) return;

        const res = await fetch('/api/auth/sync', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok || cancelled) return;

        const data = await res.json();
        if (cancelled) return;

        if (data.user) {
          setCurrentUser({
            id: data.user.id,
            privy_id: data.user.privy_id,
            wallet_address: data.user.wallet_address || '',
            created_at: new Date().toISOString(),
          });
          syncedRef.current = user.id;
        }
      } catch (err) {
        console.error('[header] Auth sync failed:', err);
        // Fallback: set basic user info so the UI isn't stuck
        if (!cancelled) {
          setCurrentUser({
            id: user.id,
            privy_id: user.id,
            wallet_address: '',
            created_at: new Date().toISOString(),
          });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [ready, authenticated, user, getAccessToken, setCurrentUser]);

  const walletAddress = currentUser?.wallet_address || '';

  return (
    <header className="fixed top-0 left-60 right-0 h-14 bg-white/80 backdrop-blur-sm border-b border-bp-border z-30 flex items-center px-6 gap-4">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bp-muted" />
        <input
          type="text"
          placeholder="Search listings, agents, negotiations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm font-body border border-bp-border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-bp-black/10 focus:border-bp-black
            placeholder:text-bp-muted-light transition-all bg-gray-50/50"
        />
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {!ready ? (
          <div className="px-3 py-1.5 text-xs text-bp-muted">Loading...</div>
        ) : authenticated && walletAddress ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-bp-border">
              <Wallet className="w-3.5 h-3.5 text-bp-muted" />
              <span className="text-xs font-mono text-bp-muted">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <Button variant="primary" size="sm" onClick={login}>
            <LogIn className="w-3.5 h-3.5 mr-2" />
            Connect
          </Button>
        )}
      </div>
    </header>
  );
}