'use server';

import { createDatabase, feedbackConfigQueries } from '@anima-ai/database';
import { createLogger } from '@anima-ai/shared';
import { requireProjectAccess } from '../project-auth';
import { z } from 'zod';

const log = createLogger('action:feedback');

const ratingSchema = z.object({
  id: z.string(),
  label: z.string().max(200),
  required: z.boolean(),
});

const questionSchema = z.object({
  id: z.string(),
  label: z.string().max(200),
  type: z.literal('text'),
  required: z.boolean(),
});

const updateFeedbackConfigSchema = z.object({
  enabled: z.boolean().optional(),
  ratings: z.array(ratingSchema).max(10).optional(),
  questions: z.array(questionSchema).max(10).optional(),
  submitButtonLabel: z.string().max(50).optional(),
  thankYouMessage: z.string().max(200).optional(),
  translations: z.record(z.enum(['de', 'fr', 'it']), z.object({
    submitButtonLabel: z.string().max(50).optional(),
    thankYouMessage: z.string().max(200).optional(),
    ratingLabels: z.record(z.string().max(200)).optional(),
    questionLabels: z.record(z.string().max(200)).optional(),
  }).optional()).optional(),
});

export async function updateFeedbackConfig(
  projectId: string,
  data: Record<string, unknown>,
) {
  try {
    const access = await requireProjectAccess(projectId, 'editor');
    if (access.error) {
      return { success: false, error: access.error };
    }

    const parsed = updateFeedbackConfigSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' };
    }

    const db = createDatabase();
    await feedbackConfigQueries(db).upsert(projectId, parsed.data);
    return { success: true };
  } catch (error) {
    log.error('updateFeedbackConfig error', { error: error instanceof Error ? error.message : error });
    return { success: false, error: 'An unexpected error occurred' };
  }
}
