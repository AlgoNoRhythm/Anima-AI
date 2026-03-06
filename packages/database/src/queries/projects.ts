import { eq, and, or, inArray, sql } from 'drizzle-orm';
import { projects, projectMembers } from '../schema/index';
import type { Database } from '../client';

export function projectQueries(db: Database) {
  return {
    async findByUserId(userId: string, opts?: { limit?: number; offset?: number }) {
      const limit = opts?.limit ?? 50;
      const offset = opts?.offset ?? 0;

      // Get IDs of projects where user is a member
      const memberRows = await db
        .select({ projectId: projectMembers.projectId })
        .from(projectMembers)
        .where(eq(projectMembers.userId, userId));
      const memberProjectIds = memberRows.map((r) => r.projectId);

      // Return owned + member projects
      if (memberProjectIds.length > 0) {
        return db
          .select()
          .from(projects)
          .where(or(eq(projects.userId, userId), inArray(projects.id, memberProjectIds)))
          .limit(limit)
          .offset(offset);
      }
      return db.select().from(projects).where(eq(projects.userId, userId)).limit(limit).offset(offset);
    },

    async findBySlug(slug: string) {
      const rows = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
      return rows[0] ?? null;
    },

    async findById(id: string) {
      const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
      return rows[0] ?? null;
    },

    async findByIdAndUser(id: string, userId: string) {
      const rows = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, userId)))
        .limit(1);
      return rows[0] ?? null;
    },

    /** Check ownership first, then membership. Returns project + role. */
    async findByIdAndMember(id: string, userId: string): Promise<{ project: typeof projects.$inferSelect; role: 'owner' | 'editor' | 'viewer' } | null> {
      // Check if user is owner
      const ownerRows = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, userId)))
        .limit(1);
      if (ownerRows[0]) {
        return { project: ownerRows[0], role: 'owner' };
      }

      // Check membership
      const project = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
      if (!project[0]) return null;

      const membership = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, userId)))
        .limit(1);
      if (!membership[0]) return null;

      return { project: project[0], role: membership[0].role as 'owner' | 'editor' | 'viewer' };
    },

    async create(data: {
      userId: string;
      name: string;
      slug: string;
      description?: string;
      mode?: 'chat' | 'pdf' | 'both';
      settings?: Record<string, unknown>;
    }) {
      const rows = await db.insert(projects).values(data).returning();
      return rows[0]!;
    },

    async update(id: string, data: Partial<{
      name: string;
      slug: string;
      description: string | null;
      mode: 'chat' | 'pdf' | 'both';
      settings: Record<string, unknown>;
    }>) {
      const rows = await db
        .update(projects)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(projects.id, id))
        .returning();
      return rows[0] ?? null;
    },

    async delete(id: string) {
      await db.delete(projects).where(eq(projects.id, id));
    },

    async count(userId?: string) {
      const rows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(projects)
        .where(userId ? eq(projects.userId, userId) : undefined);
      return rows[0]?.count ?? 0;
    },
  };
}
