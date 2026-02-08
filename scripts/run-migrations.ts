/**
 * Run database migrations. Loads .env.local then .env.
 * Usage: npm run migrate   or   npx tsx scripts/run-migrations.ts
 */
import * as dotenv from 'dotenv';
import path from 'path';

const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, '.env.local') });
dotenv.config({ path: path.resolve(cwd, '.env') });

const { runMigrations } = await import('../src/lib/migrations');

const result = await runMigrations();
console.log('Applied:', result.applied.length ? result.applied : '(none)');
console.log('Skipped:', result.skipped.length ? result.skipped.length : '(none)');
process.exit(0);
