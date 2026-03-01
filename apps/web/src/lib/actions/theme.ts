'use server';

import { createDatabase, themeQueries } from '@anima-ai/database';
import { createLogger } from '@anima-ai/shared';
import { requireProjectAccess } from '../project-auth';
import { z } from 'zod';

const log = createLogger('action:theme');

const updateThemeSchema = z.object({
  primaryColor: z.string().max(20).optional(),
  backgroundColor: z.string().max(20).optional(),
  fontFamily: z.string().max(100).optional(),
  logoUrl: z.string().max(500).nullable().optional(),
  welcomeMessage: z.string().max(500).optional(),
  borderRadius: z.string().max(20).optional(),
  actionButtonLabel: z.string().max(50).optional(),
});

export async function updateTheme(projectId: string, data: Record<string, unknown>) {
  try {
    const access = await requireProjectAccess(projectId, 'editor');
    if (access.error) {
      return { success: false, error: access.error };
    }

    const parsed = updateThemeSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' };
    }

    const db = createDatabase();
    await themeQueries(db).upsert(projectId, parsed.data);
    return { success: true };
  } catch (error) {
    log.error('updateTheme error', { error: error instanceof Error ? error.message : error });
    return { success: false, error: 'An unexpected error occurred' };
  }
}
