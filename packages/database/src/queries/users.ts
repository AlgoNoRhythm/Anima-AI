import { eq, sql } from 'drizzle-orm';
import { users } from '../schema/index';
import type { Database } from '../client';

export function userQueries(db: Database) {
  return {
    async findByEmail(email: string) {
      const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return rows[0] ?? null;
    },

    async findById(id: string) {
      const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return rows[0] ?? null;
    },

    async create(data: { email: string; name: string; passwordHash: string }) {
      const rows = await db.insert(users).values(data).returning();
      return rows[0]!;
    },

    async count() {
      const rows = await db.select({ count: sql<number>`count(*)::int` }).from(users);
      return rows[0]?.count ?? 0;
    },

    async update(id: string, data: { name?: string; passwordHash?: string }) {
      const rows = await db
        .update(users)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      return rows[0] ?? null;
    },
  };
}
