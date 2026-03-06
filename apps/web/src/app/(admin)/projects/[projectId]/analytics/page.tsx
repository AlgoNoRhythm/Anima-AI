import { createDatabase, projectQueries, analyticsQueries, feedbackResponseQueries, feedbackConfigQueries } from '@anima-ai/database';
import { getUserId } from '@/lib/auth-helpers';
import { notFound } from 'next/navigation';
import { AnalyticsCharts } from './analytics-charts';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const userId = await getUserId();
  const db = createDatabase();

  const result = await projectQueries(db).findByIdAndMember(projectId, userId);
  if (!result) notFound();
  const project = result.project;

  const analytics = analyticsQueries(db);
  const fbResponses = feedbackResponseQueries(db);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [messagesToday, totalSessions, dailyData, feedbackCounts, surveyCount, avgStarRating, feedbackConfig] = await Promise.all([
    analytics.countByType(projectId, 'message_sent', today),
    analytics.countByType(projectId, 'session_start'),
    analytics.dailyAggregates(projectId, 30),
    analytics.feedbackCounts(projectId),
    fbResponses.countByProjectId(projectId),
    fbResponses.averageStarRating(projectId),
    feedbackConfigQueries(db).findByProjectId(projectId),
  ]);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">Track usage and engagement for {project.name}.</p>
      </div>
      <AnalyticsCharts
        projectId={projectId}
        initialData={{ messagesToday, totalSessions, dailyData, feedbackCounts, surveyCount, avgStarRating }}
        feedbackConfig={feedbackConfig ? {
          ratings: (feedbackConfig.ratings as Array<{ id: string; label: string }>) ?? [],
          questions: (feedbackConfig.questions as Array<{ id: string; label: string }>) ?? [],
        } : null}
      />
    </div>
  );
}
