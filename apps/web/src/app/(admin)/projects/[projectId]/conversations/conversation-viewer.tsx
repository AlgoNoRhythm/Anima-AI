'use client';

import { useState, useCallback } from 'react';
import { ChatMarkdown } from '@anima-ai/ui';

interface SessionPreview {
  id: string;
  createdAt: string;
  messageCount: number;
  firstUserMessage: string | null;
}

interface Message {
  id: string;
  role: string;
  content: string;
  feedback?: string | null;
  createdAt: string;
}

interface ConversationViewerProps {
  projectId: string;
  initialSessions: SessionPreview[];
  initialTotal: number;
  initialPage: number;
  initialSearch: string;
  limit: number;
}

export function ConversationViewer({
  projectId,
  initialSessions,
  initialTotal,
  initialPage,
  initialSearch,
  limit,
}: ConversationViewerProps) {
  const [sessions, setSessions] = useState(initialSessions);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState(initialSearch);
  const [searching, setSearching] = useState(false);

  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const totalPages = Math.ceil(total / limit);

  const fetchSessions = useCallback(async (s: string, p: number) => {
    setSearching(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit) });
      if (s) params.set('search', s);
      const res = await fetch(`/api/projects/${projectId}/conversations?${params}`);
      const data = await res.json();
      setSessions(data.sessions ?? []);
      setTotal(data.total ?? 0);
      setPage(p);
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  }, [projectId, limit]);

  const handleSearch = useCallback(() => {
    fetchSessions(search, 1);
  }, [search, fetchSessions]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  }, [handleSearch]);

  const openSession = useCallback(async (sessionId: string) => {
    setSelectedSession(sessionId);
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/conversations?sessionId=${sessionId}`);
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, [projectId]);

  if (selectedSession) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => { setSelectedSession(null); setMessages([]); }}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to conversations
        </button>

        <div className="rounded-xl border bg-card shadow-sm p-4">
          <p className="text-xs text-muted-foreground mb-4">
            Session {selectedSession.slice(0, 8)}...
          </p>

          {loadingMessages ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : ''}`}>
                  <div className="h-12 bg-muted rounded-lg w-2/3" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No messages in this session.</p>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <ChatMarkdown content={msg.content} />
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] opacity-60">
                        {new Date(msg.createdAt).toLocaleString()}
                      </span>
                      {msg.feedback && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          msg.feedback === 'positive'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {msg.feedback === 'positive' ? '👍' : '👎'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search conversations..."
          className="flex-1 h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {total} conversation{total !== 1 ? 's' : ''} found
      </p>

      {/* Session list */}
      {sessions.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center shadow-sm">
          <svg className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-sm font-medium">No conversations yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Conversations will appear here when users start chatting.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm divide-y">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => openSession(session.id)}
              className="w-full text-left p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {session.firstUserMessage || 'No messages'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(session.createdAt).toLocaleDateString()} at{' '}
                    {new Date(session.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-medium">
                    {session.messageCount} msg{session.messageCount !== 1 ? 's' : ''}
                  </span>
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => fetchSessions(search, page - 1)}
            disabled={page <= 1 || searching}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => fetchSessions(search, page + 1)}
            disabled={page >= totalPages || searching}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
