import type { FullConfig } from '@playwright/test';
import pg from 'pg';

async function globalTeardown(_config: FullConfig) {
  console.log('E2E Global Teardown: Cleaning up test data...');

  const databaseUrl = process.env.DATABASE_URL || 'postgresql://anima:anima@localhost:5432/anima';
  const pool = new pg.Pool({ connectionString: databaseUrl });

  try {
    // Delete projects created by E2E tests (matched by slug patterns).
    // Cascading deletes clean up personalities, themes, documents, sessions, etc.
    const result = await pool.query(`
      DELETE FROM projects
      WHERE slug LIKE 'e2e-%'
         OR slug LIKE 'public-chat-%'
         OR slug LIKE 'chat-header-%'
         OR slug LIKE 'chat-input-%'
         OR slug LIKE 'chat-type-%'
         OR slug LIKE 'chat-welcome-%'
         OR slug LIKE 'chat-send-%'
         OR slug LIKE 'chat-style-%'
         OR slug LIKE 'chat-gone-%'
         OR slug LIKE 'chat-sugg-%'
         OR slug LIKE 'docs-%'
         OR slug LIKE 'personality-%'
         OR slug LIKE 'theme-%'
         OR slug LIKE 'qr-%'
         OR slug LIKE 'analytics-%'
         OR slug LIKE 'mobile-%'
    `);
    console.log(`  Deleted ${result.rowCount} test projects`);
  } catch (err) {
    console.error('  Teardown error:', err);
  } finally {
    await pool.end();
  }
}

export default globalTeardown;
