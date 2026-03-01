import { eq, and } from 'drizzle-orm';
import { projectInvitations } from '../schema/index';
import type { Database } from '../client';

export function projectInvitationQueries(db: Database) {
  return {
    async findByProjectId(projectId: string) {
      return db.select().from(projectInvitations).where(eq(projectInvitations.projectId, projectId));
    },

    async findByToken(token: string) {
      const rows = await db
        .select()
        .from(projectInvitations)
        .where(eq(projectInvitations.token, token))
        .limit(1);
      return rows[0] ?? null;
    },

    async create(data: {
      projectId: string;
      email: string;
      role: 'editor' | 'viewer';
      token: string;
      invitedBy: string;
      expiresAt: Date;
    }) {
      const rows = await db.insert(projectInvitations).values(data).returning();
      return rows[0]!;
    },

    async updateStatus(id: string, status: 'pending' | 'accepted' | 'expired') {
      const rows = await db
        .update(projectInvitations)
        .set({ status })
        .where(eq(projectInvitations.id, id))
        .returning();
      return rows[0] ?? null;
    },

    async delete(id: string) {
      await db.delete(projectInvitations).where(eq(projectInvitations.id, id));
    },
  };
}
