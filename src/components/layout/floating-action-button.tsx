'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Bot, Search, X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={fabRef} className="md:hidden fixed bottom-20 right-4 z-40">
      {/* Action buttons */}
      <div className={cn(
        'absolute bottom-16 right-0 flex flex-col gap-3 transition-all duration-300',
        isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      )}>
        {/* New Sell Agent */}
        <Link
          href="/sell/new"
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-3 px-4 py-3 bg-white rounded-full shadow-lg border border-bp-border hover:shadow-xl transition-all group"
        >
          <span className="text-sm font-medium text-bp-seller whitespace-nowrap">New Sell Agent</span>
          <div className="w-10 h-10 rounded-full bg-bp-seller-soft flex items-center justify-center group-hover:bg-orange-100 transition-colors">
            <Bot className="w-5 h-5 text-bp-seller" />
          </div>
        </Link>

        {/* New Buy Agent */}
        <Link
          href="/buy/new"
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-3 px-4 py-3 bg-white rounded-full shadow-lg border border-bp-border hover:shadow-xl transition-all group"
        >
          <span className="text-sm font-medium text-bp-buyer whitespace-nowrap">New Buy Agent</span>
          <div className="w-10 h-10 rounded-full bg-bp-buyer-soft flex items-center justify-center group-hover:bg-blue-100 transition-colors">
            <Search className="w-5 h-5 text-bp-buyer" />
          </div>
        </Link>
      </div>

      {/* Main FAB button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300',
          isOpen
            ? 'bg-bp-black rotate-45 shadow-xl'
            : 'bg-bp-black hover:shadow-xl hover:scale-110'
        )}
        aria-label={isOpen ? 'Close menu' : 'Add new agent'}
      >
        <Plus className="w-6 h-6 text-white" />
      </button>

      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 -z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
