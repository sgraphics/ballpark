'use client';

import { useState, useCallback } from 'react';
import {
  Shield,
  Wallet,
  Check,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Lock,
  Unlock,
  Coins,
} from 'lucide-react';
import { useWallets } from '@privy-io/react-auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';
import {
  isEscrowConfigured,
  approveUSDC,
  depositToEscrow,
  confirmDelivery,
  flagIssue,
  parseUSDC,
  getSignerFromPrivy,
} from '@/lib/escrow';
import type { Negotiation, Escrow } from '@/types/database';

/** Base chain ID */
const BASE_CHAIN_ID = 8453;

interface EscrowPanelProps {
  negotiation: Negotiation;
  escrow: Escrow | null;
  listingId: string;
  buyerAddress?: string;
  sellerAddress?: string;
  isOwner: boolean;
  isBuyer: boolean;
  isAdmin: boolean;
  onEscrowCreated?: (escrow: Escrow) => void;
  onStateChange?: (state: Negotiation['state']) => void;
}

type EscrowAction = 'create' | 'approve' | 'deposit' | 'confirm' | 'flag' | null;

export function EscrowPanel({
  negotiation,
  escrow,
  listingId,
  buyerAddress,
  sellerAddress,
  isOwner,
  isBuyer,
  isAdmin,
  onEscrowCreated,
  onStateChange,
}: EscrowPanelProps) {
  const [loading, setLoading] = useState<EscrowAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const { wallets } = useWallets();

  const configured = isEscrowConfigured();
  const state = negotiation.state;
  const agreedPrice = negotiation.agreed_price || 0;
  const usdcAmount = escrow?.usdc_amount || agreedPrice;

  /**
   * Get an ethers.js signer from the Privy embedded wallet.
   * Ensures the wallet is switched to Base chain before returning.
   */
  const getWalletSigner = useCallback(async () => {
    const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
    if (!embeddedWallet) {
      throw new Error('No embedded wallet found — please sign in first');
    }

    // Ensure we're on Base chain
    const currentChainId = parseInt(embeddedWallet.chainId.split(':')[1] || '0', 10);
    if (currentChainId !== BASE_CHAIN_ID) {
      await embeddedWallet.switchChain(BASE_CHAIN_ID);
    }

    const provider = await embeddedWallet.getEthereumProvider();
    const signer = await getSignerFromPrivy(provider);
    if (!signer) throw new Error('Could not get signer from wallet');
    return signer;
  }, [wallets]);

  const handleCreateEscrow = async () => {
    if (!buyerAddress) {
      setError('Buyer wallet address not available');
      return;
    }

    setLoading('create');
    setError(null);

    try {
      const signer = await getWalletSigner();

      const { createEscrow } = await import('@/lib/escrow');
      const priceOnChain = parseUSDC(agreedPrice);
      const result = await createEscrow(signer, negotiation.id, priceOnChain, buyerAddress);

      const res = await fetch('/api/escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          negotiation_id: negotiation.id,
          item_id: result.contractItemId,
          buyer_wallet: buyerAddress,
          seller_wallet: sellerAddress,
          usdc_amount: agreedPrice,
          tx_create: result.txHash,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create escrow');

      if (data.escrow) {
        onEscrowCreated?.(data.escrow);
        onStateChange?.('escrow_created');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create escrow');
    } finally {
      setLoading(null);
    }
  };

  const handleApproveUSDC = async () => {
    setLoading('approve');
    setError(null);

    try {
      const signer = await getWalletSigner();
      const amount = parseUSDC(usdcAmount);
      await approveUSDC(signer, amount);
      setApproved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve USDC');
    } finally {
      setLoading(null);
    }
  };

  const handleDeposit = async () => {
    setLoading('deposit');
    setError(null);

    try {
      if (!escrow?.item_id) throw new Error('No contract item ID — escrow must be created first');

      const signer = await getWalletSigner();
      const txHash = await depositToEscrow(signer, escrow.item_id);

      const res = await fetch('/api/escrow', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          negotiation_id: negotiation.id,
          action: 'deposit',
          tx_hash: txHash,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record deposit');

      onStateChange?.('funded');
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
      if (!escrow?.item_id) throw new Error('No contract item ID — escrow must be created first');

      const signer = await getWalletSigner();
      const txHash = await confirmDelivery(signer, escrow.item_id);

      const res = await fetch('/api/escrow', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          negotiation_id: negotiation.id,
          action: 'confirm',
          tx_hash: txHash,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to confirm delivery');

      onStateChange?.('confirmed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm delivery');
    } finally {
      setLoading(null);
    }
  };

  const handleFlag = async () => {
    setLoading('flag');
    setError(null);

    try {
      if (!escrow?.item_id) throw new Error('No contract item ID — escrow must be created first');

      const signer = await getWalletSigner();
      const txHash = await flagIssue(signer, escrow.item_id);

      const res = await fetch('/api/escrow', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          negotiation_id: negotiation.id,
          action: 'flag',
          tx_hash: txHash,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to flag issue');

      onStateChange?.('flagged');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to flag issue');
    } finally {
      setLoading(null);
    }
  };

  const statusConfigs: Record<string, { title: string; description: string; icon: typeof Shield; colorClass: string; bgClass: string } | undefined> = {
    agreed: {
      title: 'Deal Agreed',
      description: 'Seller: Create escrow to proceed',
      icon: Check,
      colorClass: 'text-emerald-400',
      bgClass: 'bg-emerald-500/20',
    },
    escrow_created: {
      title: 'Escrow Created',
      description: 'Buyer: Approve & deposit USDC',
      icon: Lock,
      colorClass: 'text-cyan-400',
      bgClass: 'bg-cyan-500/20',
    },
    funded: {
      title: 'USDC Deposited',
      description: 'Buyer: Confirm delivery to release funds',
      icon: Wallet,
      colorClass: 'text-cyan-400',
      bgClass: 'bg-cyan-500/20',
    },
    confirmed: {
      title: 'Delivery Confirmed',
      description: 'Funds released to seller',
      icon: Unlock,
      colorClass: 'text-emerald-400',
      bgClass: 'bg-emerald-500/20',
    },
    flagged: {
      title: 'Issue Flagged',
      description: 'Awaiting resolution',
      icon: AlertTriangle,
      colorClass: 'text-red-400',
      bgClass: 'bg-red-500/20',
    },
    resolved: {
      title: 'Resolved',
      description: 'Dispute settled',
      icon: Check,
      colorClass: 'text-zinc-400',
      bgClass: 'bg-zinc-500/20',
    },
  };

  const statusConfig = statusConfigs[state];
  if (!statusConfig) return null;

  const StatusIcon = statusConfig.icon;

  return (
    <Card dark className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-lg ${statusConfig.bgClass} flex items-center justify-center`}>
          <StatusIcon className={`w-5 h-5 ${statusConfig.colorClass}`} />
        </div>
        <div>
          <h3 className="font-heading text-sm text-white">{statusConfig.title}</h3>
          <p className="text-xs text-zinc-500">{statusConfig.description}</p>
        </div>
      </div>

      {/* Price display */}
      <div className="bg-zinc-900 rounded-lg p-4 mb-4 border border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Agreed Price</span>
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-cyan-400" />
            <span className="font-heading text-lg font-medium text-white">
              {formatPrice(agreedPrice)} <span className="text-xs text-cyan-400">USDC</span>
            </span>
          </div>
        </div>

        {!configured && (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]">
            Escrow contract not configured
          </Badge>
        )}
      </div>

      {/* TX history */}
      {escrow && (
        <div className="space-y-2 mb-4 text-xs">
          {escrow.tx_create && (
            <TxRow label="Create TX" hash={escrow.tx_create} colorClass="text-zinc-400" />
          )}
          {escrow.tx_deposit && (
            <TxRow label="Deposit TX" hash={escrow.tx_deposit} colorClass="text-cyan-400" />
          )}
          {escrow.tx_confirm && (
            <TxRow label="Confirm TX" hash={escrow.tx_confirm} colorClass="text-emerald-400" />
          )}
          {escrow.tx_flag && (
            <TxRow label="Flag TX" hash={escrow.tx_flag} colorClass="text-red-400" />
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 text-red-400 text-xs p-2 rounded border border-red-500/20 mb-4">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {/* Seller: create escrow */}
        {state === 'agreed' && isOwner && (
          <Button
            onClick={handleCreateEscrow}
            disabled={loading !== null}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white"
          >
            {loading === 'create' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Escrow...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Create Escrow ({formatPrice(agreedPrice)} USDC)
              </>
            )}
          </Button>
        )}

        {/* Buyer: approve + deposit USDC */}
        {state === 'escrow_created' && isBuyer && (
          <>
            {!approved ? (
              <Button
                onClick={handleApproveUSDC}
                disabled={loading !== null}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-white"
              >
                {loading === 'approve' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Approving USDC...
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4 mr-2" />
                    Approve {formatPrice(usdcAmount)} USDC
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleDeposit}
                disabled={loading !== null}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-white"
              >
                {loading === 'deposit' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Depositing USDC...
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4 mr-2" />
                    Deposit {formatPrice(usdcAmount)} USDC
                  </>
                )}
              </Button>
            )}
            <p className="text-[10px] text-zinc-600 text-center">
              {!approved
                ? 'Step 1 of 2: Approve escrow contract to use your USDC'
                : 'Step 2 of 2: Send USDC to the escrow contract'}
            </p>
          </>
        )}

        {/* Buyer: confirm delivery or flag issue */}
        {state === 'funded' && isBuyer && (
          <>
            <Button
              onClick={handleConfirm}
              disabled={loading !== null}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-white"
            >
              {loading === 'confirm' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Confirm Delivery — Release Funds
                </>
              )}
            </Button>
            <Button
              onClick={handleFlag}
              disabled={loading !== null}
              variant="secondary"
              className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
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
            <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-emerald-400">Transaction Complete</p>
            <p className="text-xs text-zinc-500">Funds released to seller</p>
          </div>
        )}

        {state === 'flagged' && !isAdmin && (
          <div className="text-center py-4">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-red-400">Issue Under Review</p>
            <p className="text-xs text-zinc-500">An admin will resolve this dispute</p>
          </div>
        )}

        {state === 'resolved' && (
          <div className="text-center py-4">
            <Check className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-zinc-300">Dispute Resolved</p>
            <p className="text-xs text-zinc-500">Price adjusted and funds redistributed</p>
          </div>
        )}
      </div>
    </Card>
  );
}

function TxRow({ label, hash, colorClass }: { label: string; hash: string; colorClass: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500">{label}</span>
      <a
        href={`https://basescan.org/tx/${hash}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-1 ${colorClass} hover:underline`}
      >
        {hash.slice(0, 10)}...
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}
