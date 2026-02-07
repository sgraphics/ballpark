import { describe, it, expect } from 'vitest';
import { migrations } from '@/lib/migrations';

describe('Migrations', () => {
  it('has all required migrations', () => {
    expect(migrations.length).toBeGreaterThanOrEqual(10);
  });

  it('all have unique ids', () => {
    const ids = migrations.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all have names', () => {
    migrations.forEach((m) => {
      expect(m.name.length).toBeGreaterThan(0);
    });
  });

  it('all have sql', () => {
    migrations.forEach((m) => {
      expect(m.sql.length).toBeGreaterThan(0);
    });
  });

  it('first migration creates schema_migrations', () => {
    expect(migrations[0].sql).toContain('schema_migrations');
  });

  it('includes users table', () => {
    const usersMig = migrations.find((m) => m.name === 'create_users');
    expect(usersMig).toBeDefined();
    expect(usersMig!.sql).toContain('privy_id');
    expect(usersMig!.sql).toContain('wallet_address');
  });

  it('includes listings table', () => {
    const m = migrations.find((m) => m.name === 'create_listings');
    expect(m).toBeDefined();
    expect(m!.sql).toContain('ask_price');
    expect(m!.sql).toContain('condition_notes');
    expect(m!.sql).toContain('image_urls');
  });

  it('includes negotiations table', () => {
    const m = migrations.find((m) => m.name === 'create_negotiations');
    expect(m).toBeDefined();
    expect(m!.sql).toContain('agreed_price');
    expect(m!.sql).toContain('ball');
  });

  it('includes messages table', () => {
    const m = migrations.find((m) => m.name === 'create_messages');
    expect(m).toBeDefined();
    expect(m!.sql).toContain('parsed');
  });

  it('includes escrows table', () => {
    const m = migrations.find((m) => m.name === 'create_escrows');
    expect(m).toBeDefined();
    expect(m!.sql).toContain('tx_create');
    expect(m!.sql).toContain('tx_deposit');
    expect(m!.sql).toContain('tx_flag');
  });

  it('migrations are in sequential order', () => {
    for (let i = 1; i < migrations.length; i++) {
      expect(Number(migrations[i].id)).toBeGreaterThan(Number(migrations[i - 1].id));
    }
  });
});
