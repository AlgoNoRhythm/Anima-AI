import { createDatabase, projectQueries, feedbackConfigQueries, themeQueries } from '@anima-ai/database';
import { getUserId } from '@/lib/auth-helpers';
import { notFound } from 'next/navigation';
import { FeedbackEditor } from './feedback-editor';
import type { FeedbackRating, FeedbackQuestion } from './feedback-editor-types';

export const dynamic = 'force-dynamic';

export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const userId = await getUserId();
  const db = createDatabase();

  const result = await projectQueries(db).findByIdAndMember(projectId, userId);
  if (!result) notFound();

  const [config, theme] = await Promise.all([
    feedbackConfigQueries(db).findByProjectId(projectId),
    themeQueries(db).findByProjectId(projectId),
  ]);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Feedback</h1>
        <p className="text-muted-foreground mt-1">Configure the feedback survey shown to chat users.</p>
      </div>
      <FeedbackEditor
        projectId={projectId}
        config={config ? {
          enabled: config.enabled,
          ratings: (config.ratings as FeedbackRating[]) ?? [],
          questions: (config.questions as FeedbackQuestion[]) ?? [],
          submitButtonLabel: config.submitButtonLabel,
          thankYouMessage: config.thankYouMessage,
          translations: (config.translations as Record<string, Record<string, unknown>>) ?? {},
        } : null}
        themeColors={{
          primaryColor: theme?.primaryColor ?? undefined,
          backgroundColor: theme?.backgroundColor ?? undefined,
        }}
      />
    </div>
  );
}
