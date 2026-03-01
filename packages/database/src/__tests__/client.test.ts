import { describe, it, expect } from 'vitest';
import { createDatabase, waitForDb } from '../client';
import { sql } from 'drizzle-orm';

describe('createDatabase', () => {
  it('creates a database when DATABASE_URL is set', () => {
    const db = createDatabase();
    expect(db).toBeDefined();
  });

  it('returns the same instance on subsequent calls', () => {
    const db1 = createDatabase();
    const db2 = createDatabase();
    expect(db1).toBe(db2);
  });

  it('runs migrations successfully', async () => {
    const db = await waitForDb();

    // Verify tables exist by querying information_schema
    const result = await db.execute(sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const tableNames = result.rows.map((r: Record<string, unknown>) => r.table_name);
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('projects');
    expect(tableNames).toContain('documents');
    expect(tableNames).toContain('chunks');
    expect(tableNames).toContain('personalities');
    expect(tableNames).toContain('themes');
    expect(tableNames).toContain('chat_sessions');
    expect(tableNames).toContain('messages');
    expect(tableNames).toContain('qr_codes');
    expect(tableNames).toContain('analytics_events');
    expect(tableNames).toContain('api_keys');
  });
});
