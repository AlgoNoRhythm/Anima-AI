import { Hono } from 'hono';
import type { AppEnv } from '../app.js';
import { rateLimiter } from '../middleware/rate-limiter.js';
import { validateSession } from '../middleware/session-auth.js';
import { createDatabase, messageQueries, analyticsQueries } from '@anima-ai/database';

export const feedbackRoutes = new Hono<AppEnv>();

feedbackRoutes.post('/', rateLimiter(), validateSession(), async (c) => {
  const body = await c.req.json<{
    messageId: string;
    feedback: 'positive' | 'negative';
  }>();

  if (!body.messageId || !['positive', 'negative'].includes(body.feedback)) {
    return c.json({ error: 'Invalid feedback data' }, 400);
  }

  const db = createDatabase();
  const updated = await messageQueries(db).updateFeedback(body.messageId, body.feedback);

  if (!updated) {
    return c.json({ error: 'Message not found' }, 404);
  }

  // Log analytics
  const projectId = c.get('projectId');
  if (projectId) {
    await analyticsQueries(db).logEvent({
      projectId,
      sessionId: c.get('sessionId'),
      eventType: 'feedback_given',
      metadata: { messageId: body.messageId, feedback: body.feedback },
    });
  }

  return c.json({ success: true });
});
