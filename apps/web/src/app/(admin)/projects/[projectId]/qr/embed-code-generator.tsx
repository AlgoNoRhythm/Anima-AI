'use client';

import { useState, useCallback } from 'react';

interface EmbedCodeGeneratorProps {
  projectSlug: string;
}

export function EmbedCodeGenerator({ projectSlug }: EmbedCodeGeneratorProps) {
  const [copiedIframe, setCopiedIframe] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const getOrigin = () => {
    if (typeof window === 'undefined') return 'https://your-domain.com';
    return window.location.origin;
  };

  const iframeCode = `<iframe src="${getOrigin()}/embed/${projectSlug}" width="400" height="600" style="border:none;border-radius:12px;" allow="clipboard-write"></iframe>`;

  const scriptCode = `<script src="${getOrigin()}/embed/${projectSlug}/widget.js"></script>`;

  const copyToClipboard = useCallback(async (text: string, type: 'iframe' | 'script') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'iframe') {
        setCopiedIframe(true);
        setTimeout(() => setCopiedIframe(false), 2000);
      } else {
        setCopiedScript(true);
        setTimeout(() => setCopiedScript(false), 2000);
      }
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      if (type === 'iframe') {
        setCopiedIframe(true);
        setTimeout(() => setCopiedIframe(false), 2000);
      } else {
        setCopiedScript(true);
        setTimeout(() => setCopiedScript(false), 2000);
      }
    }
  }, []);

  return (
    <div className="rounded-xl border bg-card p-6 shadow-elevated">
      <h3 className="text-lg font-semibold mb-1">Embed Widget</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Add the chat widget to any website. Choose between an iframe embed or a floating widget script.
      </p>

      {/* Iframe embed */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Iframe Embed</label>
        <p className="text-xs text-muted-foreground mb-2">
          Paste this code where you want the chat widget to appear on your page.
        </p>
        <div className="relative">
          <pre className="rounded-lg border bg-muted/50 p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
            {iframeCode}
          </pre>
          <button
            type="button"
            onClick={() => copyToClipboard(iframeCode, 'iframe')}
            className="absolute top-2 right-2 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium shadow-sm transition-all duration-200 hover:bg-accent active:scale-95"
          >
            {copiedIframe ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Script tag widget */}
      <div>
        <label className="block text-sm font-medium mb-2">Floating Widget (Script Tag)</label>
        <p className="text-xs text-muted-foreground mb-2">
          Add this script to your page to show a floating chat button in the bottom-right corner.
          Clicking it opens the chat in a popup overlay.
        </p>
        <div className="relative">
          <pre className="rounded-lg border bg-muted/50 p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
            {scriptCode}
          </pre>
          <button
            type="button"
            onClick={() => copyToClipboard(scriptCode, 'script')}
            className="absolute top-2 right-2 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium shadow-sm transition-all duration-200 hover:bg-accent active:scale-95"
          >
            {copiedScript ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Preview link */}
      <div className="mt-4 rounded-lg border bg-muted/50 px-3 py-2">
        <p className="text-xs text-muted-foreground mb-0.5">Embed URL</p>
        <p className="text-sm font-mono truncate">
          {getOrigin()}/embed/{projectSlug}
        </p>
      </div>
    </div>
  );
}
