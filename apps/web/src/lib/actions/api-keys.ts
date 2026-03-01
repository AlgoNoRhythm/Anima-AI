'use server';

import { createDatabase, apiKeyQueries } from '@anima-ai/database';
import { createLogger } from '@anima-ai/shared';
import { getUserId } from '../auth-helpers';
import { encryptApiKey } from '../crypto';
import { z } from 'zod';

const log = createLogger('action:api-keys');

const saveApiKeySchema = z.object({
  provider: z.enum(['openai', 'anthropic']),
  key: z.string().min(1, 'API key is required').max(500),
});

export async function saveApiKey(provider: string, key: string) {
  try {
    const userId = await getUserId();

    const parsed = saveApiKeySchema.safeParse({ provider, key });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' };
    }

    const db = createDatabase();

    // Verify user exists in DB (JWT may have stale ID after DB reset)
    const { userQueries } = await import('@anima-ai/database');
    const user = await userQueries(db).findById(userId);
    if (!user) {
      return { success: false, error: 'Session expired. Please log out and log back in.' };
    }

    const encrypted = encryptApiKey(parsed.data.key);
    await apiKeyQueries(db).upsertByProvider(userId, parsed.data.provider, encrypted, `${parsed.data.provider} API Key`);
    return { success: true };
  } catch (error) {
    log.error('saveApiKey error', { error: error instanceof Error ? error.message : error });
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function getApiKeyStatus(): Promise<{ openai: boolean; anthropic: boolean }> {
  try {
    const userId = await getUserId();
    const db = createDatabase();
    const keys = await apiKeyQueries(db).findByUserId(userId);
    return {
      openai: !!process.env.OPENAI_API_KEY || keys.some((k) => k.provider === 'openai'),
      anthropic: !!process.env.ANTHROPIC_API_KEY || keys.some((k) => k.provider === 'anthropic'),
    };
  } catch {
    return { openai: !!process.env.OPENAI_API_KEY, anthropic: !!process.env.ANTHROPIC_API_KEY };
  }
}

export async function deleteApiKey(id: string) {
  try {
    const userId = await getUserId();
    const db = createDatabase();

    // Verify ownership before deleting
    const keys = await apiKeyQueries(db).findByUserId(userId);
    const ownsKey = keys.some((k) => k.id === id);
    if (!ownsKey) {
      return { success: false, error: 'API key not found' };
    }

    await apiKeyQueries(db).delete(id);
    return { success: true };
  } catch (error) {
    log.error('deleteApiKey error', { error: error instanceof Error ? error.message : error });
    return { success: false, error: 'An unexpected error occurred' };
  }
}
