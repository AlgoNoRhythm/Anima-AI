import * as React from 'react';
import { cn } from '../../lib/utils';
import { CitationCard } from './citation-card';
import { ChatMarkdown } from './chat-markdown';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{
    documentTitle: string;
    pageNumbers: number[];
    text: string;
  }>;
}

export function ChatBubble({ role, content, citations }: ChatBubbleProps) {
  return (
    <div className={cn('flex animate-slide-up', role === 'user' ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[72%] rounded-2xl px-4 py-3',
          role === 'user'
            ? 'bg-chat-user text-chat-user-fg rounded-br-sm'
            : 'bg-chat-assistant text-foreground rounded-bl-sm',
        )}
      >
        <ChatMarkdown content={content} className="text-[14px] leading-[1.55]" />
        {citations && citations.length > 0 && (
          <div className="mt-2.5 space-y-1.5 border-t border-foreground/8 pt-2">
            {citations.map((citation, i) => (
              <CitationCard key={i} {...citation} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
