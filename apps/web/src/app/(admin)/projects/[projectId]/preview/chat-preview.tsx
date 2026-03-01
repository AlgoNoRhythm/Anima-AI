'use client';

import { useState } from 'react';

interface ChatPreviewProps {
  slug: string;
  projectName: string;
}

export function ChatPreview({ slug, projectName }: ChatPreviewProps) {
  const [key, setKey] = useState(0);
  const chatUrl = `/c/${slug}`;

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setKey((k) => k + 1)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reload
        </button>
        <a
          href={chatUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          Open in new tab
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {/* Chat iframe */}
      <div className="rounded-xl border bg-card shadow-elevated overflow-hidden" style={{ height: '70vh' }}>
        <iframe
          key={key}
          src={chatUrl}
          title={`Chat preview for ${projectName}`}
          width="100%"
          height="100%"
          className="border-0"
        />
      </div>

      {/* Info note */}
      <p className="text-xs text-muted-foreground">
        Live preview — messages you send here create real chat sessions. Use this to test your theme and personality settings.
      </p>
    </div>
  );
}
