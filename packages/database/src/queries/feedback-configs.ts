import { eq } from 'drizzle-orm';
import { feedbackConfigs } from '../schema/index';
import type { Database } from '../client';

export function feedbackConfigQueries(db: Database) {
  return {
    async findByProjectId(projectId: string) {
      const rows = await db
        .select()
        .from(feedbackConfigs)
        .where(eq(feedbackConfigs.projectId, projectId))
        .limit(1);
      return rows[0] ?? null;
    },

    async upsert(projectId: string, data: {
      enabled?: boolean;
      ratings?: Array<{ id: string; label: string; required: boolean }>;
      questions?: Array<{ id: string; label: string; type: 'text'; required: boolean }>;
      submitButtonLabel?: string;
      thankYouMessage?: string;
      translations?: Record<string, unknown>;
    }) {
      const rows = await db
        .insert(feedbackConfigs)
        .values({
          projectId,
          enabled: data.enabled ?? false,
          ratings: data.ratings ?? [],
          questions: data.questions ?? [],
          submitButtonLabel: data.submitButtonLabel ?? 'Submit Feedback',
          thankYouMessage: data.thankYouMessage ?? 'Thank you for your feedback!',
        })
        .onConflictDoUpdate({
          target: feedbackConfigs.projectId,
          set: { ...data, updatedAt: new Date() },
        })
        .returning();
      return rows[0]!;
    },
  };
}
