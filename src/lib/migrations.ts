import { query } from './db';

interface Migration {
  id: string;
  name: string;
  sql: string;
}

const migrations: Migration[] = [
  {
    id: '001',
    name: 'create_schema_migrations',
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `,
  },
  {
    id: '002',
    name: 'create_users',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        privy_id TEXT UNIQUE NOT NULL,
        wallet_address TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_users_privy ON users(privy_id);
    `,
  },
  {
    id: '003',
    name: 'create_listings',
    sql: `
      CREATE TABLE IF NOT EXISTS listings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL,
        structured JSONB DEFAULT '{}',
        ask_price NUMERIC NOT NULL,
        condition_notes JSONB DEFAULT '[]',
        haggling_ammo TEXT[] DEFAULT '{}',
        image_urls TEXT[] DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'draft',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category);
      CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
      CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(seller_user_id);
    `,
  },
  {
    id: '004',
    name: 'create_sell_agents',
    sql: `
      CREATE TABLE IF NOT EXISTS sell_agents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        listing_id UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
        name TEXT NOT NULL,
        min_price NUMERIC NOT NULL DEFAULT 0,
        urgency TEXT NOT NULL DEFAULT 'medium',
        preferences JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `,
  },
  {
    id: '005',
    name: 'create_buy_agents',
    sql: `
      CREATE TABLE IF NOT EXISTS buy_agents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        filters JSONB DEFAULT '{}',
        prompt TEXT DEFAULT '',
        max_price NUMERIC NOT NULL DEFAULT 0,
        urgency TEXT NOT NULL DEFAULT 'medium',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `,
  },
  {
    id: '006',
    name: 'create_matches',
    sql: `
      CREATE TABLE IF NOT EXISTS matches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        buy_agent_id UUID REFERENCES buy_agents(id) ON DELETE CASCADE NOT NULL,
        listing_id UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
        score NUMERIC DEFAULT 0,
        reason TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'potential',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(buy_agent_id, listing_id)
      );
    `,
  },
  {
    id: '007',
    name: 'create_negotiations',
    sql: `
      CREATE TABLE IF NOT EXISTS negotiations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        buy_agent_id UUID REFERENCES buy_agents(id) ON DELETE CASCADE NOT NULL,
        listing_id UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
        state TEXT NOT NULL DEFAULT 'idle',
        agreed_price NUMERIC,
        ball TEXT NOT NULL DEFAULT 'buyer',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(buy_agent_id, listing_id)
      );
      CREATE INDEX IF NOT EXISTS idx_negotiations_state ON negotiations(state);
    `,
  },
  {
    id: '008',
    name: 'create_messages',
    sql: `
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        negotiation_id UUID REFERENCES negotiations(id) ON DELETE CASCADE NOT NULL,
        role TEXT NOT NULL,
        raw TEXT NOT NULL DEFAULT '',
        parsed JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_messages_negotiation ON messages(negotiation_id);
    `,
  },
  {
    id: '009',
    name: 'create_events',
    sql: `
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        type TEXT NOT NULL,
        payload JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
    `,
  },
  {
    id: '010',
    name: 'create_escrows',
    sql: `
      CREATE TABLE IF NOT EXISTS escrows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        negotiation_id UUID REFERENCES negotiations(id) ON DELETE CASCADE NOT NULL UNIQUE,
        contract_address TEXT NOT NULL,
        item_id TEXT NOT NULL,
        tx_create TEXT,
        tx_deposit TEXT,
        tx_confirm TEXT,
        tx_flag TEXT,
        tx_update_price TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `,
  },
  {
    id: '011',
    name: 'add_hero_image_url',
    sql: `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'listings' AND column_name = 'hero_image_url'
        ) THEN
          ALTER TABLE listings ADD COLUMN hero_image_url TEXT;
        END IF;
      END $$;
    `,
  },
];

export async function runMigrations(): Promise<{ applied: string[]; skipped: string[] }> {
  const applied: string[] = [];
  const skipped: string[] = [];

  await query(migrations[0].sql);

  const { rows: existing } = await query<{ id: string }>(
    'SELECT id FROM schema_migrations'
  );
  const existingIds = new Set(existing.map((r) => r.id));

  for (const migration of migrations) {
    if (existingIds.has(migration.id)) {
      skipped.push(migration.name);
      continue;
    }

    await query(migration.sql);
    await query(
      'INSERT INTO schema_migrations (id, name) VALUES ($1, $2)',
      [migration.id, migration.name]
    );
    applied.push(migration.name);
  }

  return { applied, skipped };
}

export { migrations };
