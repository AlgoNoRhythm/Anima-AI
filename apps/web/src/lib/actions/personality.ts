'use server';

import { createDatabase, personalityQueries } from '@anima-ai/database';
import { createLogger } from '@anima-ai/shared';
import { createCacheClient, invalidateProjectMeta } from '@anima-ai/cache';
import { requireProjectAccess } from '../project-auth';
import { z } from 'zod';

const log = createLogger('action:personality');

const updatePersonalitySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  systemPrompt: z.string().max(10000).optional(),
  tone: z.enum(['professional', 'friendly', 'casual', 'formal', 'technical']).optional(),
  temperature: z.number().min(0).max(2).optional(),
  modelProvider: z.string().max(50).optional(),
  modelName: z.string().max(100).optional(),
  guardrails: z.record(z.unknown()).optional(),
  showDisclaimer: z.boolean().optional(),
  disclaimerText: z.string().max(500).optional(),
  translations: z.record(z.enum(['de', 'fr', 'it']), z.object({
    name: z.string().max(100).optional(),
    disclaimerText: z.string().max(500).optional(),
  }).optional()).optional(),
});

export async function updatePersonality(projectId: string, data: Record<string, unknown>) {
  try {
    const access = await requireProjectAccess(projectId, 'editor');
    if (access.error) {
      return { success: false, error: access.error };
    }

    const parsed = updatePersonalitySchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' };
    }

    const db = createDatabase();
    await personalityQueries(db).upsert(projectId, parsed.data);

    // Invalidate cached project meta so chat-api picks up changes
    try { await invalidateProjectMeta(createCacheClient(), projectId); } catch { /* best-effort */ }

    return { success: true };
  } catch (error) {
    log.error('updatePersonality error', { error: error instanceof Error ? error.message : error });
    return { success: false, error: 'An unexpected error occurred' };
  }
}
