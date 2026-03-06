import { createDatabase, projectQueries, sessionQueries } from '@anima-ai/database';
import { getUserId } from '@/lib/auth-helpers';
import { notFound } from 'next/navigation';
import { ConversationViewer } from './conversation-viewer';

export const dynamic = 'force-dynamic';

export default async function ConversationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const { projectId } = await params;
  const { search, page: pageParam } = await searchParams;
  const userId = await getUserId();
  const db = createDatabase();

  const memberResult = await projectQueries(db).findByIdAndMember(projectId, userId);
  if (!memberResult) notFound();
  const project = memberResult.project;

  const page = Math.max(1, parseInt(pageParam ?? '1', 10));
  const limit = 20;

  const result = await sessionQueries(db).searchSessions(projectId, {
    search,
    page,
    limit,
  });

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Conversations</h1>
        <p className="text-muted-foreground mt-1">
          Browse and search chat sessions for {project.name}.
        </p>
      </div>
      <ConversationViewer
        projectId={projectId}
        initialSessions={result.sessions.map((s) => ({
          ...s,
          createdAt: new Date(s.createdAt).toISOString(),
        }))}
        initialTotal={result.total}
        initialPage={page}
        initialSearch={search ?? ''}
        limit={limit}
      />
    </div>
  );
}
