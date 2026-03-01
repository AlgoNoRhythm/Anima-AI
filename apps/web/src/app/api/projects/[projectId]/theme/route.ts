import { NextResponse } from 'next/server';
import { createDatabase, projectQueries, themeQueries } from '@anima-ai/database';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { createLogger } from '@anima-ai/shared';

const log = createLogger('api:theme');

const updateThemeSchema = z.object({
  primaryColor: z.string().max(20).optional(),
  backgroundColor: z.string().max(20).optional(),
  fontFamily: z.string().max(100).optional(),
  logoUrl: z.string().max(500).nullable().optional(),
  welcomeMessage: z.string().max(500).optional(),
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

    const theme = await themeQueries(db).findByProjectId(projectId);
    return NextResponse.json(theme);
  } catch (error) {
    log.error('GET /api/projects/[id]/theme error', { error: error instanceof Error ? error.message : error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
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
    const parsed = updateThemeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Validation failed' },
        { status: 400 },
      );
    }

    const theme = await themeQueries(db).upsert(projectId, parsed.data);
    return NextResponse.json(theme);
  } catch (error) {
    log.error('PUT /api/projects/[id]/theme error', { error: error instanceof Error ? error.message : error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
