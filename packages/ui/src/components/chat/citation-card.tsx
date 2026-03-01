'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

interface CitationCardProps {
  documentTitle: string;
  pageNumbers: number[];
  text: string;
}

export function CitationCard({ documentTitle, pageNumbers, text }: CitationCardProps) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <button
      type="button"
      onClick={() => setExpanded(!expanded)}
      className={cn(
        'w-full text-left rounded-lg border border-chat-border bg-chat-surface/60 px-3 py-2 text-xs transition-all duration-150 hover:bg-chat-surface',
        expanded ? 'max-h-40' : 'max-h-8 overflow-hidden',
      )}
    >
      <span className="font-medium text-chat-accent">{documentTitle}</span>
      <span className="text-chat-muted ml-1">p.{pageNumbers.join(', ')}</span>
      {expanded && <p className="mt-1.5 text-chat-muted leading-relaxed">{text}</p>}
    </button>
  );
}
