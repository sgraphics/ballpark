'use client';

import { useEffect, useState } from 'react';
import { Bot, Zap, ArrowRight, Clock, DollarSign, Target, TrendingDown, TrendingUp, Loader2, Activity, Shield, Crosshair, Radio } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import { PriceSparkline } from '@/components/arena/price-sparkline';
import { AnimatedPrice, PriceDeltaBadge } from '@/components/arena/animated-price';
import type { Listing, BuyAgent, SellAgent, Negotiation, NegMessage, ParsedMessage, BallOwner } from '@/types/database';

interface DuelArenaProps {
  listing: Listing;
  buyAgent: BuyAgent;
  sellAgent: SellAgent | null;
  negotiation: Negotiation;
  messages: NegMessage[];
  onRunStep?: () => void;
  isRunning?: boolean;
}

function HUDCorner({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const positionClasses = {
    tl: 'top-0 left-0 border-t-2 border-l-2 rounded-tl-lg',
    tr: 'top-0 right-0 border-t-2 border-r-2 rounded-tr-lg',
    bl: 'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg',
    br: 'bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg',
  };

  return (
    <div
      className={`absolute w-6 h-6 border-cyan-500/30 ${positionClasses[position]}`}
    />
  );
}

function ScanLine() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,255,255,0.02)_50%)] bg-[length:100%_4px] animate-scan" />
    </div>
  );
}

function DataStream({ side }: { side: 'left' | 'right' }) {
  const [values, setValues] = useState<string[]>([]);

  useEffect(() => {
    const chars = '0123456789ABCDEF';
    const interval = setInterval(() => {
      setValues(prev => {
        const newVal = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        return [...prev.slice(-5), newVal];
      });
    }, 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`absolute ${side === 'left' ? 'left-2' : 'right-2'} top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-20`}>
      {values.map((v, i) => (
        <span key={i} className="text-[8px] font-mono text-cyan-400">{v}</span>
      ))}
    </div>
  );
}

function AgentPanel({
  side,
  name,
  constraints,
  urgency,
  lastMessage,
  hasBall,
}: {
  side: 'buyer' | 'seller';
  name: string;
  constraints: { label: string; value: string }[];
  urgency: string;
  lastMessage?: ParsedMessage;
  hasBall: boolean;
}) {
  const isBuyer = side === 'buyer';
  const accentColor = isBuyer ? 'cyan' : 'orange';
  const textClass = isBuyer ? 'text-cyan-400' : 'text-orange-400';
  const bgClass = isBuyer ? 'bg-cyan-500/10' : 'bg-orange-500/10';
  const borderClass = hasBall
    ? isBuyer ? 'border-cyan-500/50' : 'border-orange-500/50'
    : 'border-zinc-800';
  const glowClass = hasBall
    ? isBuyer
      ? 'shadow-[0_0_40px_rgba(6,182,212,0.15),inset_0_0_20px_rgba(6,182,212,0.05)]'
      : 'shadow-[0_0_40px_rgba(249,115,22,0.15),inset_0_0_20px_rgba(249,115,22,0.05)]'
    : '';

  return (
    <div className={`relative bg-zinc-950 rounded-xl p-5 border ${borderClass} ${glowClass} transition-all duration-500 overflow-hidden`}>
      <HUDCorner position="tl" />
      <HUDCorner position="tr" />
      <HUDCorner position="bl" />
      <HUDCorner position="br" />

      {hasBall && <ScanLine />}

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className={`relative w-12 h-12 rounded-lg ${bgClass} flex items-center justify-center`}>
            <Bot className={`w-6 h-6 ${textClass}`} />
            {hasBall && (
              <div className={`absolute inset-0 rounded-lg border ${isBuyer ? 'border-cyan-500' : 'border-orange-500'} animate-ping opacity-50`} />
            )}
          </div>
          <div className="flex-1">
            <p className={`text-[10px] uppercase tracking-[0.2em] ${textClass} font-medium`}>
              {isBuyer ? 'BUYER AGENT' : 'SELLER AGENT'}
            </p>
            <p className="font-heading text-sm text-white">{name}</p>
          </div>
        </div>

        {hasBall && (
          <div className={`mb-4 py-2 px-3 rounded-lg ${bgClass} border ${isBuyer ? 'border-cyan-500/30' : 'border-orange-500/30'} flex items-center gap-2`}>
            <Radio className={`w-3 h-3 ${textClass} animate-pulse`} />
            <span className={`text-[10px] font-medium uppercase tracking-wider ${textClass}`}>
              ACTIVE - PROCESSING
            </span>
          </div>
        )}

        <div className="space-y-2 mb-4">
          {constraints.map((c, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-zinc-600">{c.label}</span>
              <span className="text-xs text-white font-mono">{c.value}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-4 py-2 px-3 rounded-lg bg-zinc-900">
          <Zap className={`w-3.5 h-3.5 ${
            urgency === 'high' ? 'text-red-400' :
            urgency === 'medium' ? 'text-yellow-400' : 'text-zinc-600'
          }`} />
          <div className="flex-1">
            <div className="flex items-center gap-1">
              {['low', 'medium', 'high'].map((level, i) => (
                <div
                  key={level}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    (urgency === 'low' && i === 0) ||
                    (urgency === 'medium' && i <= 1) ||
                    (urgency === 'high')
                      ? urgency === 'high' ? 'bg-red-400' : urgency === 'medium' ? 'bg-yellow-400' : 'bg-zinc-500'
                      : 'bg-zinc-800'
                  }`}
                />
              ))}
            </div>
          </div>
          <span className="text-[10px] text-zinc-500 uppercase">{urgency}</span>
        </div>

        {lastMessage && (
          <div className="pt-4 border-t border-zinc-800/50">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-3 h-3 text-zinc-600" />
              <p className="text-[10px] uppercase tracking-wider text-zinc-600">Last Transmission</p>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">{lastMessage.status_message}</p>
            {lastMessage.concessions && lastMessage.concessions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {lastMessage.concessions.map((c, i) => (
                  <span key={i} className={`text-[9px] px-1.5 py-0.5 ${bgClass} rounded ${textClass}`}>
                    +{c}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface OfferCard {
  price: number;
  side: 'buyer' | 'seller';
  timestamp: string;
  statusMessage: string;
}

function OfferLadder({ offers, agreedPrice }: { offers: OfferCard[]; agreedPrice: number | null }) {
  if (offers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-zinc-600">
        <div className="relative">
          <Crosshair className="w-12 h-12 opacity-30" />
          <div className="absolute inset-0 border-2 border-dashed border-zinc-700 rounded-full animate-spin-slow" style={{ animationDuration: '8s' }} />
        </div>
        <p className="text-xs mt-4 uppercase tracking-wider">Awaiting Initial Offer</p>
      </div>
    );
  }

  // Build lookup of previous offer by same side for delta calculation
  const previousBySide = (index: number, side: 'buyer' | 'seller'): OfferCard | null => {
    // offers are in reverse chronological order (newest first),
    // so "previous by same side" means looking forward in the array
    for (let i = index + 1; i < offers.length; i++) {
      if (offers[i].side === side) return offers[i];
    }
    return null;
  };

  // Detect convergence: are buyer and seller prices getting closer?
  const lastBuyer = offers.find(o => o.side === 'buyer');
  const lastSeller = offers.find(o => o.side === 'seller');
  const currentGap = lastBuyer && lastSeller ? Math.abs(lastSeller.price - lastBuyer.price) : null;
  const gapPercent = lastBuyer && lastSeller && lastSeller.price > 0
    ? Math.round((Math.abs(lastSeller.price - lastBuyer.price) / lastSeller.price) * 100)
    : null;

  return (
    <div className="space-y-3">
      {/* Convergence indicator */}
      {currentGap !== null && gapPercent !== null && (
        <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg border transition-all duration-500 ${
          gapPercent <= 5
            ? 'bg-emerald-500/10 border-emerald-500/30 animate-glow-pulse-emerald'
            : gapPercent <= 15
              ? 'bg-yellow-500/10 border-yellow-500/20'
              : 'bg-zinc-900/50 border-zinc-800/50'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${
              gapPercent <= 5 ? 'bg-emerald-400 animate-pulse' : gapPercent <= 15 ? 'bg-yellow-400' : 'bg-zinc-600'
            }`} />
            <span className="text-[9px] uppercase tracking-wider text-zinc-500">Gap</span>
          </div>
          <span className={`text-xs font-mono font-medium ${
            gapPercent <= 5 ? 'text-emerald-400' : gapPercent <= 15 ? 'text-yellow-400' : 'text-zinc-400'
          }`}>
            {formatPrice(currentGap)} ({gapPercent}%)
          </span>
        </div>
      )}

      {/* Offer list */}
      <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
        {offers.map((offer, i) => {
          const isBuyer = offer.side === 'buyer';
          const isLatest = i === 0;
          const isAgreed = agreedPrice !== null && offer.price === agreedPrice && isLatest;
          const prev = previousBySide(i, offer.side);

          return (
            <div
              key={i}
              className={`relative flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                isAgreed
                  ? 'bg-emerald-500/20 border border-emerald-500/50'
                  : isLatest
                    ? isBuyer ? 'bg-cyan-500/10 border border-cyan-500/30' : 'bg-orange-500/10 border border-orange-500/30'
                    : 'bg-zinc-900/50 border border-zinc-800/50'
              } ${isLatest ? 'animate-slide-in-offer' : ''}`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {isLatest && !isAgreed && (
                <div className="absolute inset-0 rounded-lg overflow-hidden">
                  <div className={`absolute inset-0 ${isBuyer ? 'bg-cyan-500/5' : 'bg-orange-500/5'} animate-pulse`} />
                </div>
              )}

              <div className={`relative z-10 w-8 h-8 rounded-lg flex items-center justify-center ${
                isAgreed
                  ? 'bg-emerald-500/20'
                  : isBuyer ? 'bg-cyan-500/20' : 'bg-orange-500/20'
              }`}>
                {isAgreed ? (
                  <Target className="w-4 h-4 text-emerald-400" />
                ) : isBuyer ? (
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-orange-400" />
                )}
              </div>

              <div className="relative z-10 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-lg font-heading font-medium ${
                    isAgreed ? 'text-emerald-400' : 'text-white'
                  }`}>
                    {isLatest ? (
                      <AnimatedPrice value={offer.price} className={isAgreed ? 'text-emerald-400' : 'text-white'} />
                    ) : (
                      formatPrice(offer.price)
                    )}
                  </p>
                  {isAgreed && (
                    <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-medium animate-pulse">
                      DEAL LOCKED
                    </span>
                  )}
                  {!isAgreed && prev && (
                    <PriceDeltaBadge
                      currentPrice={offer.price}
                      previousPrice={prev.price}
                      side={offer.side}
                    />
                  )}
                </div>
                <p className="text-[10px] text-zinc-500 truncate">{offer.statusMessage}</p>
              </div>

              <div className="relative z-10 text-right">
                <span className={`text-[10px] font-medium ${isBuyer ? 'text-cyan-400' : 'text-orange-400'}`}>
                  {isBuyer ? 'BUY' : 'SELL'}
                </span>
                <p className="text-[9px] text-zinc-600">{formatRelativeTime(offer.timestamp)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BallIndicator({ ball, state, onRunStep, isRunning }: {
  ball: BallOwner;
  state: Negotiation['state'];
  onRunStep?: () => void;
  isRunning?: boolean;
}) {
  if (state === 'agreed') {
    return (
      <div className="relative flex items-center justify-center gap-3 py-4 px-6 bg-emerald-500/10 rounded-xl border border-emerald-500/30 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.1)_0%,transparent_70%)]" />
        <Shield className="w-6 h-6 text-emerald-400 relative z-10" />
        <div className="relative z-10">
          <span className="text-lg font-heading font-medium text-emerald-400">DEAL SECURED</span>
          <p className="text-[10px] text-emerald-500/70 uppercase tracking-wider">Proceed to escrow</p>
        </div>
      </div>
    );
  }

  if (ball === 'human') {
    return (
      <div className="relative flex items-center justify-center gap-3 py-4 px-6 bg-yellow-500/10 rounded-xl border border-yellow-500/30 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(234,179,8,0.1)_0%,transparent_70%)]" />
        <Clock className="w-6 h-6 text-yellow-400 animate-pulse relative z-10" />
        <div className="relative z-10">
          <span className="text-sm font-medium text-yellow-400 uppercase tracking-wider">Human Input Required</span>
          <p className="text-[10px] text-yellow-500/70">Check status rail for details</p>
        </div>
      </div>
    );
  }

  const isBuyer = ball === 'buyer';
  const accentClass = isBuyer ? 'cyan' : 'orange';

  return (
    <div className="space-y-4">
      <div className={`relative flex items-center justify-center gap-3 py-4 px-6 rounded-xl border overflow-hidden ${
        isBuyer
          ? 'bg-cyan-500/10 border-cyan-500/30'
          : 'bg-orange-500/10 border-orange-500/30'
      }`}>
        <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_center,${isBuyer ? 'rgba(6,182,212,0.1)' : 'rgba(249,115,22,0.1)'}_0%,transparent_70%)]`} />

        <div className="relative z-10 flex items-center gap-3">
          <div className={`relative w-10 h-10 rounded-full flex items-center justify-center ${
            isBuyer ? 'bg-cyan-500/20' : 'bg-orange-500/20'
          }`}>
            <div className={`absolute inset-0 rounded-full ${isBuyer ? 'border-2 border-cyan-500' : 'border-2 border-orange-500'} animate-ping opacity-30`} />
            <ArrowRight className={`w-5 h-5 ${isBuyer ? 'text-cyan-400' : 'text-orange-400'}`} />
          </div>
          <div>
            <span className={`text-sm font-medium uppercase tracking-wider ${isBuyer ? 'text-cyan-400' : 'text-orange-400'}`}>
              {isBuyer ? 'Buyer' : 'Seller'}&apos;s Turn
            </span>
            <p className="text-[10px] text-zinc-500">Waiting for agent response</p>
          </div>
        </div>
      </div>

      {onRunStep && (
        <button
          onClick={onRunStep}
          disabled={isRunning}
          className={`relative w-full py-3.5 px-6 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-3 overflow-hidden ${
            isRunning
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              : isBuyer
                ? 'bg-cyan-500 text-white hover:bg-cyan-400'
                : 'bg-orange-500 text-white hover:bg-orange-400'
          }`}
        >
          {!isRunning && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          )}
          {isRunning ? (
            <>
              <div className="relative">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <span className="uppercase tracking-wider">Processing...</span>
            </>
          ) : (
            <>
              <Bot className="w-5 h-5" />
              <span className="uppercase tracking-wider">Execute {isBuyer ? 'Buyer' : 'Seller'} Agent</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

export function DuelArena({
  listing,
  buyAgent,
  sellAgent,
  negotiation,
  messages,
  onRunStep,
  isRunning,
}: DuelArenaProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const buyerMessages = messages.filter(m => m.role === 'buyer_agent');
  const sellerMessages = messages.filter(m => m.role === 'seller_agent');

  const lastBuyerMessage = buyerMessages.length > 0
    ? buyerMessages[buyerMessages.length - 1].parsed as ParsedMessage
    : undefined;

  const lastSellerMessage = sellerMessages.length > 0
    ? sellerMessages[sellerMessages.length - 1].parsed as ParsedMessage
    : undefined;

  const offers: OfferCard[] = messages
    .filter(m => (m.parsed as ParsedMessage).price_proposal !== null)
    .map(m => ({
      price: (m.parsed as ParsedMessage).price_proposal!,
      side: (m.role === 'buyer_agent' ? 'buyer' : 'seller') as 'buyer' | 'seller',
      timestamp: m.created_at,
      statusMessage: (m.parsed as ParsedMessage).status_message,
    }))
    .reverse();

  const sellerConstraints = [
    { label: 'Ask Price', value: formatPrice(listing.ask_price) },
    { label: 'Min Accept', value: formatPrice(sellAgent?.min_price || Math.round(listing.ask_price * 0.7)) },
  ];

  const buyerConstraints = [
    { label: 'Max Budget', value: formatPrice(buyAgent.max_price) },
    { label: 'Target Cat', value: buyAgent.category.toUpperCase() },
  ];

  const priceSpread = listing.ask_price - buyAgent.max_price;
  const spreadPercentage = Math.round((priceSpread / listing.ask_price) * 100);

  return (
    <div className={`relative bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.05)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(249,115,22,0.05)_0%,transparent_50%)]" />

      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />

      <DataStream side="left" />
      <DataStream side="right" />

      <div className="relative z-10 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                <Crosshair className="w-6 h-6 text-zinc-400" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div>
              <h2 className="font-heading text-lg text-white font-medium tracking-wide">DUEL ARENA</h2>
              <p className="text-xs text-zinc-500">{listing.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-zinc-600">Price Spread</p>
              <p className={`text-sm font-mono ${spreadPercentage > 20 ? 'text-red-400' : spreadPercentage > 10 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                {spreadPercentage > 0 ? `${spreadPercentage}%` : 'ALIGNED'}
              </p>
            </div>
            <Badge
              className={`font-mono uppercase tracking-wider ${
                negotiation.state === 'agreed'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : negotiation.state === 'negotiating'
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}
            >
              {negotiation.state}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-3">
            <AgentPanel
              side="seller"
              name={sellAgent?.name || 'Auto Seller'}
              constraints={sellerConstraints}
              urgency={sellAgent?.urgency || 'medium'}
              lastMessage={lastSellerMessage}
              hasBall={negotiation.ball === 'seller'}
            />
          </div>

          <div className="col-span-6">
            <div className="relative bg-zinc-900/50 rounded-xl p-5 border border-zinc-800 h-full flex flex-col backdrop-blur-sm">
              <HUDCorner position="tl" />
              <HUDCorner position="tr" />
              <HUDCorner position="bl" />
              <HUDCorner position="br" />

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-zinc-600" />
                  <h3 className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-medium">Offer Ladder</h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-zinc-600 font-mono">{offers.length} OFFERS</span>
                </div>
              </div>

              <div className="flex-1 min-h-0">
                <OfferLadder offers={offers} agreedPrice={negotiation.agreed_price} />
              </div>

              {/* Price History Sparkline */}
              {offers.length >= 2 && (
                <div className="mt-4 pt-4 border-t border-zinc-800/50">
                  <PriceSparkline
                    offers={offers.slice().reverse().map(o => ({
                      price: o.price,
                      side: o.side,
                      timestamp: o.timestamp,
                    }))}
                  />
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-zinc-800/50">
                <BallIndicator
                  ball={negotiation.ball}
                  state={negotiation.state}
                  onRunStep={onRunStep}
                  isRunning={isRunning}
                />
              </div>
            </div>
          </div>

          <div className="col-span-3">
            <AgentPanel
              side="buyer"
              name={buyAgent.name}
              constraints={buyerConstraints}
              urgency={buyAgent.urgency}
              lastMessage={lastBuyerMessage}
              hasBall={negotiation.ball === 'buyer'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
