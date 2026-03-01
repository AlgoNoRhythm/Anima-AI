import { NextResponse } from 'next/server';
import { createDatabase, apiKeyQueries } from '@anima-ai/database';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { encryptApiKey } from '@/lib/crypto';
import { createLogger } from '@anima-ai/shared';

const log = createLogger('api:api-keys');

const createApiKeySchema = z.object({
  provider: z.enum(['openai', 'anthropic']),
  key: z.string().min(1, 'API key is required').max(500),
  label: z.string().max(100).optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = createDatabase();
    const keys = await apiKeyQueries(db).findByUserId(session.user.id);

    // Return keys with masked values
    return NextResponse.json(
      keys.map((k) => ({
        id: k.id,
        provider: k.provider,
        label: k.label,
        hasKey: !!k.encryptedKey,
        createdAt: k.createdAt,
      })),
    );
  } catch (error) {
    log.error('GET /api/settings/api-keys error', { error: error instanceof Error ? error.message : error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createApiKeySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Validation failed' },
        { status: 400 },
      );
    }

    const { provider, key, label } = parsed.data;

    const encrypted = encryptApiKey(key);
    const db = createDatabase();
    const result = await apiKeyQueries(db).upsertByProvider(
      session.user.id,
      provider,
      encrypted,
      label ?? `${provider} API Key`,
    );
    return NextResponse.json({ id: result.id, provider: result.provider }, { status: 201 });
  } catch (error) {
    log.error('POST /api/settings/api-keys error', { error: error instanceof Error ? error.message : error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Verify ownership before deleting (fixes auth hole)
    const db = createDatabase();
    const keys = await apiKeyQueries(db).findByUserId(session.user.id);
    const ownsKey = keys.some((k) => k.id === id);
    if (!ownsKey) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await apiKeyQueries(db).delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('DELETE /api/settings/api-keys error', { error: error instanceof Error ? error.message : error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
