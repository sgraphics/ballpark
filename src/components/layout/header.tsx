'use client';

import { Search, Wallet, LogIn, LogOut } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';

export function Header() {
  const { searchQuery, setSearchQuery, setCurrentUser } = useAppStore();
  const { ready, authenticated, user, login, logout } = usePrivy();

  useEffect(() => {
    if (ready && authenticated && user) {
      const walletAddress = user.wallet?.address || user.linkedAccounts?.find(
        (a) => a.type === 'wallet'
      )?.address || '';

      setCurrentUser({
        id: user.id,
        privy_id: user.id,
        wallet_address: walletAddress,
        created_at: new Date().toISOString(),
      });
    } else if (ready && !authenticated) {
      setCurrentUser(null);
    }
  }, [ready, authenticated, user, setCurrentUser]);

  const walletAddress = user?.wallet?.address || user?.linkedAccounts?.find(
    (a) => a.type === 'wallet'
  )?.address;

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