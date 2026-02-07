'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-bp-muted mb-1 font-body">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2 text-sm font-body border border-bp-border rounded-lg',
            'focus:outline-none focus:ring-2 focus:ring-bp-black/10 focus:border-bp-black transition-all',
            'placeholder:text-bp-muted-light',
            error && 'border-bp-error focus:border-bp-error focus:ring-bp-error/10',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-bp-error font-body">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
