import { NextResponse } from 'next/server';
import { createDatabase, projectQueries, sessionQueries, messageQueries } from '@anima-ai/database';
import { auth } from '@/lib/auth';
import { createLogger } from '@anima-ai/shared';

const log = createLogger('api:conversations');

export async function GET(
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
    const project = memberResult.project;

    const url = new URL(request.url);
    const search = url.searchParams.get('search') ?? undefined;
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10)));

    // If sessionId is provided, return messages for that session
    const sessionId = url.searchParams.get('sessionId');
    if (sessionId) {
      // Verify the session belongs to this project
      const chatSession = await sessionQueries(db).findById(sessionId);
      if (!chatSession || chatSession.projectId !== projectId) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      const msgs = await messageQueries(db).findBySessionId(sessionId, { limit: 500 });
      return NextResponse.json({ messages: msgs });
    }

    const result = await sessionQueries(db).searchSessions(projectId, {
      search,
      page,
      limit,
    });

    return NextResponse.json({
      sessions: result.sessions,
      total: result.total,
      page,
      limit,
    });
  } catch (error) {
    log.error('GET /api/projects/[id]/conversations error', { error: error instanceof Error ? error.message : error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
