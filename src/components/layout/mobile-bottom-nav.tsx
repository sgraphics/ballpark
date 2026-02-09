'use client';

import {
  Activity,
  ShoppingBag,
  Bot,
  Search,
  Swords,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, type SidebarTab } from '@/store/app-store';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems: { id: SidebarTab; label: string; icon: typeof Activity; href: string }[] = [
  { id: 'feed', label: 'Feed', icon: Activity, href: '/' },
  { id: 'listings', label: 'Products', icon: ShoppingBag, href: '/listings' },
  { id: 'buy-agents', label: 'Buy', icon: Search, href: '/buy' },
  { id: 'sell-agents', label: 'Sell', icon: Bot, href: '/sell' },
  { id: 'arena', label: 'Arena', icon: Swords, href: '/arena' },
];

export function MobileBottomNav() {
  const { sidebarTab, setSidebarTab } = useAppStore();
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-bp-border z-50 safe-area-bottom">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = sidebarTab === item.id || pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setSidebarTab(item.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 transition-all duration-150',
                active
                  ? 'text-bp-black'
                  : 'text-bp-muted'
              )}
            >
              <Icon className={cn(
                'w-5 h-5 transition-all',
                active && 'scale-110'
              )} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
