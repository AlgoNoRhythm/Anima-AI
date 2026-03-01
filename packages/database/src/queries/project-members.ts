import { eq, and } from 'drizzle-orm';
import { projectMembers } from '../schema/index';
import type { Database } from '../client';

export function projectMemberQueries(db: Database) {
  return {
    async findByProjectId(projectId: string) {
      return db.select().from(projectMembers).where(eq(projectMembers.projectId, projectId));
    },

    async findByUserId(userId: string) {
      return db.select().from(projectMembers).where(eq(projectMembers.userId, userId));
    },

    async findMembership(projectId: string, userId: string) {
      const rows = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
        .limit(1);
      return rows[0] ?? null;
    },

    async create(data: {
      projectId: string;
      userId: string;
      role: 'owner' | 'editor' | 'viewer';
    }) {
      const rows = await db.insert(projectMembers).values(data).returning();
      return rows[0]!;
    },

    async updateRole(projectId: string, userId: string, role: 'owner' | 'editor' | 'viewer') {
      const rows = await db
        .update(projectMembers)
        .set({ role })
        .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
        .returning();
      return rows[0] ?? null;
    },

    async delete(projectId: string, userId: string) {
      await db
        .delete(projectMembers)
        .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));
    },
  };
}
