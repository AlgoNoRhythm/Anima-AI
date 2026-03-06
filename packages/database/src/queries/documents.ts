import { asc, eq, sql } from 'drizzle-orm';
import { documents } from '../schema/index';
import type { Database } from '../client';

type ProcessingStatus = 'pending' | 'parsing' | 'indexing' | 'completed' | 'failed';

export function documentQueries(db: Database) {
  return {
    async findByProjectId(projectId: string, opts?: { limit?: number; offset?: number }) {
      const limit = opts?.limit ?? 50;
      const offset = opts?.offset ?? 0;
      return db.select().from(documents).where(eq(documents.projectId, projectId)).orderBy(asc(documents.createdAt)).limit(limit).offset(offset);
    },

    async findById(id: string) {
      const rows = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
      return rows[0] ?? null;
    },

    async create(data: {
      projectId: string;
      filename: string;
      title?: string;
      storageUrl: string;
      fileSize: number;
    }) {
      const rows = await db.insert(documents).values(data).returning();
      return rows[0]!;
    },

    async updateStatus(id: string, status: ProcessingStatus, errorMessage?: string) {
      const rows = await db
        .update(documents)
        .set({ status, errorMessage: errorMessage ?? null, updatedAt: new Date() })
        .where(eq(documents.id, id))
        .returning();
      return rows[0] ?? null;
    },

    async updatePageCount(id: string, totalPages: number) {
      await db
        .update(documents)
        .set({ totalPages, updatedAt: new Date() })
        .where(eq(documents.id, id));
    },

    async updateTreeIndex(id: string, treeIndex: object) {
      await db
        .update(documents)
        .set({ treeIndex, updatedAt: new Date() })
        .where(eq(documents.id, id));
    },

    async getTreeIndices(projectId: string) {
      const rows = await db
        .select({
          id: documents.id,
          filename: documents.filename,
          title: documents.title,
          treeIndex: documents.treeIndex,
          detectedEntity: documents.detectedEntity,
        })
        .from(documents)
        .where(eq(documents.projectId, projectId));

      return rows
        .filter((row) => row.treeIndex != null)
        .map((row) => ({
          documentId: row.id,
          docName: row.title || row.filename,
          treeIndex: row.treeIndex as object[],
          detectedEntity: row.detectedEntity,
        }));
    },

    async updateEntity(id: string, detectedEntity: string | null) {
      await db
        .update(documents)
        .set({ detectedEntity, updatedAt: new Date() })
        .where(eq(documents.id, id));
    },

    async delete(id: string) {
      await db.delete(documents).where(eq(documents.id, id));
    },

    async countByProjectId(projectId: string) {
      const rows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(documents)
        .where(eq(documents.projectId, projectId));
      return rows[0]?.count ?? 0;
    },

    async countAll(userId?: string) {
      if (userId) {
        const { projects } = await import('../schema/index');
        const rows = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(documents)
          .innerJoin(projects, eq(documents.projectId, projects.id))
          .where(eq(projects.userId, userId));
        return rows[0]?.count ?? 0;
      }
      const rows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(documents);
      return rows[0]?.count ?? 0;
    },
  };
}
