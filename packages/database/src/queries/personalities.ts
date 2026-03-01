import { eq } from 'drizzle-orm';
import { personalities } from '../schema/index';
import { DEFAULT_MODEL_PROVIDER, DEFAULT_MODEL_NAME } from '@anima-ai/shared';
import type { Database } from '../client';

export function personalityQueries(db: Database) {
  return {
    async findByProjectId(projectId: string) {
      const rows = await db
        .select()
        .from(personalities)
        .where(eq(personalities.projectId, projectId))
        .limit(1);
      return rows[0] ?? null;
    },

    async upsert(projectId: string, data: {
      name?: string;
      systemPrompt?: string;
      tone?: 'professional' | 'friendly' | 'casual' | 'formal' | 'technical';
      temperature?: number;
      modelProvider?: string;
      modelName?: string;
      guardrails?: Record<string, unknown>;
      showDisclaimer?: boolean;
      disclaimerText?: string;
      enableImageSupport?: boolean;
    }) {
      const existing = await this.findByProjectId(projectId);
      if (existing) {
        const rows = await db
          .update(personalities)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(personalities.id, existing.id))
          .returning();
        return rows[0]!;
      }
      const rows = await db
        .insert(personalities)
        .values({
          projectId,
          name: data.name ?? 'Default Assistant',
          systemPrompt: data.systemPrompt ?? 'You are a helpful assistant that answers questions based on the provided documents.',
          tone: data.tone ?? 'professional',
          temperature: data.temperature ?? 0.7,
          modelProvider: data.modelProvider ?? DEFAULT_MODEL_PROVIDER,
          modelName: data.modelName ?? DEFAULT_MODEL_NAME,
          guardrails: data.guardrails ?? {},
        })
        .returning();
      return rows[0]!;
    },
  };
}
