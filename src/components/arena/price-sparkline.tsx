'use client';

import { useMemo } from 'react';
import { formatPrice } from '@/lib/utils';

interface PricePoint {
  price: number;
  side: 'buyer' | 'seller';
  timestamp: string;
}

interface PriceSparklineProps {
  offers: PricePoint[];
  width?: number;
  height?: number;
  className?: string;
}

export function PriceSparkline({
  offers,
  width = 280,
  height = 64,
  className = '',
}: PriceSparklineProps) {
  const { buyerPoints, sellerPoints, minPrice, maxPrice, midLine } = useMemo(() => {
    if (offers.length === 0) return { buyerPoints: '', sellerPoints: '', minPrice: 0, maxPrice: 0, midLine: 0 };

    const prices = offers.map(o => o.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    const padding = { top: 8, bottom: 8, left: 4, right: 4 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const toX = (i: number, total: number) =>
      padding.left + (total <= 1 ? chartW / 2 : (i / (total - 1)) * chartW);
    const toY = (price: number) =>
      padding.top + chartH - ((price - min) / range) * chartH;

    const buyerOffers = offers
      .map((o, i) => ({ ...o, index: i }))
      .filter(o => o.side === 'buyer');
    const sellerOffers = offers
      .map((o, i) => ({ ...o, index: i }))
      .filter(o => o.side === 'seller');

    const total = offers.length;

    const bPoints = buyerOffers
      .map(o => `${toX(o.index, total).toFixed(1)},${toY(o.price).toFixed(1)}`)
      .join(' ');
    const sPoints = sellerOffers
      .map(o => `${toX(o.index, total).toFixed(1)},${toY(o.price).toFixed(1)}`)
      .join(' ');

    const mid = toY((max + min) / 2);

    return { buyerPoints: bPoints, sellerPoints: sPoints, minPrice: min, maxPrice: max, midLine: mid };
  }, [offers, width, height]);

  if (offers.length < 2) return null;

  const lastBuyer = [...offers].reverse().find(o => o.side === 'buyer');
  const lastSeller = [...offers].reverse().find(o => o.side === 'seller');
  const convergenceGap = lastBuyer && lastSeller
    ? Math.abs(lastSeller.price - lastBuyer.price)
    : null;
  const firstBuyer = offers.find(o => o.side === 'buyer');
  const firstSeller = offers.find(o => o.side === 'seller');
  const initialGap = firstBuyer && firstSeller
    ? Math.abs(firstSeller.price - firstBuyer.price)
    : null;
  const isConverging = convergenceGap !== null && initialGap !== null && convergenceGap < initialGap;

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] uppercase tracking-wider text-zinc-600 font-medium">Price Convergence</span>
        {isConverging && (
          <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded font-medium animate-pulse">
            CONVERGING
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        <line
          x1="4" y1={midLine} x2={width - 4} y2={midLine}
          stroke="rgba(113,113,122,0.15)" strokeDasharray="2,4"
        />

        {/* Convergence zone fill */}
        {isConverging && convergenceGap !== null && initialGap !== null && (
          <rect
            x="4" y={height * 0.25}
            width={width - 8} height={height * 0.5}
            fill="rgba(16,185,129,0.04)"
            rx="4"
          />
        )}

        {/* Seller line (orange) */}
        {sellerPoints && (
          <>
            <polyline
              points={sellerPoints}
              fill="none"
              stroke="rgba(249,115,22,0.6)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-draw-line"
            />
            {/* Seller dots */}
            {offers
              .map((o, i) => ({ ...o, index: i }))
              .filter(o => o.side === 'seller')
              .map((o) => {
                const prices = offers.map(x => x.price);
                const min = Math.min(...prices);
                const max = Math.max(...prices);
                const range = max - min || 1;
                const chartH = height - 16;
                const chartW = width - 8;
                const total = offers.length;
                const cx = 4 + (total <= 1 ? chartW / 2 : (o.index / (total - 1)) * chartW);
                const cy = 8 + chartH - ((o.price - min) / range) * chartH;
                return (
                  <circle
                    key={`s-${o.index}`}
                    cx={cx}
                    cy={cy}
                    r="3"
                    fill="rgb(249,115,22)"
                    opacity="0.8"
                  />
                );
              })}
          </>
        )}

        {/* Buyer line (cyan) */}
        {buyerPoints && (
          <>
            <polyline
              points={buyerPoints}
              fill="none"
              stroke="rgba(6,182,212,0.6)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-draw-line"
            />
            {/* Buyer dots */}
            {offers
              .map((o, i) => ({ ...o, index: i }))
              .filter(o => o.side === 'buyer')
              .map((o) => {
                const prices = offers.map(x => x.price);
                const min = Math.min(...prices);
                const max = Math.max(...prices);
                const range = max - min || 1;
                const chartH = height - 16;
                const chartW = width - 8;
                const total = offers.length;
                const cx = 4 + (total <= 1 ? chartW / 2 : (o.index / (total - 1)) * chartW);
                const cy = 8 + chartH - ((o.price - min) / range) * chartH;
                return (
                  <circle
                    key={`b-${o.index}`}
                    cx={cx}
                    cy={cy}
                    r="3"
                    fill="rgb(6,182,212)"
                    opacity="0.8"
                  />
                );
              })}
          </>
        )}
      </svg>

      {/* Price range labels */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-[9px] font-mono text-zinc-600">{formatPrice(minPrice)}</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-cyan-500 rounded-full" />
            <span className="text-[8px] text-cyan-500">BUY</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-orange-500 rounded-full" />
            <span className="text-[8px] text-orange-500">SELL</span>
          </span>
        </div>
        <span className="text-[9px] font-mono text-zinc-600">{formatPrice(maxPrice)}</span>
      </div>
    </div>
  );
}
