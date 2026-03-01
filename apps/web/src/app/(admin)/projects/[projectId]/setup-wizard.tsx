'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { uploadDocument } from '@/lib/actions/documents';
import { MAX_FILE_SIZE_MB } from '@anima-ai/shared';

interface SetupWizardProps {
  projectId: string;
  projectSlug: string;
  apiKeyStatus: { openai: boolean; anthropic: boolean };
}

const STEPS = ['API Keys', 'Upload', 'Configure', 'Done'] as const;

export function SetupWizard({ projectId, projectSlug, apiKeyStatus }: SetupWizardProps) {
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const storageKey = `wizard-dismissed-${projectId}`;

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(storageKey) === 'true') {
      setDismissed(true);
    }
  }, [storageKey]);

  const dismiss = useCallback(() => {
    localStorage.setItem(storageKey, 'true');
    setDismissed(true);
  }, [storageKey]);

  const hasKey = apiKeyStatus.openai || apiKeyStatus.anthropic;

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    let count = 0;
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      const result = await uploadDocument(projectId, formData);
      if (result.success) count++;
    }
    setUploadedCount((prev) => prev + count);
    setUploading(false);
  }, [projectId]);

  if (dismissed) return null;

  return (
    <div className="mb-8 rounded-xl border bg-card p-6 shadow-elevated">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Get Started</h2>
        <button
          onClick={dismiss}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Dismiss
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <button
              onClick={() => setStep(i)}
              className={`w-7 h-7 rounded-full text-xs font-medium flex items-center justify-center transition-colors ${
                i === step
                  ? 'bg-primary text-primary-foreground'
                  : i < step
                    ? 'bg-green-100 text-green-800'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {i < step ? '\u2713' : i + 1}
            </button>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-0.5 ${i < step ? 'bg-green-200' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === 0 && (
        <div>
          <h3 className="font-medium mb-2">1. Configure API Keys</h3>
          <p className="text-sm text-muted-foreground mb-4">
            An LLM API key is needed to index documents and power the chat.
          </p>
          {hasKey ? (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              API key configured
            </div>
          ) : (
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              Go to Settings to add an API key
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>
      )}

      {step === 1 && (
        <div>
          <h3 className="font-medium mb-2">2. Upload Documents</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop PDF files to build your knowledge base.
          </p>
          <label
            className={`block rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-all hover:border-primary/50 hover:bg-accent/50 ${dragOver ? 'border-primary bg-accent/50' : ''}`}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple
              onChange={(e) => { handleUpload(e.target.files); e.target.value = ''; }}
              className="hidden"
              disabled={uploading}
            />
            <p className="text-sm font-medium">
              {uploading ? 'Uploading...' : 'Click or drag to upload PDFs'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Up to {MAX_FILE_SIZE_MB}MB per file</p>
          </label>
          {uploadedCount > 0 && (
            <p className="text-sm text-green-700 mt-3">
              {uploadedCount} file{uploadedCount !== 1 ? 's' : ''} uploaded
            </p>
          )}
        </div>
      )}

      {step === 2 && (
        <div>
          <h3 className="font-medium mb-2">3. Configure (Optional)</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Customize how your chatbot looks and behaves.
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href={`/projects/${projectId}/personality`}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              Set up personality and tone
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href={`/projects/${projectId}/theme`}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              Customize theme and branding
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h3 className="font-medium mb-2">4. You&apos;re All Set!</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Your chatbot is ready. Share the public link or generate a QR code.
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Public URL:</span>
              <a
                href={`/c/${projectSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-mono text-primary hover:underline"
              >
                /c/{projectSlug}
              </a>
            </div>
            <Link
              href={`/projects/${projectId}/qr`}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              Generate QR code
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className={`text-sm text-muted-foreground hover:text-foreground transition-colors ${step === 0 ? 'invisible' : ''}`}
        >
          Back
        </button>
        <div className="flex items-center gap-3">
          {step < STEPS.length - 1 && (
            <>
              <button
                onClick={() => setStep((s) => s + 1)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip
              </button>
              <button
                onClick={() => setStep((s) => s + 1)}
                className="text-sm px-4 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Next
              </button>
            </>
          )}
          {step === STEPS.length - 1 && (
            <button
              onClick={dismiss}
              className="text-sm px-4 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Finish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
