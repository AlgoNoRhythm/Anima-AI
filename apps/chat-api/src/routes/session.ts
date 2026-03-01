import { Hono } from 'hono';
import type { AppEnv } from '../app.js';
import { rateLimiter } from '../middleware/rate-limiter.js';
import { createSession } from '../services/session-service.js';

export const sessionRoutes = new Hono<AppEnv>();

sessionRoutes.post('/:projectSlug', rateLimiter(), async (c) => {
  const projectSlug = c.req.param('projectSlug');

  // Hash IP for privacy
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
  const userAgent = c.req.header('user-agent') || null;

  // Simple hash for IP (not crypto-grade, just for grouping)
  let ipHash: string | null = null;
  if (ip !== 'unknown') {
    let hash = 0;
    for (let i = 0; i < ip.length; i++) {
      const char = ip.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    ipHash = hash.toString(36);
  }

  try {
    const result = await createSession(projectSlug, ipHash, userAgent);
    return c.json({
      sessionToken: result.sessionToken,
      projectSlug,
      expiresAt: result.expiresAt.toISOString(),
    }, 201);
  } catch (error) {
    const message = (error as Error).message;
    if (message === 'Project not found') {
      return c.json({ error: 'Project not found' }, 404);
    }
    throw error;
  }
});
