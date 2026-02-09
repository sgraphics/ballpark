import type { Metadata } from 'next';
import './globals.css';
import { PrivyProvider } from '@/providers/privy-provider';
import { SuppressExtensionErrors } from '@/components/suppress-extension-errors';

export const metadata: Metadata = {
  title: 'Ballpark - Agentic Marketplace',
  description: 'AI-powered buyer and seller agents negotiate on your behalf',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SuppressExtensionErrors />
        <PrivyProvider>{children}</PrivyProvider>
      </body>
    </html>
  );
}