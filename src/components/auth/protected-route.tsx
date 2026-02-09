'use client';

import { useEffect, ReactNode } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({ children, redirectTo = '/' }: ProtectedRouteProps) {
  const { ready, authenticated, login } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && !authenticated) {
      login();
    }
  }, [ready, authenticated, login, router, redirectTo]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-bp-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-bp-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="font-heading text-xl mb-2">Authentication Required</h2>
          <p className="text-sm text-bp-muted mb-4">Please sign in to continue</p>
          <button
            onClick={login}
            className="px-4 py-2 bg-bp-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
