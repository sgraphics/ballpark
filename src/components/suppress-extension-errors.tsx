'use client';

import { useEffect } from 'react';

/**
 * Suppresses unhandled promise rejections from browser extensions (e.g. MetaMask)
 * that Next.js dev mode error overlay incorrectly surfaces as application errors.
 */
export function SuppressExtensionErrors() {
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      const message = event.reason?.message || String(event.reason || '');
      if (
        message.includes('MetaMask') ||
        message.includes('extension not found')
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);

  return null;
}
