'use client';

import { useState } from 'react';
import {
  Shield,
  Wallet,
  Check,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Lock,
  Unlock,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';
import {
  isEscrowConfigured,
  mockCreateEscrow,
  mockDeposit,
  mockConfirm,
  mockFlag,
  parseEther,
} from '@/lib/escrow';
import type { Negotiation, Escrow } from '@/types/database';

interface EscrowPanelProps {
  negotiation: Negotiation;
  escrow: Escrow | null;
  listingId: string;
  buyerAddress?: string;
  isOwner: boolean;
  isBuyer: boolean;
  isAdmin: boolean;
  onEscrowCreated?: (escrow: Escrow) => void;
  onStateChange?: (state: Negotiation['state']) => void;
}

type EscrowAction = 'create' | 'deposit' | 'confirm' | 'flag' | null;

export function EscrowPanel({
  negotiation,
  escrow,
  listingId,
  buyerAddress,
  isOwner,
  isBuyer,
  isAdmin,
  onEscrowCreated,
  onStateChange,
}: EscrowPanelProps) {
  const [loading, setLoading] = useState<EscrowAction>(null);
  const [error, setError] = useState<string | null>(null);

  const configured = isEscrowConfigured();
  const state = negotiation.state;
  const agreedPrice = negotiation.agreed_price || 0;

  const handleCreateEscrow = async () => {
    if (!buyerAddress) {
      setError('Buyer address not available');
      return;
    }

    setLoading('create');
    setError(null);

    try {
      const priceWei = parseEther(agreedPrice.toString());

      const result = configured
        ? { success: true, txHash: 'pending-real-tx' }
        : await mockCreateEscrow(listingId, priceWei, buyerAddress);

      if (result.success) {
        const res = await fetch('/api/escrow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            negotiation_id: negotiation.id,
            item_id: listingId,
            tx_create: result.txHash,
          }),
        });

        const data = await res.json();
        if (data.escrow) {
          onEscrowCreated?.(data.escrow);
          onStateChange?.('escrow_created');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create escrow');
    } finally {
      setLoading(null);
    }
  };

  const handleDeposit = async () => {
    setLoading('deposit');
    setError(null);

    try {
      const priceWei = parseEther(agreedPrice.toString());

      const result = configured
        ? { success: true, txHash: 'pending-real-tx' }
        : await mockDeposit(listingId, priceWei);

      if (result.success) {
        await fetch('/api/escrow', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            negotiation_id: negotiation.id,
            action: 'deposit',
            tx_hash: result.txHash,
          }),
        });
        onStateChange?.('funded');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deposit');
    } finally {
      setLoading(null);
    }
  };

  const handleConfirm = async () => {
    setLoading('confirm');
    setError(null);

    try {
      const result = configured
        ? { success: true, txHash: 'pending-real-tx' }
        : await mockConfirm(listingId);

      if (result.success) {
        await fetch('/api/escrow', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            negotiation_id: negotiation.id,
            action: 'confirm',
            tx_hash: result.txHash,
          }),
        });
        onStateChange?.('confirmed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm');
    } finally {
      setLoading(null);
    }
  };

  const handleFlag = async () => {
    setLoading('flag');
    setError(null);

    try {
      const result = configured
        ? { success: true, txHash: 'pending-real-tx' }
        : await mockFlag(listingId);

      if (result.success) {
        await fetch('/api/escrow', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            negotiation_id: negotiation.id,
            action: 'flag',
            tx_hash: result.txHash,
          }),
        });
        onStateChange?.('flagged');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to flag issue');
    } finally {
      setLoading(null);
    }
  };

  const getStatusConfig = () => {
    switch (state) {
      case 'agreed':
        return {
          title: 'Deal Agreed',
          description: 'Waiting for seller to create escrow',
          icon: Check,
          color: 'text-emerald-500',
          bg: 'bg-emerald-50',
        };
      case 'escrow_created':
        return {
          title: 'Escrow Created',
          description: 'Waiting for buyer to deposit funds',
          icon: Lock,
          color: 'text-yellow-500',
          bg: 'bg-yellow-50',
        };
      case 'funded':
        return {
          title: 'Funds Deposited',
          description: 'Waiting for delivery confirmation',
          icon: Wallet,
          color: 'text-blue-500',
          bg: 'bg-blue-50',
        };
      case 'confirmed':
        return {
          title: 'Delivery Confirmed',
          description: 'Funds released to seller',
          icon: Unlock,
          color: 'text-emerald-500',
          bg: 'bg-emerald-50',
        };
      case 'flagged':
        return {
          title: 'Issue Flagged',
          description: 'Waiting for admin resolution',
          icon: AlertTriangle,
          color: 'text-red-500',
          bg: 'bg-red-50',
        };
      case 'resolved':
        return {
          title: 'Resolved',
          description: 'Price adjusted and funds redistributed',
          icon: Check,
          color: 'text-gray-500',
          bg: 'bg-gray-50',
        };
      default:
        return null;
    }
  };

  const statusConfig = getStatusConfig();
  if (!statusConfig) return null;

  const StatusIcon = statusConfig.icon;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-lg ${statusConfig.bg} flex items-center justify-center`}>
          <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
        </div>
        <div>
          <h3 className="font-heading text-sm font-medium">{statusConfig.title}</h3>
          <p className="text-xs text-bp-muted">{statusConfig.description}</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-bp-muted uppercase">Agreed Price</span>
          <span className="font-heading text-lg font-medium">{formatPrice(agreedPrice)}</span>
        </div>

        {!configured && (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
            Demo Mode - No real transactions
          </Badge>
        )}
      </div>

      {escrow && (
        <div className="space-y-2 mb-4 text-xs">
          {escrow.tx_create && (
            <div className="flex items-center justify-between">
              <span className="text-bp-muted">Create TX</span>
              <a
                href={`https://etherscan.io/tx/${escrow.tx_create}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-500 hover:underline"
              >
                {escrow.tx_create.slice(0, 10)}...
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
          {escrow.tx_deposit && (
            <div className="flex items-center justify-between">
              <span className="text-bp-muted">Deposit TX</span>
              <a
                href={`https://etherscan.io/tx/${escrow.tx_deposit}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-500 hover:underline"
              >
                {escrow.tx_deposit.slice(0, 10)}...
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
          {escrow.tx_confirm && (
            <div className="flex items-center justify-between">
              <span className="text-bp-muted">Confirm TX</span>
              <a
                href={`https://etherscan.io/tx/${escrow.tx_confirm}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-emerald-500 hover:underline"
              >
                {escrow.tx_confirm.slice(0, 10)}...
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
          {escrow.tx_flag && (
            <div className="flex items-center justify-between">
              <span className="text-bp-muted">Flag TX</span>
              <a
                href={`https://etherscan.io/tx/${escrow.tx_flag}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-red-500 hover:underline"
              >
                {escrow.tx_flag.slice(0, 10)}...
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 text-xs p-2 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {state === 'agreed' && isOwner && (
          <Button
            onClick={handleCreateEscrow}
            disabled={loading !== null}
            className="w-full bg-bp-seller hover:bg-bp-seller/90"
          >
            {loading === 'create' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Escrow...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Create Escrow
              </>
            )}
          </Button>
        )}

        {state === 'escrow_created' && isBuyer && (
          <Button
            onClick={handleDeposit}
            disabled={loading !== null}
            className="w-full bg-bp-buyer hover:bg-bp-buyer/90"
          >
            {loading === 'deposit' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Depositing...
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4 mr-2" />
                Deposit {formatPrice(agreedPrice)}
              </>
            )}
          </Button>
        )}

        {state === 'funded' && isBuyer && (
          <>
            <Button
              onClick={handleConfirm}
              disabled={loading !== null}
              className="w-full bg-emerald-500 hover:bg-emerald-600"
            >
              {loading === 'confirm' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Confirm Delivery
                </>
              )}
            </Button>
            <Button
              onClick={handleFlag}
              disabled={loading !== null}
              variant="secondary"
              className="w-full border-red-200 text-red-600 hover:bg-red-50"
            >
              {loading === 'flag' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Flagging...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Flag Issue
                </>
              )}
            </Button>
          </>
        )}

        {state === 'confirmed' && (
          <div className="text-center py-4">
            <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-emerald-600">Transaction Complete</p>
            <p className="text-xs text-bp-muted">Funds have been released to the seller</p>
          </div>
        )}

        {state === 'flagged' && !isAdmin && (
          <div className="text-center py-4">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-red-600">Issue Under Review</p>
            <p className="text-xs text-bp-muted">An admin will resolve this dispute</p>
          </div>
        )}

        {state === 'resolved' && (
          <div className="text-center py-4">
            <Check className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <p className="text-sm font-medium">Dispute Resolved</p>
            <p className="text-xs text-bp-muted">Price adjusted and funds redistributed</p>
          </div>
        )}
      </div>
    </Card>
  );
}
