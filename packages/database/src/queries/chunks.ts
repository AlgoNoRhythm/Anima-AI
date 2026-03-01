import { eq, inArray } from 'drizzle-orm';
import { chunks } from '../schema/index';
import type { Database } from '../client';

export function chunkQueries(db: Database) {
  return {
    async createMany(data: Array<{
      documentId: string;
      text: string;
      pageNumbers?: number[];
      sectionTitle?: string | null;
      bbox?: object | null;
      chunkIndex: number;
    }>) {
      if (data.length === 0) return [];
      const rows = await db.insert(chunks).values(data).returning();
      return rows;
    },

    async findByIds(ids: string[]) {
      if (ids.length === 0) return [];
      return db.select().from(chunks).where(inArray(chunks.id, ids));
    },

    async findByDocumentId(documentId: string) {
      return db.select().from(chunks).where(eq(chunks.documentId, documentId));
    },

    async deleteByDocumentId(documentId: string) {
      await db.delete(chunks).where(eq(chunks.documentId, documentId));
    },
  };
}
