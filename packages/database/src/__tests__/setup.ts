import { afterAll } from 'vitest';
import pg from 'pg';
import { closeDatabase } from '../client';

// Database tests use the same Postgres as local dev.
// Ensure Docker Postgres is running: docker compose -f docker/docker-compose.local.yml up -d

const rootUrl = process.env.DATABASE_URL || 'postgresql://anima:anima@localhost:5432/anima';
const testDbName = `anima_test_${Date.now()}`;

// Create a dedicated test database
const rootPool = new pg.Pool({ connectionString: rootUrl });
await rootPool.query(`CREATE DATABASE "${testDbName}"`);
await rootPool.end();

// Point the test suite at the test database
const url = new URL(rootUrl);
url.pathname = `/${testDbName}`;
process.env.DATABASE_URL = url.toString();

afterAll(async () => {
  // Cleanly close the pool so all connections are released
  await closeDatabase();

  const cleanupPool = new pg.Pool({ connectionString: rootUrl });
  try {
    await cleanupPool.query(`DROP DATABASE IF EXISTS "${testDbName}"`);
  } catch {
    // Best-effort cleanup
  } finally {
    await cleanupPool.end();
  }
});
