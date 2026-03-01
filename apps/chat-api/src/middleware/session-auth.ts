import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../app.js';
import { validateSessionToken } from '../services/session-service.js';

export function validateSession(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const sessionToken = c.req.header('X-Session-Token');

    if (!sessionToken) {
      return c.json({ error: 'Session token required' }, 401);
    }

    const result = await validateSessionToken(sessionToken);
    if (!result.valid) {
      return c.json({ error: 'Invalid or expired session' }, 401);
    }

    c.set('sessionId', result.sessionId!);
    c.set('projectId', result.projectId!);

    await next();
  };
}
