'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  dark?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive, dark, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl p-4 transition-all duration-150',
          dark
            ? 'bg-bp-panel border border-bp-border-dark text-white'
            : 'bg-white border border-bp-border',
          interactive && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:translate-y-0',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
