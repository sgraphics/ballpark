import * as pg from 'pg';
import type { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { X509Certificate } from 'crypto';
import tls from 'tls';

declare global {
  // eslint-disable-next-line no-var
  var __ballparkPgPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __ballparkEnvLoaded: boolean | undefined;
}

function isDebugEnabled(): boolean {
  // Opt-in verbose logging. If env is missing, we log minimal hints regardless.
  return process.env.BALLPARK_DB_DEBUG === 'true';
}

function redactDatabaseUrl(url: string): string {
  // Only keep scheme + host:port + db name (no user/pass/query)
  try {
    const u = new URL(url);
    const db = (u.pathname || '').replace(/^\//, '');
    return `${u.protocol}//${u.hostname}${u.port ? `:${u.port}` : ''}/${db}`;
  } catch {
    // If it's not parseable as URL, don't leak it.
    return '<unparseable DATABASE_URL>';
  }
}

function getSslMode(databaseUrl: string): string | null {
  // Match libpq sslmode semantics.
  // https://www.postgresql.org/docs/current/libpq-ssl.html
  try {
    const u = new URL(databaseUrl);
    return u.searchParams.get('sslmode');
  } catch {
    const m = databaseUrl.match(/(?:\?|&)sslmode=([^&]+)/i);
    return m ? decodeURIComponent(m[1]) : null;
  }
}

function getHostFromDatabaseUrl(databaseUrl: string): string | null {
  try {
    const u = new URL(databaseUrl);
    return u.hostname || null;
  } catch {
    return null;
  }
}

function loadEnvOnce() {
  if (globalThis.__ballparkEnvLoaded) return;
  globalThis.__ballparkEnvLoaded = true;

  // Vercel dev runs serverless functions in a separate Node context that does NOT
  // automatically load Vite's `.env.local`. We load `.env.local`/`.env` if present.
  const candidates = ['.env.local', '.env'];

  const thisDir = path.dirname(fileURLToPath(import.meta.url)); // .../api/lib
  const repoRootFromHere = path.resolve(thisDir, '..', '..'); // .../
  const searchDirs = Array.from(new Set([process.cwd(), repoRootFromHere]));

  if (isDebugEnabled()) {
    console.log('[db] Env search dirs:', searchDirs);
  }

  for (const dir of searchDirs) {
    for (const filename of candidates) {
      const fullPath = path.resolve(dir, filename);
      const exists = fs.existsSync(fullPath);
      if (isDebugEnabled()) {
        console.log(`[db] Checking ${fullPath}: ${exists ? 'found' : 'missing'}`);
      }
      if (exists) {
        const result = dotenv.config({ path: fullPath, override: false });
        if (isDebugEnabled()) {
          console.log(`[db] Loaded ${fullPath}: ${result.error ? `error=${String(result.error)}` : 'ok'}`);
          console.log('[db] DATABASE_URL present after load:', !!process.env.DATABASE_URL);
          if (process.env.DATABASE_URL) {
            console.log('[db] DATABASE_URL (redacted):', redactDatabaseUrl(process.env.DATABASE_URL));
          }
        }
      }
    }
  }
}

function getDatabaseUrl(): string {
  loadEnvOnce();
  const url = process.env.DATABASE_URL;
  if (!url) {
    // Always log actionable hints if missing (without secrets).
    console.error('[db] DATABASE_URL is not set.');
    console.error('[db] Hint: vercel dev does not automatically load Vite env files for API routes.');
    console.error('[db] Looked for .env.local/.env in:', process.cwd(), 'and', path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'));
    throw new Error('DATABASE_URL is not set');
  }
  return url;
}

function sanitizeDatabaseUrlForPg(databaseUrl: string): string {
  // We handle sslmode ourselves via `ssl` options. `pg`'s own parsing of sslmode can
  // override/ignore our `ssl.ca` in some environments. So we strip sslmode from the
  // connectionString passed to `pg`, while keeping the rest intact.
  try {
    const u = new URL(databaseUrl);
    if (u.searchParams.has('sslmode')) {
      u.searchParams.delete('sslmode');
    }
    // Avoid trailing "?" if all params were removed.
    const s = u.toString();
    return s.endsWith('?') ? s.slice(0, -1) : s;
  } catch {
    // If URL parsing fails (non-standard DSN), leave it untouched.
    return databaseUrl;
  }
}

function getSslConfig(databaseUrl: string): any | undefined {
  // node-postgres does NOT automatically parse `sslmode=` from the connection string.
  // We implement libpq semantics:
  // - sslmode=require  => encrypt, DO NOT verify
  // - sslmode=verify-ca/verify-full => encrypt + verify (requires CA trust)
  const sslmode = (getSslMode(databaseUrl) || '').toLowerCase();
  const tlsEnabled = sslmode === 'require' || sslmode === 'verify-ca' || sslmode === 'verify-full';
  if (!tlsEnabled) return undefined;

  // Default verification behavior based on sslmode (libpq-compatible).
  let rejectUnauthorized = sslmode === 'verify-ca' || sslmode === 'verify-full';

  // Allow explicit override if user sets it.
  if (process.env.PGSSL_REJECT_UNAUTHORIZED === 'false') rejectUnauthorized = false;
  if (process.env.PGSSL_REJECT_UNAUTHORIZED === 'true') rejectUnauthorized = true;

  const host = getHostFromDatabaseUrl(databaseUrl);
  const sslOptions: any = { rejectUnauthorized };

  // Ensure SNI matches the hostname if we have it (important with proxies/tunnels).
  if (host) sslOptions.servername = host;

  if (isDebugEnabled()) {
    console.log('[db] TLS enabled (sslmode=' + sslmode + '). rejectUnauthorized=', rejectUnauthorized);
    console.log('[db] TLS servername (SNI):', sslOptions.servername || '(none)');
    console.log('[db] PGSSL_CA_FILE set:', !!process.env.PGSSL_CA_FILE);
    console.log('[db] PGSSL_CA_PEM set:', !!process.env.PGSSL_CA_PEM);
  }

  // Attach CA trust material if we're verifying.
  if (rejectUnauthorized) {
    const caPem = process.env.PGSSL_CA_PEM;
    if (caPem) {
      sslOptions.ca = caPem;
      if (isDebugEnabled()) {
        console.log('[db] Using PGSSL_CA_PEM (length):', caPem.length);
        try {
          const cert = new X509Certificate(caPem);
          console.log('[db] PGSSL_CA_PEM subject:', cert.subject);
          console.log('[db] PGSSL_CA_PEM issuer:', cert.issuer);
          console.log('[db] PGSSL_CA_PEM fingerprint256:', cert.fingerprint256);
          console.log('[db] PGSSL_CA_PEM isCA:', (cert as any).ca);
        } catch (e) {
          console.log('[db] PGSSL_CA_PEM could not be parsed as X509:', e);
        }
      }
    } else if (process.env.PGSSL_CA_FILE) {
      const caFile = process.env.PGSSL_CA_FILE;
      try {
        const resolved = path.isAbsolute(caFile) ? caFile : path.resolve(process.cwd(), caFile);
        const exists = fs.existsSync(resolved);
        if (isDebugEnabled()) {
          console.log('[db] PGSSL_CA_FILE value:', caFile);
          console.log('[db] PGSSL_CA_FILE resolved:', resolved);
          console.log('[db] PGSSL_CA_FILE exists:', exists);
        }
        const ca = fs.readFileSync(resolved, 'utf8');
        sslOptions.ca = ca;
        if (isDebugEnabled()) {
          console.log('[db] PGSSL_CA_FILE read ok (bytes):', Buffer.byteLength(ca, 'utf8'));
          try {
            const cert = new X509Certificate(ca);
            console.log('[db] PGSSL_CA_FILE subject:', cert.subject);
            console.log('[db] PGSSL_CA_FILE issuer:', cert.issuer);
            console.log('[db] PGSSL_CA_FILE fingerprint256:', cert.fingerprint256);
            console.log('[db] PGSSL_CA_FILE isCA:', (cert as any).ca);
            if (!(cert as any).ca) {
              console.log('[db] WARNING: PGSSL_CA_FILE does not appear to be a CA cert (CA:FALSE). verify-ca/verify-full will likely fail.');
            }
          } catch (e) {
            console.log('[db] PGSSL_CA_FILE contents could not be parsed as X509:', e);
          }
        }
      } catch (e) {
        console.error('[db] Failed to read PGSSL_CA_FILE:', caFile, e);
      }
    }
  }

  // For verify-ca, validate chain but DO NOT enforce hostname. For verify-full, do both.
  // We keep this logic only in debug mode to also log the peer cert.
  if (isDebugEnabled()) {
    sslOptions.checkServerIdentity = (hostname: string, cert: any) => {
      try {
        console.log('[db] Peer cert subject:', cert?.subject);
        console.log('[db] Peer cert issuer:', cert?.issuer);
        console.log('[db] Peer cert fingerprint256:', cert?.fingerprint256);
      } catch {
        // ignore
      }
      if (sslmode === 'verify-full') {
        return tls.checkServerIdentity(hostname, cert);
      }
      return undefined;
    };
  }

  return sslOptions;
}

export function getPool(): Pool {
  if (globalThis.__ballparkPgPool) return globalThis.__ballparkPgPool;

  const databaseUrl = getDatabaseUrl();
  const connectionString = sanitizeDatabaseUrlForPg(databaseUrl);
  const ssl = getSslConfig(databaseUrl);

  // `pg` is CommonJS; this import style works reliably under Node ESM (Vercel dev) too.
  const PoolCtor = (pg as any).Pool as typeof pg.Pool;

  if (isDebugEnabled()) {
    console.log('[db] Creating pg Pool. SSL enabled:', !!ssl);
    if (connectionString !== databaseUrl) {
      console.log('[db] Stripped sslmode from DATABASE_URL for pg connectionString.');
    }
    if (ssl) {
      // Don't print cert contents.
      console.log('[db] Pool SSL rejectUnauthorized:', (ssl as any).rejectUnauthorized);
      console.log('[db] Pool SSL has CA:', !!(ssl as any).ca);
    }
  }

  globalThis.__ballparkPgPool = new PoolCtor({
    connectionString,
    ssl,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  return globalThis.__ballparkPgPool;
}


