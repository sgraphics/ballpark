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