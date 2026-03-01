import { createDatabase, projectQueries, documentQueries } from '@anima-ai/database';
import { getUserId } from '@/lib/auth-helpers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChatPreview } from './chat-preview';

export const dynamic = 'force-dynamic';

export default async function PreviewPage({
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

  const docs = await documentQueries(db).findByProjectId(projectId);
  const hasCompletedDocs = docs.some((d) => d.status === 'completed');

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Preview</h1>
        <p className="text-muted-foreground mt-1">
          Test the chat experience as your end-users will see it.
        </p>
      </div>
      {!hasCompletedDocs && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800">No documents ready</p>
            <p className="text-xs text-amber-700 mt-0.5">
              The chatbot has no documents to reference. You can still preview your theme, but answers will be limited.{' '}
              <Link href={`/projects/${projectId}/documents`} className="underline font-medium hover:text-amber-900">
                Upload documents
              </Link>
            </p>
          </div>
        </div>
      )}
      <ChatPreview slug={project.slug} projectName={project.name} />
    </div>
  );
}
