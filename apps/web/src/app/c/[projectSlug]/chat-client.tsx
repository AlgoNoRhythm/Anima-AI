'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ArrowUp, FileText, ChevronDown } from 'lucide-react';
import { ChatMarkdown } from '@anima-ai/ui';
import { computeThemeVars } from '@anima-ai/shared';
import { useChat } from '@/lib/hooks/use-chat';
import { FeedbackForm } from './feedback-form';
import type { FeedbackConfig } from './feedback-form';
import type { ChatUITranslations, SupportedLocale } from '@/lib/locale/types';

// Lazy-load PDF viewer — must be client-only (uses canvas rendering)
const PdfViewerOverlay = dynamic(
  () => import('./pdf-viewer').then((m) => ({ default: m.PdfViewerOverlay })),
  { ssr: false },
);
type StackedDocument = import('./pdf-viewer').StackedDocument;

/** Lock body scroll. Layout uses 100dvh via CSS — no JS height hacks. */
function useLockBody() {
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);
}

interface DocumentInfo {
  id: string;
  title: string;
  totalPages: number;
}

interface ChatClientProps {
  projectSlug: string;
  projectName: string;
  welcomeMessage: string;
  personality?: { name: string };
  suggestedQuestions?: string[];
  logoUrl?: string | null;
  primaryColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  borderRadius?: string;
  showDisclaimer: boolean;
  disclaimerText: string;
  documents?: DocumentInfo[];
  actionButtonLabel?: string;
  mode?: 'chat' | 'pdf' | 'both';
  feedbackConfig?: FeedbackConfig | null;
  t: ChatUITranslations;
  locale: SupportedLocale;
}

function BotAvatar({ logoUrl, size = 34 }: { logoUrl?: string | null; size?: number }) {
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

export function ChatClient({
  projectSlug,
  projectName,
  welcomeMessage,
  personality,
  suggestedQuestions,
  logoUrl,
  primaryColor,
  backgroundColor,
  fontFamily,
  borderRadius,
  showDisclaimer,
  disclaimerText,
  documents = [],
  actionButtonLabel,
  mode = 'both',
  feedbackConfig,
  t,
  locale,
}: ChatClientProps) {
  useLockBody();
  const { messages, isLoading, error, send, clearChat, submitFeedback, getSessionToken } = useChat(projectSlug, t);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [ratings, setRatings] = useState<Record<string, 'positive' | 'negative'>>({});
  const [expandedCitations, setExpandedCitations] = useState<Record<string, boolean>>({});
  const [disclaimerVisible, setDisclaimerVisible] = useState(false);
  const [pdfViewer, setPdfViewer] = useState<{ absolutePage: number; highlightText?: string } | null>(null);

  const showChat = mode !== 'pdf';
  const showDocButton = mode !== 'chat';
  const hasDocuments = documents.length > 0;

  // Offset map: cumulative page offsets for each document
  const offsetMap = useMemo(() => {
    const map: { documentId: string; startPage: number; pageCount: number }[] = [];
    let cumulative = 0;
    for (const doc of documents) {
      map.push({ documentId: doc.id, startPage: cumulative + 1, pageCount: doc.totalPages });
      cumulative += doc.totalPages;
    }
    return map;
  }, [documents]);

  /** Convert a document-local page number to an absolute page across all stacked documents */
  function toAbsolutePage(documentId: string, pageWithinDoc: number): number {
    const entry = offsetMap.find((e) => e.documentId === documentId);
    if (!entry) return pageWithinDoc;
    return entry.startPage + pageWithinDoc - 1;
  }

  // Build stacked documents array for the PDF viewer
  const stackedDocuments: StackedDocument[] = useMemo(
    () => documents.map((d) => ({ id: d.id, title: d.title, totalPages: d.totalPages, url: `/api/documents/${d.id}/file` })),
    [documents],
  );

  useEffect(() => {
    if (showDisclaimer) {
      const storageKey = `anima-disclaimer-dismissed-${projectSlug}`;
      const dismissed = sessionStorage.getItem(storageKey);
      if (!dismissed) {
        setDisclaimerVisible(true);
      }
    }
  }, [showDisclaimer, projectSlug]);

  function dismissDisclaimer() {
    const storageKey = `anima-disclaimer-dismissed-${projectSlug}`;
    sessionStorage.setItem(storageKey, '1');
    setDisclaimerVisible(false);
  }

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
    const trimmed = inputRef.current?.value.trim() ?? '';
    if (!trimmed || isLoading) return;
    if (inputRef.current) inputRef.current.value = '';
    send(trimmed);
  }

  function handleSuggestionClick(question: string) {
    if (isLoading) return;
    send(question);
  }

  function handleClearChat() {
    clearChat();
    setRatings({});
  }

  function openPdfStacked(absolutePage = 1, highlightText?: string) {
    setPdfViewer({ absolutePage, highlightText });
  }

  // Build CSS variable overrides for the theme
  const cssVars = computeThemeVars({ primaryColor, backgroundColor, borderRadius, fontFamily });
  const themeStyle: React.CSSProperties = {};
  const styleVars = themeStyle as Record<string, string>;
  for (const [key, value] of Object.entries(cssVars)) {
    if (key === 'colorScheme') {
      themeStyle.colorScheme = value;
    } else if (key === 'fontFamily') {
      themeStyle.fontFamily = value;
    } else {
      styleVars[key] = value;
    }
  }

  return (
    <div id="chat-root" className="fixed inset-0 flex flex-col h-dvh bg-chat-bg" style={themeStyle}>
      {/* Header — clean surface, thin border */}
      <header className="bg-chat-surface border-b border-chat-border px-5 py-4 shrink-0">
        <div className="max-w-[700px] mx-auto flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-chat-accent/15 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-chat-accent" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-[15px] font-medium text-foreground leading-tight truncate">
              {personality?.name || projectName}
            </h1>
            <p className="text-xs text-chat-muted">{t.poweredBy}</p>
          </div>
          {/* Action button — opens document */}
          {showDocButton && hasDocuments && (
            <button
              type="button"
              onClick={() => openPdfStacked(1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-chat-accent/10 text-chat-accent hover:bg-chat-accent/20 transition-colors shrink-0"
            >
              {actionButtonLabel || 'Open PDF'}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>
          )}
          {/* Restart chat */}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearChat}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-chat-muted hover:text-foreground hover:bg-muted transition-colors"
              aria-label={t.restartChat}
              title={t.restartChat}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M8 16H3v5" />
              </svg>
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 text-center shrink-0">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* AI Disclaimer Banner */}
      {disclaimerVisible && (
        <div className="border-b px-4 py-2.5 shrink-0" style={{ backgroundColor: 'hsl(42 100% 96%)', borderColor: 'hsl(42 80% 82%)' }}>
          <div className="max-w-[700px] mx-auto flex items-center gap-3">
            <svg className="w-4 h-4 text-chat-accent flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <p className="text-xs text-foreground/80 flex-1">{disclaimerText}</p>
            <button
              type="button"
              onClick={dismissDisclaimer}
              className="inline-flex items-center justify-center w-6 h-6 rounded-md text-chat-muted hover:text-foreground transition-colors flex-shrink-0"
              aria-label={t.dismissDisclaimer}
              title={t.dismiss}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Chat area — always full height, no tabs */}
      <div className="flex-1 flex flex-col min-h-0">
        {renderChatArea()}
      </div>

      {/* Branding footer — safe-area padding for iPhone home bar */}
      <footer className="px-4 py-1.5 text-center shrink-0 bg-chat-surface border-t border-chat-border" style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}>
        <span className="text-[10px]">
          {feedbackConfig?.enabled && messages.length > 0 && (
            <>
              <button type="button" onClick={() => setShowFeedbackForm(true)} className="text-chat-muted hover:text-foreground transition-colors cursor-pointer underline underline-offset-2">{t.leaveFeedback}</button>
              <span className="text-chat-muted/30 mx-1.5">&middot;</span>
            </>
          )}
          <a href="https://anima-ai.io" target="_blank" rel="noopener noreferrer" className="text-chat-muted/60 hover:text-chat-muted transition-colors">{t.visitAnima}</a>
        </span>
      </footer>

      {/* Feedback form overlay */}
      {showFeedbackForm && feedbackConfig && (
        <FeedbackForm
          config={feedbackConfig}
          sessionToken={getSessionToken()}
          primaryColor={primaryColor}
          onClose={() => setShowFeedbackForm(false)}
          t={t}
        />
      )}

      {/* PDF viewer overlay */}
      {pdfViewer && (
        <PdfViewerOverlay
          documents={stackedDocuments}
          initialAbsolutePage={pdfViewer.absolutePage}
          highlightText={pdfViewer.highlightText}
          onClose={() => setPdfViewer(null)}
          t={t}
        />
      )}
    </div>
  );

  function renderChatArea() {
    return (
      <>
        {/* Messages area — scrollable, overscroll-contained to prevent pull-to-refresh */}
        <div className="flex-1 overflow-y-auto overscroll-contain" role="log" aria-live="polite" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-[700px] mx-auto px-4 py-6 space-y-4">
            {/* Welcome state */}
            {messages.length === 0 && (
              <div className="text-center pt-8 pb-4 animate-fade-in">
                {logoUrl ? (
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 overflow-hidden">
                    <img src={logoUrl} alt="" className="w-16 h-16 object-cover" />
                  </div>
                ) : (
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-chat-accent/10 mb-4">
                    <div className="w-10 h-10 rounded-full bg-chat-accent" />
                  </div>
                )}
                <p className="text-lg font-medium text-foreground">{welcomeMessage}</p>
                <p className="text-sm text-chat-muted mt-1">
                  {showChat ? t.askMeAnything : t.browseDocument}
                </p>

                {/* Suggested starter questions — pill chips */}
                {showChat && suggestedQuestions && suggestedQuestions.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2 justify-center">
                    {suggestedQuestions.map((question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() => handleSuggestionClick(question)}
                        disabled={isLoading}
                        className="rounded-full border border-chat-accent/30 bg-chat-surface px-3 py-1.5 text-sm text-foreground transition-all duration-150 hover:border-chat-accent/60 hover:bg-chat-accent/5 active:scale-[0.97] disabled:opacity-50"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Message list */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Bot avatar */}
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 mt-0.5">
                    <BotAvatar logoUrl={logoUrl} />
                  </div>
                )}

                <div className="max-w-[72%] min-w-0">
                  <div
                    className={`px-4 py-3 text-[14px] leading-[1.55] ${
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
                    {msg.incomplete && (
                      <p className="mt-1 text-xs opacity-50 italic">{t.responseInterrupted}</p>
                    )}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-2.5 border-t border-foreground/8 pt-2">
                        <button
                          type="button"
                          onClick={() => setExpandedCitations((prev) => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                          className="flex items-center gap-1 text-xs text-chat-muted hover:text-foreground transition-colors"
                        >
                          <FileText className="w-3 h-3" />
                          <span>{msg.citations.length !== 1 ? t.sources.replace('{count}', String(msg.citations.length)) : t.source.replace('{count}', '1')}</span>
                          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expandedCitations[msg.id] ? 'rotate-180' : ''}`} />
                        </button>
                        {expandedCitations[msg.id] && (
                          <div className="mt-1.5 space-y-1.5">
                            {msg.citations.map((c, i) => {
                              const absPages = c.pageNumbers?.map((p) => toAbsolutePage(c.documentId, p)) ?? [];
                              const firstAbsPage = absPages[0] ?? 1;
                              return (
                                <button
                                  type="button"
                                  key={i}
                                  onClick={() => openPdfStacked(firstAbsPage, c.text)}
                                  className="w-full flex items-center gap-2 text-left text-xs bg-chat-surface/60 border border-chat-border rounded-lg p-2 hover:bg-chat-surface transition-colors cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5 text-chat-accent flex-shrink-0" />
                                  <span>
                                    {absPages.length > 0 && (
                                      <span className="font-medium text-foreground">{t.page} {absPages.join(', ')}</span>
                                    )}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Follow-up questions — pill chips */}
                  {msg.role === 'assistant' && msg.followUps && msg.followUps.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {msg.followUps.map((question) => (
                        <button
                          key={question}
                          type="button"
                          onClick={() => handleSuggestionClick(question)}
                          disabled={isLoading}
                          className="rounded-full border border-chat-accent/25 bg-chat-surface px-3 py-1 text-xs text-foreground transition-all duration-150 hover:border-chat-accent/50 hover:bg-chat-accent/5 active:scale-[0.97] disabled:opacity-50"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Feedback buttons */}
                  {msg.role === 'assistant' && msg.content && (
                    <div className="flex items-center gap-0.5 mt-1 ml-0.5">
                      <button
                        type="button"
                        onClick={() => handleFeedback(msg.id, 'positive')}
                        disabled={!!ratings[msg.id]}
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-md transition-colors ${
                          ratings[msg.id] === 'positive'
                            ? 'text-chat-accent'
                            : ratings[msg.id]
                              ? 'text-chat-muted/30 cursor-default'
                              : 'text-chat-muted/50 hover:text-chat-accent'
                        }`}
                        aria-label={t.thumbsUp}
                        title={t.goodResponse}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M7 10v12" />
                          <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFeedback(msg.id, 'negative')}
                        disabled={!!ratings[msg.id]}
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-md transition-colors ${
                          ratings[msg.id] === 'negative'
                            ? 'text-red-500'
                            : ratings[msg.id]
                              ? 'text-chat-muted/30 cursor-default'
                              : 'text-chat-muted/50 hover:text-red-500'
                        }`}
                        aria-label={t.thumbsDown}
                        title={t.badResponse}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
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
              <div className="flex gap-2.5">
                <div className="flex-shrink-0 mt-0.5">
                  <BotAvatar logoUrl={logoUrl} />
                </div>
                <div className="bg-chat-assistant rounded-2xl rounded-bl-sm px-4 py-3">
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

        {/* Input bar — surface bg, subtle top border, slight elevation */}
        {showChat && (
          <div className="bg-chat-surface border-t border-chat-border px-4 py-3 shrink-0 shadow-soft">
            <form onSubmit={handleSubmit} className="max-w-[700px] mx-auto relative">
              <input
                ref={inputRef}
                type="text"
                placeholder={t.typeYourMessage}
                disabled={isLoading}
                aria-label={t.typeYourMessage}
                className="w-full h-11 rounded-full border border-chat-border bg-chat-bg pl-4 pr-12 text-base text-foreground shadow-soft transition-all duration-150 placeholder:text-chat-muted focus-visible:outline-none focus-visible:border-chat-accent/40 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading}
                aria-label={t.sendMessage}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-chat-accent text-chat-accent-fg transition-all duration-150 hover:brightness-110 active:scale-95 disabled:opacity-30"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </>
    );
  }
}
