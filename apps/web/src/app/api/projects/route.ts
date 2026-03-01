import { NextResponse } from 'next/server';
import { createDatabase, projectQueries } from '@anima-ai/database';
import { auth } from '@/lib/auth';
import { createLogger } from '@anima-ai/shared';

const log = createLogger('api:projects');

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = createDatabase();
    const projects = await projectQueries(db).findByUserId(session.user.id);
    return NextResponse.json(projects);
  } catch (error) {
    log.error('GET /api/projects error', { error: error instanceof Error ? error.message : error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
