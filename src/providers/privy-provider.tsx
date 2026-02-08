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
        loginMethods: ['email', 'wallet', 'google'],
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