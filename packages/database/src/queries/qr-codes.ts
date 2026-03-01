import { eq } from 'drizzle-orm';
import { qrCodes } from '../schema/index';
import type { Database } from '../client';

export function qrCodeQueries(db: Database) {
  return {
    async findByProjectId(projectId: string) {
      const rows = await db
        .select()
        .from(qrCodes)
        .where(eq(qrCodes.projectId, projectId))
        .limit(1);
      return rows[0] ?? undefined;
    },

    async upsert(projectId: string, config: Record<string, unknown>) {
      const existing = await this.findByProjectId(projectId);
      if (existing) {
        const rows = await db
          .update(qrCodes)
          .set({ config })
          .where(eq(qrCodes.id, existing.id))
          .returning();
        return rows[0]!;
      }
      const rows = await db
        .insert(qrCodes)
        .values({ projectId, config })
        .returning();
      return rows[0]!;
    },

    async delete(id: string) {
      await db.delete(qrCodes).where(eq(qrCodes.id, id));
    },
  };
}
