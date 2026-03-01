import { waitForDb, projectQueries, documentQueries, chunkQueries } from '@anima-ai/database';
import { getUserId } from '@/lib/auth-helpers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { EntityEditor } from './entity-editor';

export const dynamic = 'force-dynamic';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  parsing: 'bg-blue-100 text-blue-800',
  indexing: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function DocumentPreviewPage({
  params,
}: {
  params: Promise<{ projectId: string; documentId: string }>;
}) {
  const { projectId, documentId } = await params;
  const userId = await getUserId();
  const db = await waitForDb();

  const result = await projectQueries(db).findByIdAndMember(projectId, userId);
  if (!result) notFound();
  const project = result.project;

  const document = await documentQueries(db).findById(documentId);
  if (!document || document.projectId !== projectId) notFound();

  const chunks = await chunkQueries(db).findByDocumentId(documentId);
  const sortedChunks = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);

  return (
    <div className="animate-fade-in max-w-4xl">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href={`/projects/${projectId}/documents`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to documents
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-1">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight break-words">
              {document.title ?? document.filename}
            </h1>
            {document.title && (
              <p className="text-muted-foreground mt-0.5 text-sm">{document.filename}</p>
            )}
          </div>
        </div>
      </div>

      {/* Metadata card */}
      <div className="rounded-xl border bg-card p-6 shadow-elevated mb-6">
        <h2 className="text-sm font-semibold mb-4">Document Details</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
          <div>
            <dt className="text-xs text-muted-foreground mb-0.5">Status</dt>
            <dd>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[document.status] ?? 'bg-gray-100 text-gray-800'}`}>
                {document.status}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground mb-0.5">File Size</dt>
            <dd className="text-sm font-medium">{formatSize(document.fileSize)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground mb-0.5">Pages</dt>
            <dd className="text-sm font-medium">{document.totalPages ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground mb-0.5">Chunks</dt>
            <dd className="text-sm font-medium">{sortedChunks.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground mb-0.5">Uploaded</dt>
            <dd className="text-sm font-medium">{formatDate(document.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground mb-0.5">Last Updated</dt>
            <dd className="text-sm font-medium">{formatDate(document.updatedAt)}</dd>
          </div>
          <div className="col-span-2 sm:col-span-3">
            <dt className="text-xs text-muted-foreground mb-0.5">Detected Entity</dt>
            <dd>
              <EntityEditor documentId={document.id} initialEntity={document.detectedEntity} />
            </dd>
          </div>
        </dl>
        {document.errorMessage && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-xs font-medium text-red-800 mb-0.5">Error</p>
            <p className="text-sm text-red-700">{document.errorMessage}</p>
            <p className="text-xs text-red-600 mt-2">
              {/api/i.test(document.errorMessage)
                ? 'This may be an API key issue. Check your API key in Settings and try reprocessing.'
                : /timeout/i.test(document.errorMessage)
                  ? 'The document may be too large or complex. Try splitting it into smaller files.'
                  : 'Try reprocessing the document from the documents list, or re-upload the file.'}
            </p>
          </div>
        )}
      </div>

      {/* Chunks section */}
      <div className="rounded-xl border bg-card shadow-elevated">
        <div className="p-6 border-b">
          <h2 className="text-sm font-semibold">
            Text Chunks
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              ({sortedChunks.length} total)
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Extracted text segments used for retrieval-augmented generation.
          </p>
        </div>

        {sortedChunks.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm font-medium">No chunks yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              {document.status === 'completed'
                ? 'No text could be extracted from this document.'
                : 'Chunks will appear here once processing is complete.'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {sortedChunks.map((chunk) => (
              <details key={chunk.id} className="group">
                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/40 transition-colors list-none">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono text-muted-foreground shrink-0 w-8 text-right">
                      #{chunk.chunkIndex + 1}
                    </span>
                    <div className="min-w-0">
                      {chunk.sectionTitle && (
                        <p className="text-xs font-medium text-foreground truncate">{chunk.sectionTitle}</p>
                      )}
                      <p className="text-xs text-muted-foreground truncate">
                        {chunk.text.slice(0, 120)}{chunk.text.length > 120 ? '…' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    {chunk.pageNumbers && chunk.pageNumbers.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        p.{chunk.pageNumbers.join(', ')}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {chunk.text.length} chars
                    </span>
                    <svg
                      className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </summary>
                <div className="px-4 pb-4 pt-1 ml-11">
                  <div className="rounded-lg bg-muted/50 p-4 border">
                    <pre className="text-xs leading-relaxed whitespace-pre-wrap break-words font-mono text-foreground/80">
                      {chunk.text}
                    </pre>
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
