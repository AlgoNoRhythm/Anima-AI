import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index';
import { createLogger } from '@anima-ai/shared';

const log = createLogger('database');

export type Database = ReturnType<typeof drizzle<typeof schema>>;

// Use globalThis to share the database singleton across all Next.js webpack
// bundles in the same Node.js process.
const g = globalThis as typeof globalThis & {
  __animaDb?: Database;
  __animaDbPool?: pg.Pool;
  __animaDbReady?: Promise<void>;
};

export function createDatabase(url?: string): Database {
  if (g.__animaDb) return g.__animaDb;

  const connectionUrl = url || process.env.DATABASE_URL;

  if (!connectionUrl) {
    throw new Error(
      'DATABASE_URL is required. Start Postgres with: docker compose -f docker/docker-compose.local.yml up -d',
    );
  }

  const pool = new pg.Pool({
    connectionString: connectionUrl,
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  g.__animaDbPool = pool;
  g.__animaDb = drizzle(pool, { schema });

  // Auto-migrate (CREATE TABLE IF NOT EXISTS is idempotent).
  // Safe to run from multiple processes — Postgres handles DDL concurrency.
  g.__animaDbReady = import('./migrate').then(({ migrate }) => migrate(g.__animaDb!)).catch((err) => {
    log.error('Auto-migrate failed', { error: err instanceof Error ? err.message : err });
    throw err;
  });

  return g.__animaDb;
}

/**
 * Wait for the database to be fully initialized (migrations complete).
 * Call this before running queries in server components / API routes.
 */
export async function waitForDb(): Promise<Database> {
  const db = createDatabase();
  if (g.__animaDbReady) {
    await g.__animaDbReady;
  }
  return db;
}

/**
 * Close the connection pool and clear the singleton.
 * Used in tests to cleanly shut down before dropping the test database.
 */
export async function closeDatabase(): Promise<void> {
  if (g.__animaDbReady) {
    await g.__animaDbReady;
  }
  if (g.__animaDbPool) {
    await g.__animaDbPool.end();
    g.__animaDbPool = undefined;
  }
  g.__animaDb = undefined;
}

export function resetDatabase(): void {
  g.__animaDb = undefined;
}
