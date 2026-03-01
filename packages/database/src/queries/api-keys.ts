import { eq, and } from 'drizzle-orm';
import { apiKeys } from '../schema/index';
import type { Database } from '../client';

export function apiKeyQueries(db: Database) {
  return {
    async create(data: {
      userId: string;
      provider: string;
      encryptedKey: string;
      label?: string;
    }) {
      const rows = await db.insert(apiKeys).values(data).returning();
      return rows[0]!;
    },

    async findByUserId(userId: string) {
      return db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
    },

    async findByUserAndProvider(userId: string, provider: string) {
      const rows = await db
        .select()
        .from(apiKeys)
        .where(and(eq(apiKeys.userId, userId), eq(apiKeys.provider, provider)))
        .limit(1);
      return rows[0] ?? null;
    },

    async upsertByProvider(userId: string, provider: string, encryptedKey: string, label?: string) {
      const existing = await this.findByUserAndProvider(userId, provider);
      if (existing) {
        const rows = await db
          .update(apiKeys)
          .set({ encryptedKey, label })
          .where(eq(apiKeys.id, existing.id))
          .returning();
        return rows[0]!;
      }
      return this.create({ userId, provider, encryptedKey, label });
    },

    async delete(id: string) {
      await db.delete(apiKeys).where(eq(apiKeys.id, id));
    },
  };
}
