'use client';

import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, DollarSign, Loader2, Check, RefreshCw, Lock } from 'lucide-react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import { isEscrowConfigured, mockUpdatePrice, parseUSDC } from '@/lib/escrow';
import type { Negotiation, Escrow, Listing } from '@/types/database';

interface FlaggedNegotiation {
  negotiation: Negotiation;
  escrow: Escrow | null;
  listing: Listing | null;
}

const ADMIN_WALLET = process.env.NEXT_PUBLIC_ADMIN_WALLET || '';

export default function AdminPage() {
  const [flagged, setFlagged] = useState<FlaggedNegotiation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [newPrices, setNewPrices] = useState<Record<string, string>>({});
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const walletAddress = localStorage.getItem('walletAddress') || '';
    setIsAdmin(
      walletAddress.toLowerCase() === ADMIN_WALLET.toLowerCase() ||
      process.env.NEXT_PUBLIC_DEV_MODE === 'true' ||
      !ADMIN_WALLET
    );
  }, []);

  useEffect(() => {
    fetchFlaggedNegotiations();
  }, []);

  async function fetchFlaggedNegotiations() {
    try {
      const res = await fetch('/api/negotiations?state=flagged');
      const data = await res.json();

      if (data.negotiations) {
        const enriched = await Promise.all(
          data.negotiations.map(async (neg: Negotiation) => {
            const [escrowRes, listingRes] = await Promise.all([
              fetch(`/api/escrow?negotiation_id=${neg.id}`),
              fetch(`/api/listings?id=${neg.listing_id}`),
            ]);
            const [escrowData, listingData] = await Promise.all([
              escrowRes.json(),
              listingRes.json(),
            ]);

            return {
              negotiation: neg,
              escrow: escrowData.escrows?.[0] || null,
              listing: listingData.listings?.[0] || null,
            };
          })
        );
        setFlagged(enriched);
      }
    } catch (err) {
      console.error('Failed to fetch flagged negotiations:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdatePrice = async (negotiationId: string, contractItemId: string) => {
    const newPrice = parseFloat(newPrices[negotiationId] || '0');
    if (!newPrice || newPrice <= 0) {
      return;
    }

    setActionLoading(negotiationId);

    try {
      const topay = parseUSDC(newPrice);
      const configured = isEscrowConfigured();

      const result = configured
        ? { success: true, txHash: 'pending-real-tx' }
        : await mockUpdatePrice(contractItemId, topay);

      if (result.success) {
        await fetch('/api/escrow', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            negotiation_id: negotiationId,
            action: 'update_price',
            tx_hash: result.txHash,
          }),
        });

        await fetch('/api/negotiations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: negotiationId,
            state: 'resolved',
            agreed_price: newPrice,
          }),
        });

        setFlagged(prev => prev.filter(f => f.negotiation.id !== negotiationId));
      }
    } catch (err) {
      console.error('Failed to update price:', err);
    } finally {
      setActionLoading(null);
    }
  };

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="max-w-md mx-auto text-center py-16">
          <Lock className="w-16 h-16 text-bp-muted-light mx-auto mb-4" />
          <h1 className="font-heading text-2xl mb-2">Access Denied</h1>
          <p className="text-bp-muted">
            This page is only accessible to administrators.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h1 className="font-heading text-2xl tracking-tight">Admin Panel</h1>
              <p className="text-sm text-bp-muted">Manage flagged disputes</p>
            </div>
          </div>
          <Button variant="secondary" onClick={fetchFlaggedNegotiations}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-bp-muted" />
          </div>
        ) : flagged.length === 0 ? (
          <Card className="text-center py-16">
            <Check className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h3 className="font-heading text-lg mb-2">No Flagged Disputes</h3>
            <p className="text-sm text-bp-muted">All transactions are running smoothly</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {flagged.map(({ negotiation, escrow, listing }) => (
              <Card key={negotiation.id} className="p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <h3 className="font-heading text-sm">
                        {listing?.title || 'Unknown Listing'}
                      </h3>
                      <p className="text-xs text-bp-muted">
                        Negotiation #{negotiation.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-red-100 text-red-600 border-red-200">
                    Flagged
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-[10px] text-bp-muted uppercase">Original Price</p>
                    <p className="text-sm font-medium">{formatPrice(listing?.ask_price || 0)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-bp-muted uppercase">Agreed Price</p>
                    <p className="text-sm font-medium">{formatPrice(negotiation.agreed_price || 0)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-bp-muted uppercase">Flagged</p>
                    <p className="text-xs text-bp-muted">{formatRelativeTime(negotiation.updated_at)}</p>
                  </div>
                </div>

                {escrow && (
                  <div className="mb-4 text-xs space-y-1">
                    <p className="text-bp-muted">
                      Escrow Contract: <code className="bg-gray-100 px-1 rounded">{escrow.contract_address.slice(0, 20)}...</code>
                    </p>
                    {escrow.tx_flag && (
                      <p className="text-bp-muted">
                        Flag TX: <code className="bg-gray-100 px-1 rounded">{escrow.tx_flag.slice(0, 20)}...</code>
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-bp-muted mb-1 block">New Resolved Price</label>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-bp-muted" />
                      <Input
                        type="number"
                        placeholder="Enter new price"
                        value={newPrices[negotiation.id] || ''}
                        onChange={(e) =>
                          setNewPrices(prev => ({
                            ...prev,
                            [negotiation.id]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => handleUpdatePrice(negotiation.id, escrow?.item_id || '')}
                    disabled={
                      actionLoading === negotiation.id ||
                      !newPrices[negotiation.id] ||
                      parseFloat(newPrices[negotiation.id]) <= 0
                    }
                    className="mt-5"
                  >
                    {actionLoading === negotiation.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Resolving...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Resolve Dispute
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
