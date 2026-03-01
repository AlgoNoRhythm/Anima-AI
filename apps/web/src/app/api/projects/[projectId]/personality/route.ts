import { NextResponse } from 'next/server';
import { createDatabase, projectQueries, personalityQueries } from '@anima-ai/database';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { createLogger } from '@anima-ai/shared';

const log = createLogger('api:personality');

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
  enableImageSupport: z.boolean().optional(),
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

    const personality = await personalityQueries(db).findByProjectId(projectId);
    return NextResponse.json(personality);
  } catch (error) {
    log.error('GET /api/projects/[id]/personality error', { error: error instanceof Error ? error.message : error });
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
    const parsed = updatePersonalitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Validation failed' },
        { status: 400 },
      );
    }

    const personality = await personalityQueries(db).upsert(projectId, parsed.data);
    return NextResponse.json(personality);
  } catch (error) {
    log.error('PUT /api/projects/[id]/personality error', { error: error instanceof Error ? error.message : error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
