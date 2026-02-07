import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

function parseConnectionString(connStr: string): { cleanUrl: string; useSsl: boolean } {
  const url = new URL(connStr);
  const sslMode = url.searchParams.get('sslmode');
  const useSsl = sslMode === 'require' || sslMode === 'verify-full' || sslMode === 'prefer';
  url.searchParams.delete('sslmode');
  return { cleanUrl: url.toString(), useSsl };
}

export function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    const { cleanUrl, useSsl } = parseConnectionString(connectionString);

    pool = new Pool({
      connectionString: cleanUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    });

    pool.on('error', (err) => {
      console.error('Unexpected pool error:', err);
    });
  }
  return pool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const client = getPool();
  return client.query<T>(text, params);
}

export async function getClient(): Promise<pg.PoolClient> {
  const p = getPool();
  return p.connect();
}

export async function transaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
