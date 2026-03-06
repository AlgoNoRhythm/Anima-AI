import { eq } from 'drizzle-orm';
import { themes } from '../schema/index';
import type { Database } from '../client';

export function themeQueries(db: Database) {
  return {
    async findByProjectId(projectId: string) {
      const rows = await db
        .select()
        .from(themes)
        .where(eq(themes.projectId, projectId))
        .limit(1);
      return rows[0] ?? null;
    },

    async upsert(projectId: string, data: {
      primaryColor?: string;
      backgroundColor?: string;
      fontFamily?: string;
      logoUrl?: string | null;
      welcomeMessage?: string;
      borderRadius?: string;
      actionButtonLabel?: string;
      suggestedQuestions?: string[];
      translations?: Record<string, unknown>;
    }) {
      const existing = await this.findByProjectId(projectId);
      if (existing) {
        const rows = await db
          .update(themes)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(themes.id, existing.id))
          .returning();
        return rows[0]!;
      }
      const rows = await db
        .insert(themes)
        .values({
          projectId,
          primaryColor: data.primaryColor ?? '#eab308',
          backgroundColor: data.backgroundColor ?? '#fffdf9',
          fontFamily: data.fontFamily ?? 'Inter, system-ui, sans-serif',
          logoUrl: data.logoUrl ?? null,
          welcomeMessage: data.welcomeMessage ?? 'Hello! How can I help you today?',
          borderRadius: data.borderRadius ?? '0.5rem',
          actionButtonLabel: data.actionButtonLabel ?? 'Open PDF',
          suggestedQuestions: data.suggestedQuestions ?? [],
        })
        .returning();
      return rows[0]!;
    },
  };
}
