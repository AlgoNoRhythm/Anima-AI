'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowUp, FileText, ArrowRight } from 'lucide-react';
import { ChatMarkdown } from '@anima-ai/ui';
import { useChat } from '@/lib/hooks/use-chat';

interface EmbedChatProps {
  projectSlug: string;
  projectName: string;
  welcomeMessage: string;
  personality?: { name: string };
  suggestedQuestions?: string[];
  logoUrl?: string | null;
  primaryColor?: string;
}

function BotAvatar({ logoUrl, primaryColor, name, size = 28 }: { logoUrl?: string | null; primaryColor?: string; name: string; size?: number }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  if (primaryColor) {
    return (
      <div
        className="rounded-full flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size, backgroundColor: `${primaryColor}20` }}
      >
        <div
          className="rounded-full"
          style={{ width: size * 0.6, height: size * 0.6, backgroundColor: primaryColor }}
        />
      </div>
    );
  }
  return (
    <div
      className="rounded-full bg-chat-accent/15 flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <div
        className="rounded-full bg-chat-accent"
        style={{ width: size * 0.55, height: size * 0.55 }}
      />
    </div>
  );
}

export function EmbedChat({
  projectSlug,
  projectName,
  welcomeMessage,
  personality,
  suggestedQuestions,
  logoUrl,
  primaryColor,
}: EmbedChatProps) {
  const { messages, isLoading, error, send, submitFeedback } = useChat(projectSlug);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [ratings, setRatings] = useState<Record<string, 'positive' | 'negative'>>({});

  const displayName = personality?.name || projectName;

  const handleFeedback = useCallback(
    (messageId: string, feedback: 'positive' | 'negative') => {
      if (ratings[messageId]) return;
      setRatings((prev) => ({ ...prev, [messageId]: feedback }));
      submitFeedback(messageId, feedback);
    },
    [ratings, submitFeedback],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput('');
    send(trimmed);
  }

  function handleSuggestedQuestion(question: string) {
    if (isLoading) return;
    send(question);
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-chat-bg">
      {error && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-3 py-1.5 text-center shrink-0">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="p-3 space-y-3">
          {/* Welcome state */}
          {messages.length === 0 && (
            <div className="text-center pt-6 pb-2 animate-fade-in">
              {logoUrl ? (
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-2.5 overflow-hidden">
                  <img src={logoUrl} alt="" className="w-12 h-12 object-cover" />
                </div>
              ) : (
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-chat-accent/10 mb-2.5">
                  <div className="w-7 h-7 rounded-full bg-chat-accent" />
                </div>
              )}
              <p className="text-sm font-medium text-foreground">{welcomeMessage}</p>
              <p className="text-xs text-chat-muted mt-0.5">
                {personality?.name || 'Powered by Anima AI'}
              </p>

              {/* Suggested questions — pill chips */}
              {suggestedQuestions && suggestedQuestions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
                  {suggestedQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => handleSuggestedQuestion(question)}
                      className="rounded-full border border-chat-accent/25 bg-chat-surface px-2.5 py-1 text-xs text-foreground transition-all duration-150 hover:border-chat-accent/50 hover:bg-chat-accent/5"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {msg.role === 'assistant' && (
                <div className="flex-shrink-0 mt-0.5">
                  <BotAvatar logoUrl={logoUrl} primaryColor={primaryColor} name={displayName} />
                </div>
              )}

              <div className="max-w-[82%] min-w-0">
                <div
                  className={`px-3 py-2 text-[13px] leading-[1.5] ${
                    msg.role === 'user'
                      ? 'bg-chat-user text-chat-user-fg rounded-2xl rounded-br-sm'
                      : 'bg-chat-assistant text-foreground rounded-2xl rounded-bl-sm'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <ChatMarkdown content={msg.content} />
                  )}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-2 space-y-1 border-t border-foreground/8 pt-1.5">
                      <p className="text-[10px] text-chat-muted">Sources</p>
                      {msg.citations.map((c, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[10px] bg-chat-surface/60 border border-chat-border rounded-md p-1.5">
                          <FileText className="w-3 h-3 text-chat-accent flex-shrink-0" />
                          <span>
                            <span className="font-medium text-foreground">{c.documentTitle}</span>
                            {c.pageNumbers?.length > 0 && (
                              <span className="text-chat-muted"> - p. {c.pageNumbers.join(', ')}</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Follow-up chips */}
                {msg.role === 'assistant' && msg.followUps && msg.followUps.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {msg.followUps.map((question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() => handleSuggestedQuestion(question)}
                        disabled={isLoading}
                        className="rounded-full border border-chat-accent/25 bg-chat-surface px-2 py-0.5 text-[11px] text-foreground transition-all duration-150 hover:border-chat-accent/50 disabled:opacity-50"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                )}

                {/* Feedback */}
                {msg.role === 'assistant' && msg.content && (
                  <div className="flex items-center gap-0.5 mt-0.5 ml-0.5">
                    <button
                      type="button"
                      onClick={() => handleFeedback(msg.id, 'positive')}
                      disabled={!!ratings[msg.id]}
                      className={`inline-flex items-center justify-center w-5 h-5 rounded transition-colors ${
                        ratings[msg.id] === 'positive'
                          ? 'text-chat-accent'
                          : ratings[msg.id]
                            ? 'text-chat-muted/30 cursor-default'
                            : 'text-chat-muted/50 hover:text-chat-accent'
                      }`}
                      aria-label="Thumbs up"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 10v12" />
                        <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFeedback(msg.id, 'negative')}
                      disabled={!!ratings[msg.id]}
                      className={`inline-flex items-center justify-center w-5 h-5 rounded transition-colors ${
                        ratings[msg.id] === 'negative'
                          ? 'text-red-500'
                          : ratings[msg.id]
                            ? 'text-chat-muted/30 cursor-default'
                            : 'text-chat-muted/50 hover:text-red-500'
                      }`}
                      aria-label="Thumbs down"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 14V2" />
                        <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-2">
              <div className="flex-shrink-0 mt-0.5">
                <BotAvatar logoUrl={logoUrl} primaryColor={primaryColor} name={displayName} />
              </div>
              <div className="bg-chat-assistant rounded-2xl rounded-bl-sm px-3 py-2">
                <div className="flex gap-1.5">
                  <span className="w-1.5 h-1.5 bg-chat-accent/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-chat-accent/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-chat-accent/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="bg-chat-surface border-t border-chat-border p-2 shrink-0 shadow-soft">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            aria-label="Type your message"
            className="w-full h-9 rounded-full border border-chat-border bg-chat-bg pl-3 pr-10 text-base text-foreground shadow-soft transition-all duration-150 placeholder:text-chat-muted focus-visible:outline-none focus-visible:border-chat-accent/40 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            aria-label="Send message"
            className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-chat-accent text-chat-accent-fg transition-all duration-150 hover:brightness-110 active:scale-95 disabled:opacity-30"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Minimal branding footer — safe-area padding for iPhone home bar */}
      <div className="px-2 py-1 text-center shrink-0 bg-chat-surface" style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}>
        <p className="text-[10px] text-chat-muted/60">
          Powered by <span className="font-medium">Anima AI</span>
        </p>
      </div>
    </div>
  );
}
