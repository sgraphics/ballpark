# Privy Integration Patch

This document contains all file changes needed to implement basic Privy authentication.
When clicking "Connect" in the header, it will open the Privy modal and sign the user in.

---

## Files to Change

### 1. .env

Add the Privy App ID environment variable:

```
DATABASE_URL=postgresql://ballpark_user:YOUR_PASSWORD_HERE@db.bl0x.io:443/ballpark?sslmode=require

VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6eW9zZGx6bnJ0ZW5lZWZodHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMDA1MDgsImV4cCI6MjA4NTg3NjUwOH0.RkDhXLDVScV-4aQhGbvMHwgqGTNhWf03fhBnWUHSyOw
VITE_SUPABASE_URL=https://qzyosdlznrteneefhtsq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6eW9zZGx6bnJ0ZW5lZWZodHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMDA1MDgsImV4cCI6MjA4NTg3NjUwOH0.RkDhXLDVScV-4aQhGbvMHwgqGTNhWf03fhBnWUHSyOw
NEXT_PUBLIC_SUPABASE_URL=https://qzyosdlznrteneefhtsq.supabase.co

NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id-here
```

---

### 2. src/providers/privy-provider.tsx (NEW FILE)

```tsx
'use client';

import { PrivyProvider as BasePrivyProvider } from '@privy-io/react-auth';

export function PrivyProvider({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    console.warn('NEXT_PUBLIC_PRIVY_APP_ID not set, Privy auth disabled');
    return <>{children}</>;
  }

  return (
    <BasePrivyProvider
      appId={appId}
      config={{
        loginMethods: ['email', 'wallet'],
        appearance: {
          theme: 'light',
          accentColor: '#000000',
          showWalletLoginFirst: false,
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}
    >
      {children}
    </BasePrivyProvider>
  );
}
```

---

### 3. src/app/layout.tsx

```tsx
import type { Metadata } from 'next';
import './globals.css';
import { PrivyProvider } from '@/providers/privy-provider';

export const metadata: Metadata = {
  title: 'Ballpark - Agentic Marketplace',
  description: 'AI-powered buyer and seller agents negotiate on your behalf',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PrivyProvider>{children}</PrivyProvider>
      </body>
    </html>
  );
}
```

---

### 4. src/components/layout/header.tsx

```tsx
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
```

---

## Summary

1. **`.env`** - Add `NEXT_PUBLIC_PRIVY_APP_ID` environment variable
2. **`src/providers/privy-provider.tsx`** - New provider component wrapping PrivyProvider with config
3. **`src/app/layout.tsx`** - Wrap app with PrivyProvider
4. **`src/components/layout/header.tsx`** - Replace static button with Privy login/logout flow

## Notes

- The PrivyProvider gracefully handles missing `NEXT_PUBLIC_PRIVY_APP_ID` by rendering children without auth
- Embedded wallets are configured to auto-create for users without existing wallets
- User's wallet address is synced to the Zustand store when authenticated
- Login supports both email and wallet connection methods
