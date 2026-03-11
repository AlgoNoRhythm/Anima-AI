'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { sendMessage, createSession, sendFeedback as sendFeedbackApi } from '../api-client';

/** Generate a UUID that works in non-secure contexts (HTTP over LAN). */
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for non-secure contexts (e.g. HTTP on mobile over LAN)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{
    documentId: string;
    documentTitle: string;
    pageNumbers: number[];
    text: string;
  }>;
  followUps?: string[];
  incomplete?: boolean;
}

const STORAGE_KEY_MESSAGES = (slug: string) => `anima-chat-${slug}`;
const STORAGE_KEY_SESSION = (slug: string) => `anima-session-${slug}`;

function loadFromStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function saveToStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage might be full or unavailable
  }
}

function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

interface ChatTranslations {
  failedToConnect?: string;
  tooManyMessages?: string;
  tooManyMessagesWait?: string;
  failedToSendMessage?: string;
}

export function useChat(projectSlug: string, translations?: ChatTranslations) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  // Restore messages and session token from localStorage on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const savedMessages = loadFromStorage<Message[]>(STORAGE_KEY_MESSAGES(projectSlug));
    if (savedMessages && savedMessages.length > 0) {
      setMessages(savedMessages);
    }

    const savedSession = loadFromStorage<string>(STORAGE_KEY_SESSION(projectSlug));
    if (savedSession) {
      sessionTokenRef.current = savedSession;
    }
  }, [projectSlug]);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    if (!initializedRef.current) return;
    saveToStorage(STORAGE_KEY_MESSAGES(projectSlug), messages);
  }, [messages, projectSlug]);

  const initSession = useCallback(async () => {
    if (sessionTokenRef.current) return sessionTokenRef.current;

    let retries = 2;
    while (retries >= 0) {
      try {
        const { sessionToken: token } = await createSession(projectSlug);
        sessionTokenRef.current = token;
        saveToStorage(STORAGE_KEY_SESSION(projectSlug), token);
        return token;
      } catch (err) {
        if (retries === 0) throw err;
        retries--;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    throw new Error('Failed to create session');
  }, [projectSlug]);

  const send = useCallback(async (content: string, retryCount = 0) => {
    setError(null);

    let token: string;
    try {
      token = await initSession();
    } catch {
      setError(translations?.failedToConnect ?? 'Failed to connect. Please refresh and try again.');
      return;
    }

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
    };
    // Only add the user message on the first attempt, not on retries
    if (retryCount === 0) {
      setMessages((prev) => [...prev, userMessage]);
    }
    setIsLoading(true);

    try {
      // Build history from existing messages (limit to last 10)
      const currentMessages = retryCount === 0
        ? [...messages, userMessage]
        : messages;
      const historyForApi = currentMessages
        .filter((m) => m.content) // skip empty content
        .slice(-10) // limit to last 10 messages
        .slice(0, -1) // exclude the current user message (sent separately)
        .map((m) => ({ role: m.role, content: m.content }));

      let response = await sendMessage(projectSlug, content, token, historyForApi);

      // Session expired — clear stale state, get a fresh session, resend
      if (response.status === 401) {
        sessionTokenRef.current = null;
        removeFromStorage(STORAGE_KEY_SESSION(projectSlug));
        removeFromStorage(STORAGE_KEY_MESSAGES(projectSlug));
        setMessages([userMessage]);

        const newToken = await initSession();
        response = await sendMessage(projectSlug, content, newToken, []);
      }

      if (!response.ok) {
        if (response.status === 429) {
          let retryAfter: number | null = null;
          try {
            const body = await response.json();
            if (typeof body.retryAfter === 'number') {
              retryAfter = body.retryAfter;
            }
          } catch {
            // ignore parse errors
          }
          const msg = retryAfter != null
            ? (translations?.tooManyMessages ?? 'Too many messages. Please wait {seconds} seconds.').replace('{seconds}', String(retryAfter))
            : (translations?.tooManyMessagesWait ?? 'Too many messages. Please wait before sending another message.');
          setError(msg);
          return;
        }
        throw new Error(`Server error: ${response.status}`);
      }
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let assistantId = generateId();
      let receivedDone = false;

      setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      function processSseLine(trimmed: string) {
        if (!trimmed.startsWith('data: ')) return;
        try {
          const data = JSON.parse(trimmed.slice(6));
          if (data.type === 'start' && data.messageId) {
            // Replace client-side placeholder ID with real server ID
            const realId = data.messageId as string;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, id: realId } : m,
              ),
            );
            assistantId = realId;
          } else if (data.type === 'text') {
            assistantContent += data.content;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: assistantContent } : m,
              ),
            );
          } else if (data.type === 'citations') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, citations: data.citations } : m,
              ),
            );
          } else if (data.type === 'followups') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, followUps: data.questions } : m,
              ),
            );
          } else if (data.type === 'done') {
            receivedDone = true;
          } else if (data.type === 'error') {
            setError(data.message);
          }
        } catch {
          // Skip malformed SSE data
        }
      }

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Process any remaining complete lines in the buffer
          if (buffer.trim().length > 0) {
            const remainingLines = buffer.split('\n');
            for (const line of remainingLines) {
              processSseLine(line.trim());
            }
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Only parse complete lines (those ending with \n)
        const lastNewline = buffer.lastIndexOf('\n');
        if (lastNewline === -1) continue; // No complete line yet, keep buffering

        const completePart = buffer.slice(0, lastNewline);
        buffer = buffer.slice(lastNewline + 1);

        const lines = completePart.split('\n');
        for (const line of lines) {
          processSseLine(line.trim());
        }
      }

      // If the stream ended without a `done` event, mark the message as incomplete
      if (!receivedDone && assistantContent) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, incomplete: true } : m,
          ),
        );
      }
    } catch (err) {
      // Attempt reconnection on network errors (up to 2 retries)
      const MAX_RETRIES = 2;
      if (retryCount < MAX_RETRIES) {
        console.warn(`Chat network error, retrying (${retryCount + 1}/${MAX_RETRIES})...`, err);
        // Remove the failed assistant message placeholder before retrying
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && last.content === '') {
            return prev.slice(0, -1);
          }
          return prev;
        });
        await new Promise((r) => setTimeout(r, 1000 * (retryCount + 1)));
        return send(content, retryCount + 1);
      }
      setError(translations?.failedToSendMessage ?? 'Failed to send message. Please try again.');
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectSlug, initSession, messages]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    sessionTokenRef.current = null;
    removeFromStorage(STORAGE_KEY_MESSAGES(projectSlug));
    removeFromStorage(STORAGE_KEY_SESSION(projectSlug));
  }, [projectSlug]);

  const submitFeedback = useCallback(async (messageId: string, feedback: 'positive' | 'negative') => {
    const token = sessionTokenRef.current;
    if (!token) return;
    try {
      await sendFeedbackApi(messageId, feedback, token);
    } catch (err) {
      console.error('Feedback error:', err);
    }
  }, []);

  const getSessionToken = useCallback(() => sessionTokenRef.current, []);

  return { messages, isLoading, error, send, clearChat, submitFeedback, getSessionToken };
}
