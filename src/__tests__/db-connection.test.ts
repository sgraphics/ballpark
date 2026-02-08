import { describe, it, expect, beforeAll } from 'vitest';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local first (real credentials), then .env as fallback
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

process.env.BALLPARK_DB_DEBUG = 'true';

describe('Database Connection Integration', () => {
  beforeAll(() => {
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('YOUR_PASSWORD_HERE')) {
      console.log('Skipping DB tests - DATABASE_URL not configured with real credentials');
    }
  });

  it('should connect to database and run a simple query', async () => {
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('YOUR_PASSWORD_HERE')) {
      console.log('SKIP: DATABASE_URL not configured');
      return;
    }

    const { query } = await import('../lib/db');

    const result = await query('SELECT 1 as test_value');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].test_value).toBe(1);
  });

  it('should be able to check for existing tables', async () => {
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('YOUR_PASSWORD_HERE')) {
      console.log('SKIP: DATABASE_URL not configured');
      return;
    }

    const { query } = await import('../lib/db');

    const result = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('Existing tables:', result.rows.map(r => r.table_name));
    expect(Array.isArray(result.rows)).toBe(true);
  });

  it('should run migrations successfully', async () => {
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('YOUR_PASSWORD_HERE')) {
      console.log('SKIP: DATABASE_URL not configured');
      return;
    }

    const { runMigrations } = await import('../lib/migrations');

    const result = await runMigrations();

    console.log('Migrations applied:', result.applied);
    console.log('Migrations skipped:', result.skipped);

    expect(result).toHaveProperty('applied');
    expect(result).toHaveProperty('skipped');
  });

  it('should have all expected tables after migrations', async () => {
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('YOUR_PASSWORD_HERE')) {
      console.log('SKIP: DATABASE_URL not configured');
      return;
    }

    const { query } = await import('../lib/db');

    const result = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const tables = result.rows.map(r => r.table_name);
    console.log('Tables after migrations:', tables);

    const expectedTables = [
      'schema_migrations',
      'users',
      'listings',
      'sell_agents',
      'buy_agents',
      'matches',
      'negotiations',
      'messages',
      'events',
      'escrows'
    ];

    for (const table of expectedTables) {
      expect(tables).toContain(table);
    }
  });
});
