import { eq } from 'drizzle-orm';
import { messages } from '../schema/index';
import type { Database } from '../client';

export function messageQueries(db: Database) {
  return {
    async create(data: {
      id?: string;
      sessionId: string;
      role: 'user' | 'assistant' | 'system';
      content: string;
      citations?: unknown[];
    }) {
      const values: Record<string, unknown> = {
        sessionId: data.sessionId,
        role: data.role,
        content: data.content,
        citations: data.citations ?? [],
      };
      if (data.id) values.id = data.id;
      const rows = await db
        .insert(messages)
        .values(values as typeof messages.$inferInsert)
        .returning();
      return rows[0]!;
    },

    async findBySessionId(sessionId: string, opts?: { limit?: number; offset?: number }) {
      const limit = opts?.limit ?? 50;
      const offset = opts?.offset ?? 0;
      return db
        .select()
        .from(messages)
        .where(eq(messages.sessionId, sessionId))
        .orderBy(messages.createdAt)
        .limit(limit)
        .offset(offset);
    },

    async updateFeedback(id: string, feedback: 'positive' | 'negative') {
      const rows = await db
        .update(messages)
        .set({ feedback })
        .where(eq(messages.id, id))
        .returning();
      return rows[0] ?? null;
    },
  };
}
