'use client';

import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface ChatMarkdownProps {
  content: string;
  className?: string;
}

const components: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline decoration-current/40 underline-offset-2 hover:decoration-current/80 transition-colors"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="mb-2 last:mb-0 ml-4 list-disc space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 last:mb-0 ml-4 list-decimal space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  h1: ({ children }) => <h1 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-[15px] font-bold mb-1.5 mt-2.5 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>,
  h4: ({ children }) => <h4 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h4>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-current/20 pl-3 my-2 opacity-85">{children}</blockquote>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return (
        <code className="block text-[0.85em] leading-relaxed">{children}</code>
      );
    }
    return (
      <code className="rounded px-1 py-0.5 text-[0.85em] bg-current/[0.08] font-mono">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-2 last:mb-0 rounded-lg bg-current/[0.06] px-3 py-2 overflow-x-auto font-mono text-[0.85em]">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-3 border-current/15" />,
  table: ({ children }) => (
    <div className="mb-2 last:mb-0 overflow-x-auto rounded-lg border border-current/10">
      <table className="min-w-full text-[0.9em]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-current/[0.05]">{children}</thead>,
  th: ({ children }) => <th className="px-2 py-1.5 text-left font-semibold border-b border-current/10">{children}</th>,
  td: ({ children }) => <td className="px-2 py-1.5 border-b border-current/5">{children}</td>,
};

export const ChatMarkdown = memo(function ChatMarkdown({ content, className }: ChatMarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
});
