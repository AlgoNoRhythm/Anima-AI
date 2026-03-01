import { NextResponse } from 'next/server';
import { createDatabase, projectQueries, qrCodeQueries } from '@anima-ai/database';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { createLogger } from '@anima-ai/shared';

const log = createLogger('api:qr');

const saveQrSchema = z.object({
  config: z.record(z.unknown()),
}).strict();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const db = createDatabase();

    const memberResult = await projectQueries(db).findByIdAndMember(projectId, session.user.id);
    if (!memberResult) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const project = memberResult.project;

    const qrCode = await qrCodeQueries(db).findByProjectId(projectId);
    return NextResponse.json(qrCode ?? null);
  } catch (error) {
    log.error('GET /api/projects/[id]/qr error', { error: error instanceof Error ? error.message : error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const db = createDatabase();

    const memberResult = await projectQueries(db).findByIdAndMember(projectId, session.user.id);
    if (!memberResult) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (memberResult.role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = saveQrSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Validation failed' },
        { status: 400 },
      );
    }

    const qrCode = await qrCodeQueries(db).upsert(projectId, parsed.data.config);
    return NextResponse.json(qrCode);
  } catch (error) {
    log.error('POST /api/projects/[id]/qr error', { error: error instanceof Error ? error.message : error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
