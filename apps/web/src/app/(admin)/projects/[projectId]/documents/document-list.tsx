'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { uploadDocument, deleteDocument, reprocessDocument } from '@/lib/actions/documents';
import { MAX_FILE_SIZE_MB, SUPPORTED_FILE_TYPES } from '@anima-ai/shared';
import { useToast } from '@/components/toast';
import { useConfirm } from '@/components/confirm-dialog';

interface Document {
  id: string;
  filename: string;
  title: string | null;
  status: string;
  fileSize: number;
  totalPages: number | null;
  errorMessage: string | null;
  createdAt: Date | string;
}

interface BatchUploadProgress {
  current: number;
  total: number;
  succeeded: number;
  failed: number;
  failures: string[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  parsing: 'bg-blue-100 text-blue-800',
  indexing: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function validateFile(file: File): string | null {
  if (!(SUPPORTED_FILE_TYPES as readonly string[]).includes(file.type)) {
    return `${file.name}: unsupported file type`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `${file.name}: too large (max ${MAX_FILE_SIZE_MB}MB)`;
  }
  return null;
}

export function DocumentList({
  projectId,
  initialDocuments,
}: {
  projectId: string;
  initialDocuments: Document[];
}) {
  const [uploading, setUploading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchUploadProgress | null>(null);
  const [batchSummary, setBatchSummary] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<Record<string, boolean>>({});
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastCtx = useToast();
  const confirm = useConfirm();
  const prevStatusRef = useRef<Record<string, string>>({});

  const PROCESSING_STATUSES = ['pending', 'parsing', 'indexing'];

  const { data: documents, mutate } = useSWR<Document[]>(
    `/api/projects/${projectId}/documents`,
    fetcher,
    {
      fallbackData: initialDocuments,
      refreshInterval: (data) => {
        const hasActive = (data ?? initialDocuments).some((d) =>
          PROCESSING_STATUSES.includes(d.status),
        );
        return hasActive ? 3000 : 0;
      },
    },
  );

  // Track document status changes and fire toasts
  useEffect(() => {
    if (!documents) return;
    const prev = prevStatusRef.current;
    for (const doc of documents) {
      const oldStatus = prev[doc.id];
      if (oldStatus && PROCESSING_STATUSES.includes(oldStatus)) {
        if (doc.status === 'completed') {
          toastCtx.success(`"${doc.filename}" processed successfully`);
        } else if (doc.status === 'failed') {
          toastCtx.error(`"${doc.filename}" processing failed`);
        }
      }
    }
    const next: Record<string, string> = {};
    for (const doc of documents) {
      next[doc.id] = doc.status;
    }
    prevStatusRef.current = next;
  }, [documents]); // eslint-disable-line react-hooks/exhaustive-deps

  const uploadFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    setUploading(true);
    setBatchSummary(null);

    const validFiles: File[] = [];
    const skippedFailures: string[] = [];

    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        skippedFailures.push(error);
      } else {
        validFiles.push(file);
      }
    }

    const total = validFiles.length;
    let succeeded = 0;
    let failed = skippedFailures.length;
    const failures = [...skippedFailures];

    if (total > 0) {
      setBatchProgress({ current: 0, total, succeeded: 0, failed, failures });

      for (let i = 0; i < validFiles.length; i++) {
        setBatchProgress({ current: i + 1, total, succeeded, failed, failures });

        const formData = new FormData();
        formData.append('file', validFiles[i]!);

        const result = await uploadDocument(projectId, formData);
        if (result.success) {
          succeeded++;
        } else {
          failed++;
          failures.push(`${validFiles[i]!.name}: ${result.error}`);
        }

        setBatchProgress({ current: i + 1, total, succeeded, failed, failures });
      }
    }

    // Build summary
    const parts: string[] = [];
    if (succeeded > 0) parts.push(`${succeeded} uploaded`);
    if (failures.length > 0) parts.push(`${failures.length} failed (${failures.join('; ')})`);
    if (parts.length > 0) {
      setBatchSummary(parts.join(', '));
    }

    setBatchProgress(null);
    await mutate();
    setUploading(false);
  }, [projectId, mutate]);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    e.target.value = '';
    await uploadFiles(files);
  }, [uploadFiles]);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);

    const fileList = e.dataTransfer.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    await uploadFiles(files);
  }, [uploadFiles]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleRetry = useCallback(async (docId: string) => {
    setRetrying((prev) => ({ ...prev, [docId]: true }));
    const result = await reprocessDocument(docId);
    if (!result.success) {
      toastCtx.error(result.error || 'Reprocessing failed');
    }
    await mutate();
    setRetrying((prev) => ({ ...prev, [docId]: false }));
  }, [mutate, toastCtx]);

  const handleDelete = useCallback(async (docId: string) => {
    const confirmed = await confirm({
      title: 'Delete Document',
      description: 'Delete this document and all its chunks? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;
    await deleteDocument(docId);
    toastCtx.success('Document deleted');
    await mutate();
  }, [mutate, confirm, toastCtx]);

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getUploadLabel(): string {
    if (batchProgress) {
      return `Uploading ${batchProgress.current}/${batchProgress.total} files...`;
    }
    if (uploading) {
      return 'Uploading...';
    }
    return 'Click or drag to upload PDFs';
  }

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <label
        className={`block rounded-xl border-2 border-dashed bg-card p-8 text-center cursor-pointer transition-all duration-200 hover:border-primary/50 hover:bg-accent/50 ${dragOver ? 'border-primary bg-accent/50' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={handleUpload}
          className="hidden"
          disabled={uploading}
        />
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
          <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <p className="text-sm font-medium">{getUploadLabel()}</p>
        <p className="text-xs text-muted-foreground mt-1">PDF files up to {MAX_FILE_SIZE_MB}MB</p>
      </label>

      {/* Batch progress indicator */}
      {batchProgress && (
        <div className="rounded-xl border bg-card p-4 shadow-elevated">
          <div className="flex items-center gap-3">
            <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
            <p className="text-sm">
              Uploading {batchProgress.current}/{batchProgress.total} files...
              {batchProgress.succeeded > 0 && ` (${batchProgress.succeeded} done)`}
            </p>
          </div>
          <div className="mt-2 w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Batch summary */}
      {batchSummary && (
        <div className="rounded-xl border bg-card p-4 shadow-elevated flex items-center justify-between">
          <p className="text-sm">{batchSummary}</p>
          <button
            onClick={() => setBatchSummary(null)}
            className="text-muted-foreground hover:text-foreground transition-colors text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Document list */}
      {documents && documents.length > 0 ? (
        <div className="rounded-xl border bg-card shadow-elevated divide-y">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <Link
                    href={`/projects/${projectId}/documents/${doc.id}`}
                    className="text-sm font-medium truncate hover:underline hover:text-primary transition-colors block"
                  >
                    {doc.filename}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(doc.fileSize)}
                    {doc.totalPages ? ` - ${doc.totalPages} pages` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[doc.status] || 'bg-gray-100'}`}>
                  {PROCESSING_STATUSES.includes(doc.status) && (
                    <span className="animate-spin w-3 h-3 border-[1.5px] border-current border-t-transparent rounded-full" />
                  )}
                  {doc.status}
                </span>
                {doc.status === 'failed' && doc.errorMessage && (
                  <span className="text-xs text-red-600 max-w-[200px] truncate" title={doc.errorMessage}>
                    {/api/i.test(doc.errorMessage) ? 'API key issue — check Settings' : /timeout/i.test(doc.errorMessage) ? 'Processing timed out — try again' : doc.errorMessage}
                  </span>
                )}
                {doc.status === 'failed' && (
                  <button
                    onClick={() => handleRetry(doc.id)}
                    disabled={retrying[doc.id]}
                    className="text-xs px-2 py-1 rounded-md bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-colors disabled:opacity-50"
                    title="Retry processing"
                  >
                    {retrying[doc.id] ? 'Retrying...' : 'Retry'}
                  </button>
                )}
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete document"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-12 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-1">No documents yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Upload your first document to start building your knowledge base. Drag and drop PDFs into the upload zone above.
          </p>
        </div>
      )}
    </div>
  );
}
