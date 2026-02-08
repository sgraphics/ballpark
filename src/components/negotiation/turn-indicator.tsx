'use client';

import { Bot, User, Clock, Loader2, CheckCircle } from 'lucide-react';
import type { BallOwner, NegotiationState } from '@/types/database';

interface TurnIndicatorProps {
  ball: BallOwner;
  state: NegotiationState;
  compact?: boolean;
  className?: string;
}

export function TurnIndicator({ ball, state, compact = false, className = '' }: TurnIndicatorProps) {
  if (state === 'agreed') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="relative">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          </div>
        </div>
        {!compact && (
          <span className="text-xs font-medium text-emerald-500">Deal Agreed</span>
        )}
      </div>
    );
  }

  if (state !== 'negotiating') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center">
          <Clock className="w-3.5 h-3.5 text-zinc-500" />
        </div>
        {!compact && (
          <span className="text-xs text-zinc-500 capitalize">{state}</span>
        )}
      </div>
    );
  }

  if (ball === 'human') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="relative">
          <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center animate-pulse">
            <User className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-amber-500/50 animate-ping" />
        </div>
        {!compact && (
          <div className="flex flex-col">
            <span className="text-xs font-medium text-amber-500">Your Input Needed</span>
            <span className="text-[10px] text-amber-500/70">Respond to continue</span>
          </div>
        )}
      </div>
    );
  }

  const isBuyer = ball === 'buyer';
  const colorClass = isBuyer ? 'cyan' : 'orange';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <div className={`w-6 h-6 rounded-full ${isBuyer ? 'bg-cyan-500/20' : 'bg-orange-500/20'} flex items-center justify-center`}>
          <Loader2 className={`w-3.5 h-3.5 ${isBuyer ? 'text-cyan-500' : 'text-orange-500'} animate-spin`} />
        </div>
        <div className={`absolute inset-0 rounded-full border-2 ${isBuyer ? 'border-cyan-500/30' : 'border-orange-500/30'} animate-pulse`} />
      </div>
      {!compact && (
        <div className="flex flex-col">
          <span className={`text-xs font-medium ${isBuyer ? 'text-cyan-500' : 'text-orange-500'}`}>
            {isBuyer ? 'Buyer' : 'Seller'} Agent
          </span>
          <span className={`text-[10px] ${isBuyer ? 'text-cyan-500/70' : 'text-orange-500/70'}`}>
            Processing...
          </span>
        </div>
      )}
    </div>
  );
}

interface TurnBadgeProps {
  ball: BallOwner;
  state: NegotiationState;
}

export function TurnBadge({ ball, state }: TurnBadgeProps) {
  if (state === 'agreed') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
        <CheckCircle className="w-3 h-3" />
        Agreed
      </span>
    );
  }

  if (state !== 'negotiating') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 capitalize">
        {state}
      </span>
    );
  }

  if (ball === 'human') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 animate-pulse">
        <User className="w-3 h-3" />
        Input Needed
      </span>
    );
  }

  const isBuyer = ball === 'buyer';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${
      isBuyer
        ? 'bg-cyan-500/10 text-cyan-600 border border-cyan-500/20'
        : 'bg-orange-500/10 text-orange-600 border border-orange-500/20'
    }`}>
      <Bot className="w-3 h-3" />
      {isBuyer ? 'Buyer' : 'Seller'} Turn
    </span>
  );
}
