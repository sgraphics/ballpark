'use client';

import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'buyer' | 'seller' | 'success' | 'warning' | 'error' | 'custom';

interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  buyer: 'bg-bp-buyer-soft text-bp-buyer',
  seller: 'bg-bp-seller-soft text-bp-seller',
  success: 'bg-bp-success-soft text-bp-success',
  warning: 'bg-bp-warning-soft text-bp-warning',
  error: 'bg-bp-error-soft text-bp-error',
  custom: '',
};

export function Badge({ variant = 'default', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-body',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
