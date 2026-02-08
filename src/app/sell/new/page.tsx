'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { MainLayout } from '@/components/layout/main-layout';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { CreateWizard } from '@/components/sell/create-wizard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function NewSellAgentPage() {
  const router = useRouter();
  const [completed, setCompleted] = useState<{
    listing: Record<string, unknown>;
    agent: Record<string, unknown>;
  } | null>(null);

  if (completed) {
    const listingTitle = String(completed.listing?.title || 'Your listing');
    const listingId = String(completed.listing?.id || '');

    return (
      <MainLayout>
        <div className="max-w-lg mx-auto mt-16 text-center animate-scale-in">
          <div className="w-16 h-16 rounded-full bg-bp-success-soft flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-bp-success" />
          </div>
          <h1 className="font-heading text-2xl font-medium mb-2">Listing Created</h1>
          <p className="text-bp-muted mb-8">
            &ldquo;{listingTitle}&rdquo; is now live. Your sell agent is ready to negotiate.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="secondary" onClick={() => router.push('/listings')}>
              Browse Listings
            </Button>
            {listingId && (
              <Button variant="primary" onClick={() => router.push(`/listings/${listingId}`)}>
                View Listing <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="font-heading text-2xl font-light tracking-tight">New Sell Agent</h1>
            <p className="text-sm text-bp-muted mt-0.5">
              Upload photos, get AI analysis, and create your listing with an automated sell agent.
            </p>
          </div>
          <CreateWizard onComplete={setCompleted} />
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
