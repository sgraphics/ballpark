'use client';

import {
  Activity,
  ShoppingBag,
  Bot,
  Search,
  Swords,
  Shield,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, type SidebarTab } from '@/store/app-store';
import Link from 'next/link';

const navItems: { id: SidebarTab; label: string; icon: typeof Activity; href: string }[] = [
  { id: 'feed', label: 'Feed', icon: Activity, href: '/' },
  { id: 'listings', label: 'Products', icon: ShoppingBag, href: '/listings' },
  { id: 'sell-agents', label: 'My Sell Agents', icon: Bot, href: '/sell' },
  { id: 'buy-agents', label: 'My Buy Agents', icon: Search, href: '/buy' },
  { id: 'arena', label: 'Arena', icon: Swords, href: '/arena' },
];

export function Sidebar() {
  const { sidebarTab, setSidebarTab } = useAppStore();

  return (
    <aside className="fixed left-0 top-0 w-60 h-screen bg-white border-r border-bp-border z-40 flex flex-col">
      <div className="p-5 border-b border-bp-border">
        <Link href="/" onClick={() => setSidebarTab('feed')}>
          <img
            src="/logo.png"
            alt="ballpark logo"
            className="h-6 w-auto mb-1"
            style={{ display: 'inline-block' }}
          />
          <p className="text-[10px] text-bp-muted tracking-widest uppercase mt-0.5">
            agentic marketplace
          </p>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = sidebarTab === item.id;
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setSidebarTab(item.id)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-all duration-150',
                active
                  ? 'bg-bp-black text-white'
                  : 'text-bp-muted hover:text-bp-black hover:bg-gray-50'
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 space-y-2 border-t border-bp-border">
        <Link
          href="/sell/new"
          className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-body font-medium
            bg-bp-seller-soft text-bp-seller rounded-lg hover:bg-orange-100 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Sell Agent
        </Link>
        <Link
          href="/buy/new"
          className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-body font-medium
            bg-bp-buyer-soft text-bp-buyer rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Buy Agent
        </Link>
      </div>

      <div className="p-3 border-t border-bp-border">
        <Link
          href="/admin"
          onClick={() => setSidebarTab('admin')}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-body transition-all',
            sidebarTab === 'admin'
              ? 'bg-bp-black text-white'
              : 'text-bp-muted-light hover:text-bp-muted hover:bg-gray-50'
          )}
        >
          <Shield className="w-3.5 h-3.5" />
          Admin
        </Link>
      </div>
    </aside>
  );
}
