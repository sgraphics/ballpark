import { describe, it, expect } from 'vitest';
import {
  cn,
  formatPrice,
  formatEth,
  formatRelativeTime,
  truncate,
  getRoleColor,
  getStateLabel,
  getStateBadge,
  getConfidenceColor,
} from '@/lib/utils';

describe('cn (classname merge)', () => {
  it('merges string classes', () => {
    expect(cn('a', 'b')).toBe('a b');
  });
  it('handles conditionals', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });
  it('handles undefined', () => {
    expect(cn('a', undefined, 'c')).toBe('a c');
  });
});

describe('formatPrice', () => {
  it('formats whole dollar amounts', () => {
    expect(formatPrice(100)).toBe('$100');
  });
  it('formats cents', () => {
    expect(formatPrice(99.99)).toBe('$99.99');
  });
  it('formats large amounts with commas', () => {
    expect(formatPrice(1500)).toBe('$1,500');
  });
  it('formats zero', () => {
    expect(formatPrice(0)).toBe('$0');
  });
});

describe('formatEth', () => {
  it('formats wei as ETH', () => {
    expect(formatEth(BigInt('1000000000000000000'))).toBe('1.0000 ETH');
  });
  it('formats number directly', () => {
    expect(formatEth(0.5)).toBe('0.5000 ETH');
  });
});

describe('formatRelativeTime', () => {
  it('returns "just now" for recent times', () => {
    expect(formatRelativeTime(new Date())).toBe('just now');
  });
  it('returns minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatRelativeTime(fiveMinAgo)).toBe('5m ago');
  });
  it('returns hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago');
  });
  it('returns days ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(threeDaysAgo)).toBe('3d ago');
  });
});

describe('truncate', () => {
  it('returns short strings unchanged', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });
  it('truncates long strings', () => {
    expect(truncate('hello world foo', 10)).toBe('hello worl...');
  });
  it('handles exact length', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });
});

describe('getRoleColor', () => {
  it('returns buyer colors', () => {
    const c = getRoleColor('buyer_agent');
    expect(c.border).toContain('buyer');
  });
  it('returns seller colors', () => {
    const c = getRoleColor('seller_agent');
    expect(c.border).toContain('seller');
  });
  it('returns system colors for unknown', () => {
    const c = getRoleColor('unknown');
    expect(c.border).toContain('system');
  });
});

describe('getStateLabel', () => {
  it('maps negotiating', () => {
    expect(getStateLabel('negotiating')).toBe('Negotiating');
  });
  it('maps agreed', () => {
    expect(getStateLabel('agreed')).toBe('Deal Agreed');
  });
  it('returns raw for unknown', () => {
    expect(getStateLabel('xyz')).toBe('xyz');
  });
});

describe('getStateBadge', () => {
  it('returns success colors for agreed', () => {
    const b = getStateBadge('agreed');
    expect(b.bg).toContain('success');
  });
  it('returns error colors for flagged', () => {
    const b = getStateBadge('flagged');
    expect(b.bg).toContain('error');
  });
  it('returns idle default for unknown', () => {
    const b = getStateBadge('something');
    expect(b.bg).toContain('gray');
  });
});

describe('getConfidenceColor', () => {
  it('high is error', () => {
    expect(getConfidenceColor('high')).toContain('error');
  });
  it('medium is warning', () => {
    expect(getConfidenceColor('medium')).toContain('warning');
  });
  it('low is muted', () => {
    expect(getConfidenceColor('low')).toContain('muted');
  });
});
