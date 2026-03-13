import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { createDatabase, projectQueries } from '@anima-ai/database';
import { createLogger } from '@anima-ai/shared';
import type { AppEnv } from '../app.js';
import { rateLimiter } from '../middleware/rate-limiter.js';
import { checkProjectRateLimit } from '../middleware/project-rate-limiter.js';
import { validateSession } from '../middleware/session-auth.js';
import { handleChat } from '../services/chat-service.js';

const log = createLogger('chat-route');

export const chatRoutes = new Hono<AppEnv>();

chatRoutes.post('/:projectSlug', rateLimiter(), validateSession(), async (c) => {
  const projectSlug = c.req.param('projectSlug');
  let body: { message: string; history?: Array<{ role: 'user' | 'assistant'; content: string }> };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }
  const message = body.message?.trim();
  const sessionId = c.get('sessionId')!;

  if (!message) {
    return c.json({ error: 'Message is required' }, 400);
  }

  if (message.length > 10000) {
    return c.json({ error: 'Message too long' }, 400);
  }

  // Per-project rate limiting
  const db = createDatabase();
  const project = await projectQueries(db).findBySlug(projectSlug);
  if (project) {
    const settings = (project.settings ?? {}) as Record<string, unknown>;
    const projectRateLimit = typeof settings.rateLimit === 'number' ? settings.rateLimit : undefined;
    const forwardedFor = c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
    const identifier = c.req.header('X-Session-Token') || forwardedFor || c.req.header('x-real-ip') || 'unknown';
    const result = await checkProjectRateLimit(project.id, identifier, {
      maxRequests: projectRateLimit,
    });
    if (result) {
      c.header('Retry-After', String(result.retryAfter));
      return c.json({ error: result.error, retryAfter: result.retryAfter }, 429);
    }
  }

  // Validate and sanitize history - limit to last 10 messages
  const rawHistory = Array.isArray(body.history) ? body.history : [];
  const history = rawHistory
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-10);

  // Disable proxy buffering so SSE chunks stream in real-time
  c.header('X-Accel-Buffering', 'no');
  c.header('Cache-Control', 'no-cache, no-transform');

  // 5-minute max stream duration to prevent slow-client DoS
  const STREAM_TIMEOUT_MS = 5 * 60 * 1000;

  return streamSSE(c, async (stream) => {
    const timeout = setTimeout(() => {
      stream.writeSSE({
        data: JSON.stringify({ type: 'error', message: 'Response timed out' }),
      }).then(() => stream.close()).catch(() => {});
    }, STREAM_TIMEOUT_MS);

    try {
      const result = await handleChat({
        projectSlug,
        sessionId,
        message,
        history,
        resolvedProject: project ?? undefined,
      });

      await stream.writeSSE({
        data: JSON.stringify({ type: 'start', messageId: result.messageId }),
      });

      // Stream text chunks and collect full text
      let fullText = '';
      for await (const chunk of result.textStream) {
        fullText += chunk;
        await stream.writeSSE({
          data: JSON.stringify({ type: 'text', content: chunk }),
        });
      }

      // Send citations
      await stream.writeSSE({
        data: JSON.stringify({ type: 'citations', citations: result.citations }),
      });

      // Generate follow-up questions using the same provider/key as the chat
      const questions = await result.getFollowUps(message, fullText);
      if (questions.length > 0) {
        await stream.writeSSE({
          data: JSON.stringify({ type: 'followups', questions }),
        });
      }

      await stream.writeSSE({
        data: JSON.stringify({ type: 'done' }),
      });
    } catch (error) {
      log.error('Chat error', { error: error instanceof Error ? error.message : error, projectSlug });
      // Surface actionable errors (missing API key, project not found) to the user
      const errMsg = error instanceof Error ? error.message : '';
      const actionablePatterns = ['API key', 'not found', 'not configured', 'document viewing only', 'rate limit', 'quota', 'invalid key', 'expired', 'insufficient'];
      const isActionable = actionablePatterns.some((p) => errMsg.toLowerCase().includes(p.toLowerCase()));
      let userMessage = errMsg;
      if (!isActionable) {
        userMessage = 'An error occurred while processing your message.';
      } else if (/rate limit|quota/i.test(errMsg)) {
        userMessage = `${errMsg}. Please wait a moment before trying again.`;
      } else if (/invalid key|expired/i.test(errMsg)) {
        userMessage = `${errMsg}. Please check your API key in Settings.`;
      }
      await stream.writeSSE({
        data: JSON.stringify({
          type: 'error',
          message: userMessage,
        }),
      });
    } finally {
      clearTimeout(timeout);
    }
  });
});
