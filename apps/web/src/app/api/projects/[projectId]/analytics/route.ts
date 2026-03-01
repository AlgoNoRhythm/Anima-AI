import { NextResponse } from 'next/server';
import { createDatabase, projectQueries, analyticsQueries } from '@anima-ai/database';
import { auth } from '@/lib/auth';
import { createLogger } from '@anima-ai/shared';

const log = createLogger('api:analytics');

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

    const analytics = analyticsQueries(db);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [messagesToday, totalSessions, dailyData, feedbackCounts] = await Promise.all([
      analytics.countByType(projectId, 'message_sent', today),
      analytics.countByType(projectId, 'session_start'),
      analytics.dailyAggregates(projectId, 30),
      analytics.feedbackCounts(projectId),
    ]);

    return NextResponse.json({
      messagesToday,
      totalSessions,
      dailyData,
      feedbackCounts,
    });
  } catch (error) {
    log.error('GET /api/projects/[id]/analytics error', { error: error instanceof Error ? error.message : error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
