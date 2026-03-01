import { waitForDb, projectQueries, documentQueries } from '@anima-ai/database';
import { getUserId } from '@/lib/auth-helpers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { DocumentList } from './document-list';

export const dynamic = 'force-dynamic';
import { getApiKeyStatus } from '@/lib/actions/api-keys';

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const userId = await getUserId();
  const db = await waitForDb();

  const result = await projectQueries(db).findByIdAndMember(projectId, userId);
  if (!result) notFound();
  const project = result.project;

  const documents = await documentQueries(db).findByProjectId(projectId);
  const keyStatus = await getApiKeyStatus();

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground mt-1">Upload and manage PDF documents for {project.name}.</p>
      </div>
      {!keyStatus.anthropic && !keyStatus.openai && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800">API key required</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Configure an API key in{' '}
              <Link href="/settings" className="underline font-medium hover:text-amber-900">
                Settings
              </Link>
              {' '}to start uploading documents.
            </p>
          </div>
        </div>
      )}
      <DocumentList projectId={projectId} initialDocuments={documents} />
    </div>
  );
}
