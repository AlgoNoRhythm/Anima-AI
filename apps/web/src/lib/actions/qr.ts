'use server';

import { createDatabase, qrCodeQueries } from '@anima-ai/database';
import { createLogger } from '@anima-ai/shared';
import { requireProjectAccess } from '../project-auth';
import { z } from 'zod';

const log = createLogger('action:qr');

const qrConfigSchema = z.record(z.unknown());

export async function saveQrConfig(projectId: string, config: Record<string, unknown>) {
  try {
    const access = await requireProjectAccess(projectId, 'editor');
    if (access.error) {
      return { success: false, error: access.error };
    }

    const parsed = qrConfigSchema.safeParse(config);
    if (!parsed.success) {
      return { success: false, error: 'Invalid QR configuration' };
    }

    const db = createDatabase();
    await qrCodeQueries(db).upsert(projectId, parsed.data);

    return { success: true };
  } catch (error) {
    log.error('saveQrConfig error', { error: error instanceof Error ? error.message : error });
    return { success: false, error: 'An unexpected error occurred' };
  }
}
