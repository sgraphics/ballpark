import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

export function formatEth(wei: bigint | number): string {
  const eth = typeof wei === 'bigint' ? Number(wei) / 1e18 : wei;
  return `${eth.toFixed(4)} ETH`;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(date);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function getRoleColor(role: string): { border: string; bg: string; text: string } {
  const map: Record<string, { border: string; bg: string; text: string }> = {
    buyer_agent: { border: 'border-bp-buyer', bg: 'bg-bp-buyer-soft', text: 'text-bp-buyer' },
    seller_agent: { border: 'border-bp-seller', bg: 'bg-bp-seller-soft', text: 'text-bp-seller' },
    system: { border: 'border-bp-system', bg: 'bg-bp-system-soft', text: 'text-bp-system' },
    human: { border: 'border-bp-human', bg: 'bg-bp-human-soft', text: 'text-bp-human' },
  };
  return map[role] || map.system;
}

export function getStateLabel(state: string): string {
  const labels: Record<string, string> = {
    idle: 'Idle',
    negotiating: 'Negotiating',
    agreed: 'Deal Agreed',
    escrow_created: 'Escrow Created',
    funded: 'Funded',
    confirmed: 'Confirmed',
    flagged: 'Flagged',
    resolved: 'Resolved',
    draft: 'Draft',
    active: 'Active',
    sold: 'Sold',
    cancelled: 'Cancelled',
    potential: 'Potential Match',
    dismissed: 'Dismissed',
  };
  return labels[state] || state;
}

export function getStateBadge(state: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    idle: { bg: 'bg-gray-100', text: 'text-gray-700' },
    negotiating: { bg: 'bg-blue-50', text: 'text-blue-700' },
    agreed: { bg: 'bg-bp-success-soft', text: 'text-bp-success' },
    escrow_created: { bg: 'bg-bp-warning-soft', text: 'text-bp-warning' },
    funded: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    confirmed: { bg: 'bg-bp-success-soft', text: 'text-bp-success' },
    flagged: { bg: 'bg-bp-error-soft', text: 'text-bp-error' },
    resolved: { bg: 'bg-gray-100', text: 'text-gray-700' },
    draft: { bg: 'bg-gray-100', text: 'text-gray-500' },
    active: { bg: 'bg-bp-success-soft', text: 'text-bp-success' },
    sold: { bg: 'bg-blue-50', text: 'text-blue-700' },
    cancelled: { bg: 'bg-bp-error-soft', text: 'text-bp-error' },
    potential: { bg: 'bg-bp-warning-soft', text: 'text-bp-warning' },
    dismissed: { bg: 'bg-gray-100', text: 'text-gray-500' },
  };
  return map[state] || map.idle;
}

export function getConfidenceColor(c: 'high' | 'medium' | 'low'): string {
  return { high: 'text-bp-error', medium: 'text-bp-warning', low: 'text-bp-muted' }[c];
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
