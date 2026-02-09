'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Bot, ArrowRight, Clock, DollarSign, Target, TrendingDown, TrendingUp, Loader2, Crosshair, Maximize2, Minimize2, MessageSquare, Send, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import { PriceSparkline } from '@/components/arena/price-sparkline';
import { AnimatedPrice, PriceDeltaBadge } from '@/components/arena/animated-price';
import { StatusRail } from '@/components/arena/status-rail';
import { EscrowPanel } from '@/components/escrow/escrow-panel';
import type { Listing, BuyAgent, SellAgent, Negotiation, NegMessage, ParsedMessage, BallOwner, Escrow } from '@/types/database';

interface DuelArenaProps {
  listing: Listing;
  buyAgent: BuyAgent;
  sellAgent: SellAgent | null;
  negotiation: Negotiation;
  messages: NegMessage[];
  onRunStep?: () => void;
  isRunning?: boolean;
  // Human input
  onHumanResponse?: (response: string) => void;
  isSubmitting?: boolean;
  // Escrow
  escrow?: Escrow | null;
  onEscrowCreated?: (escrow: Escrow) => void;
  onStateChange?: (state: Negotiation['state']) => void;
}

function HUDCorner({ position, color = 'cyan' }: { position: 'tl' | 'tr' | 'bl' | 'br'; color?: 'cyan' | 'yellow' | 'emerald' }) {
  const positionClasses = {
    tl: 'top-0 left-0 border-t-2 border-l-2 rounded-tl-lg',
    tr: 'top-0 right-0 border-t-2 border-r-2 rounded-tr-lg',
    bl: 'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg',
    br: 'bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg',
  };

  const colorClasses = {
    cyan: 'border-cyan-500/30',
    yellow: 'border-yellow-500/30',
    emerald: 'border-emerald-500/30',
  };

  return (
    <div
      className={`absolute w-6 h-6 ${colorClasses[color]} ${positionClasses[position]}`}
    />
  );
}

function ScanLine({ color = 'cyan' }: { color?: 'cyan' | 'yellow' | 'emerald' }) {
  const gradients = {
    cyan: 'bg-[linear-gradient(transparent_50%,rgba(0,255,255,0.02)_50%)]',
    yellow: 'bg-[linear-gradient(transparent_50%,rgba(234,179,8,0.02)_50%)]',
    emerald: 'bg-[linear-gradient(transparent_50%,rgba(16,185,129,0.02)_50%)]',
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={`absolute inset-0 ${gradients[color]} bg-[length:100%_4px] animate-scan`} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Human Prompt Panel (dark HUD-themed input form)
// ---------------------------------------------------------------------------
function HumanPromptPanel({
  prompt,
  onSubmit,
  isSubmitting,
}: {
  prompt: NonNullable<ParsedMessage['user_prompt']>;
  onSubmit: (response: string) => void;
  isSubmitting?: boolean;
}) {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [freeText, setFreeText] = useState('');

  const hasChoices = Array.isArray(prompt.choices) && prompt.choices.length > 0;

  const handleSubmit = () => {
    const response = hasChoices ? selectedChoice : freeText;
    if (response) {
      onSubmit(response);
    }
  };

  const canSubmit = hasChoices ? !!selectedChoice : freeText.trim().length > 0;

  return (
    <div className="relative p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 overflow-hidden">
      <HUDCorner position="tl" color="yellow" />
      <HUDCorner position="tr" color="yellow" />
      <HUDCorner position="bl" color="yellow" />
      <HUDCorner position="br" color="yellow" />
      <ScanLine color="yellow" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="relative">
            <MessageSquare className="w-4 h-4 text-yellow-400" />
            <div className="absolute inset-0 animate-ping opacity-30">
              <MessageSquare className="w-4 h-4 text-yellow-400" />
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-yellow-400 font-medium">
            Input Required ({prompt.target})
          </span>
        </div>

        <p className="text-sm text-yellow-300/90 mb-4 leading-relaxed">{prompt.question}</p>

        {hasChoices ? (
          <div className="space-y-2 mb-4">
            {prompt.choices!.map((choice) => (
              <button
                key={choice}
                onClick={() => setSelectedChoice(choice)}
                className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                  selectedChoice === choice
                    ? 'border-yellow-500/60 bg-yellow-500/15 text-yellow-300'
                    : 'border-zinc-700/50 bg-zinc-800/30 text-zinc-300 hover:border-yellow-500/30 hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedChoice === choice
                      ? 'border-yellow-400 bg-yellow-400'
                      : 'border-zinc-600'
                  }`}>
                    {selectedChoice === choice && <Check className="w-2.5 h-2.5 text-zinc-900" />}
                  </div>
                  <span className="text-sm font-body">{choice}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="mb-4">
            <textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="Type your response..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm bg-zinc-800/40 border border-zinc-700/50 rounded-lg
                text-zinc-200 placeholder:text-zinc-600
                focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500/40
                transition-all resize-none font-body"
            />
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 overflow-hidden relative ${
            !canSubmit || isSubmitting
              ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              : 'bg-yellow-500 text-zinc-900 hover:bg-yellow-400'
          }`}
        >
          {!isSubmitting && canSubmit && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-1000" />
          )}
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="uppercase tracking-wider">Submitting...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span className="uppercase tracking-wider">Submit Response</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Offer Ladder
// ---------------------------------------------------------------------------
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

  const previousBySide = (index: number, side: 'buyer' | 'seller'): OfferCard | null => {
    for (let i = index + 1; i < offers.length; i++) {
      if (offers[i].side === side) return offers[i];
    }
    return null;
  };

  const lastBuyer = offers.find(o => o.side === 'buyer');
  const lastSeller = offers.find(o => o.side === 'seller');
  const currentGap = lastBuyer && lastSeller ? Math.abs(lastSeller.price - lastBuyer.price) : null;
  const gapPercent = lastBuyer && lastSeller && lastSeller.price > 0
    ? Math.round((Math.abs(lastSeller.price - lastBuyer.price) / lastSeller.price) * 100)
    : null;

  return (
    <div className="space-y-3">
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

      <div className="space-y-2 max-h-60 scrollbar-thin scrollbar-thumb-zinc-700">
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

// ---------------------------------------------------------------------------
// Ball Indicator
// ---------------------------------------------------------------------------
function BallIndicator({ ball, state, onRunStep, isRunning }: {
  ball: BallOwner;
  state: Negotiation['state'];
  onRunStep?: () => void;
  isRunning?: boolean;
}) {
  // Escrow-related states are handled by the EscrowPanel above the grid
  if (['agreed', 'escrow_created', 'funded', 'confirmed', 'flagged', 'resolved'].includes(state)) {
    return null;
  }

  if (ball === 'human') {
    return (
      <div className="relative flex items-center justify-center gap-3 py-4 px-6 bg-yellow-500/10 rounded-xl border border-yellow-500/30 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(234,179,8,0.1)_0%,transparent_70%)]" />
        <Clock className="w-6 h-6 text-yellow-400 animate-pulse relative z-10" />
        <div className="relative z-10">
          <span className="text-sm font-medium text-yellow-400 uppercase tracking-wider">Human Input Required</span>
          <p className="text-[10px] text-yellow-500/70">Respond in the status panel</p>
        </div>
      </div>
    );
  }

  const isBuyer = ball === 'buyer';

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

// ---------------------------------------------------------------------------
// Main Duel Arena
// ---------------------------------------------------------------------------
export function DuelArena({
  listing,
  buyAgent,
  negotiation,
  messages,
  onRunStep,
  isRunning,
  onHumanResponse,
  isSubmitting,
  escrow,
  onEscrowCreated,
  onStateChange,
}: DuelArenaProps) {
  const [mounted, setMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const arenaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fullscreen management
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      arenaRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Derived data
  const offers: OfferCard[] = messages
    .filter(m => (m.parsed as ParsedMessage).price_proposal !== null)
    .map(m => ({
      price: (m.parsed as ParsedMessage).price_proposal!,
      side: (m.role === 'buyer_agent' ? 'buyer' : 'seller') as 'buyer' | 'seller',
      timestamp: m.created_at,
      statusMessage: (m.parsed as ParsedMessage).status_message,
    }))
    .reverse();

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const pendingPrompt = negotiation.ball === 'human' && lastMessage
    ? (lastMessage.parsed as ParsedMessage).user_prompt
    : null;

  const isLive = negotiation.state === 'negotiating';
  const heroImage = listing.hero_thumbnail_url || listing.hero_image_url || listing.image_urls?.[0];

  const priceSpread = listing.ask_price - buyAgent.max_price;
  const spreadPercentage = Math.round((priceSpread / listing.ask_price) * 100);

  const showEscrow = ['agreed', 'escrow_created', 'funded', 'confirmed', 'flagged', 'resolved'].includes(negotiation.state);

  return (
    <div
      ref={arenaRef}
      className={`relative bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden transition-opacity duration-500 ${
        mounted ? 'opacity-100' : 'opacity-0'
      } ${isFullscreen ? 'rounded-none flex flex-col h-screen' : ''}`}
    >
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.05)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(249,115,22,0.05)_0%,transparent_50%)]" />

      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />

      <div className={`relative z-10 p-6 ${isFullscreen ? 'flex-1 flex flex-col overflow-hidden' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            {/* Logo — no border */}
            <div className="relative">
              <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center">
                <img src="/duel_arena_logo.png" alt="Duel Arena" className="w-full h-full object-contain" />
              </div>
              {isLive && (
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>
            {/* Hero thumbnail */}
            {heroImage && (
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-700 flex-shrink-0">
                <img src={heroImage} alt={listing.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div>
              <h2 className="font-heading text-lg text-white tracking-wide">DUEL ARENA</h2>
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
            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors border border-zinc-700"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-zinc-400" />
              ) : (
                <Maximize2 className="w-4 h-4 text-zinc-400" />
              )}
            </button>
          </div>
        </div>

        {/* 2-column layout */}
        <div className={`grid grid-cols-12 gap-4 ${isFullscreen ? 'flex-1 min-h-0' : ''}`}>
          {/* Column 1: Offer Ladder */}
          <div className={`col-span-7 ${isFullscreen ? 'flex flex-col min-h-0' : ''}`}>
            <div className={`relative bg-zinc-900/50 rounded-xl p-5 border border-zinc-800 flex flex-col backdrop-blur-sm ${isFullscreen ? 'flex-1 min-h-0' : 'h-full'}`}>
              <HUDCorner position="tl" />
              <HUDCorner position="tr" />
              <HUDCorner position="bl" />
              <HUDCorner position="br" />

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-zinc-600" />
                  <h3 className="text-xs uppercase tracking-[0.2em] text-zinc-500">Offer Ladder</h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-zinc-600 font-mono">{offers.length} OFFERS</span>
                </div>
              </div>

              {/* Price Convergence Sparkline — above offers */}
              {offers.length >= 2 && (
                <div className="mb-4 pb-4 border-b border-zinc-800/50">
                  <PriceSparkline
                    offers={offers.slice().reverse().map(o => ({
                      price: o.price,
                      side: o.side,
                      timestamp: o.timestamp,
                    }))}
                  />
                </div>
              )}

              <div className={`flex-1 min-h-0 ${isFullscreen ? 'overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700' : ''}`}>
                <OfferLadder offers={offers} agreedPrice={negotiation.agreed_price} />
              </div>

              <div className="mt-4 pt-4 border-t border-zinc-800/50">
                <BallIndicator
                  ball={negotiation.ball}
                  state={negotiation.state}
                  onRunStep={negotiation.state === 'negotiating' ? onRunStep : undefined}
                  isRunning={isRunning}
                />
              </div>
            </div>
          </div>

          {/* Column 2: Prompt + Status + Status Rail — HUD styled */}
          <div className={`col-span-5 ${isFullscreen ? 'flex flex-col min-h-0' : ''}`}>
            <div className={`relative bg-zinc-900/50 rounded-xl p-5 border border-zinc-800 flex flex-col backdrop-blur-sm ${isFullscreen ? 'flex-1 min-h-0' : 'h-full'}`}>
              <HUDCorner position="tl" />
              <HUDCorner position="tr" />
              <HUDCorner position="bl" />
              <HUDCorner position="br" />

              <div className="relative z-10 flex flex-col flex-1 min-h-0">
                {/* Escrow Panel — shown in escrow-related states */}
                {showEscrow && (
                  <div className="relative mb-4 flex-shrink-0 rounded-xl overflow-hidden">
                    <HUDCorner position="tl" color="emerald" />
                    <HUDCorner position="tr" color="emerald" />
                    <HUDCorner position="bl" color="emerald" />
                    <HUDCorner position="br" color="emerald" />
                    <EscrowPanel
                      negotiation={negotiation}
                      escrow={escrow || null}
                      listingId={listing.id}
                      isOwner={true}
                      isBuyer={true}
                      isAdmin={false}
                      onEscrowCreated={onEscrowCreated}
                      onStateChange={onStateChange}
                    />
                  </div>
                )}

                {/* Pending Prompt — full interactive form */}
                {pendingPrompt && onHumanResponse && (
                  <div className="mb-4 flex-shrink-0">
                    <HumanPromptPanel
                      prompt={pendingPrompt}
                      onSubmit={onHumanResponse}
                      isSubmitting={isSubmitting}
                    />
                  </div>
                )}

                {/* Pending Prompt summary (read-only, when no handler available) */}
                {pendingPrompt && !onHumanResponse && (
                  <div className="mb-4 p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 flex-shrink-0">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-yellow-400" />
                      <span className="text-[10px] uppercase tracking-wider text-yellow-400 font-medium">
                        Awaiting {pendingPrompt.target} response
                      </span>
                    </div>
                    <p className="text-sm text-yellow-300/70">{pendingPrompt.question}</p>
                  </div>
                )}

                {/* Live status indicator */}
                <div className="mb-3 flex items-center gap-3 px-1 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    {isLive ? (
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-75" />
                        </div>
                        <span className="text-xs uppercase tracking-wider font-medium text-emerald-400">
                          LIVE
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs uppercase tracking-wider font-medium text-zinc-500">
                        {negotiation.state.replace('_', ' ').toUpperCase()}
                      </span>
                    )}
                  </div>
                  {isRunning && (
                    <div className="flex items-center gap-1.5 ml-auto">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                      <span className="text-[10px] text-cyan-400 uppercase tracking-wider animate-pulse">
                        Processing
                      </span>
                    </div>
                  )}
                </div>

                {/* Status Rail (dark mode, scrollable) */}
                <div className={`flex-1 min-h-0 ${isFullscreen ? 'overflow-hidden' : ''}`}>
                  <StatusRail
                    messages={messages}
                    darkMode
                    showHero={false}
                    className={isFullscreen ? 'h-full' : ''}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
