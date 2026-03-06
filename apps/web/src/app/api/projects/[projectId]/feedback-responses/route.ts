import { NextResponse } from 'next/server';
import { createDatabase, projectQueries, feedbackResponseQueries } from '@anima-ai/database';
import { auth } from '@/lib/auth';
import { createLogger } from '@anima-ai/shared';

const log = createLogger('api:feedback-responses');

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

    const url = new URL(request.url);
    const daysParam = url.searchParams.get('days');
    const limitParam = url.searchParams.get('limit');
    const offsetParam = url.searchParams.get('offset');
    const ratingId = url.searchParams.get('ratingId');

    const limit = Math.min(Math.max(parseInt(limitParam || '50', 10) || 50, 1), 100);
    const offset = Math.max(parseInt(offsetParam || '0', 10) || 0, 0);
    const days = daysParam ? parseInt(daysParam, 10) : null;

    const since = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : undefined;

    const fbResponses = feedbackResponseQueries(db);

    const [responses, totalCount] = await Promise.all([
      fbResponses.findByProjectId(projectId, limit, offset, since),
      fbResponses.countByProjectId(projectId, since),
    ]);

    const result: Record<string, unknown> = { responses, totalCount };

    if (ratingId) {
      const [ratingDistribution, ratingAverage, dailyRatingAverages] = await Promise.all([
        fbResponses.ratingDistribution(projectId, ratingId, since),
        fbResponses.averageRatingById(projectId, ratingId, since),
        fbResponses.dailyRatingAverages(projectId, ratingId, days || 30),
      ]);
      result.ratingDistribution = ratingDistribution;
      result.ratingAverage = ratingAverage;
      result.dailyRatingAverages = dailyRatingAverages;
    }

    return NextResponse.json(result);
  } catch (error) {
    log.error('GET /api/projects/[id]/feedback-responses error', {
      error: error instanceof Error ? error.message : error,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
