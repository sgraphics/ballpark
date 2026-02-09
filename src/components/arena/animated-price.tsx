'use client';

import { useEffect, useRef, useState } from 'react';
import { formatPrice } from '@/lib/utils';

interface AnimatedPriceProps {
  value: number;
  className?: string;
  duration?: number;
}

/**
 * Animates a price value from its previous value to the new value
 * using a smooth counter animation.
 */
export function AnimatedPrice({ value, className = '', duration = 600 }: AnimatedPriceProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const from = previousValue.current;
    const to = value;

    if (from === to) return;

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      const current = from + (to - from) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(to);
        previousValue.current = to;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  // Detect direction of price change for flash effect
  const delta = value - previousValue.current;

  return (
    <span className={`inline-block transition-colors duration-300 ${className}`}>
      {formatPrice(Math.round(displayValue))}
      {delta !== 0 && (
        <span
          className={`absolute inset-0 rounded-lg opacity-0 animate-price-flash ${
            delta > 0 ? 'bg-cyan-500/20' : 'bg-orange-500/20'
          }`}
        />
      )}
    </span>
  );
}

interface PriceDeltaBadgeProps {
  currentPrice: number;
  previousPrice: number;
  side: 'buyer' | 'seller';
}

/**
 * Shows the price change between two consecutive offers, e.g. "+$50" or "-$25".
 */
export function PriceDeltaBadge({ currentPrice, previousPrice, side }: PriceDeltaBadgeProps) {
  const delta = currentPrice - previousPrice;
  if (delta === 0) return null;

  const isPositive = delta > 0;
  const isBuyer = side === 'buyer';

  // For buyer: going up = concession (offering more), for seller: going down = concession (accepting less)
  const isConcession = (isBuyer && isPositive) || (!isBuyer && !isPositive);

  return (
    <span
      className={`inline-flex items-center text-[9px] font-mono px-1 py-0.5 rounded animate-scale-in ${
        isConcession
          ? 'bg-emerald-500/15 text-emerald-400'
          : 'bg-red-500/15 text-red-400'
      }`}
    >
      {isPositive ? '+' : ''}{formatPrice(delta)}
    </span>
  );
}
