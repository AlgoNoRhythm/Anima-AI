import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { chatRoutes } from './routes/chat.js';
import { sessionRoutes } from './routes/session.js';
import { feedbackRoutes } from './routes/feedback.js';
import { feedbackSurveyRoutes } from './routes/feedback-survey.js';
import { rateLimiter } from './middleware/rate-limiter.js';
import { securityHeaders } from './middleware/security.js';
import { createDatabase } from '@anima-ai/database';
import { createCacheClient } from '@anima-ai/cache';
import { createStorageClient } from '@anima-ai/storage';
import { createLogger } from '@anima-ai/shared';

const log = createLogger('chat-api');

export type AppEnv = {
  Variables: {
    sessionId?: string;
    projectId?: string;
    requestId: string;
  };
};

export function createApp() {
  const app = new Hono<AppEnv>();

  // Validate CORS in production
  const corsOrigin = process.env.CORS_ORIGIN || '*';
  if (process.env.NODE_ENV === 'production' && corsOrigin === '*') {
    log.error('CORS_ORIGIN is set to wildcard (*) in production — restrict this to your domain');
  }

  // Request ID middleware
  app.use('*', async (c, next) => {
    const requestId = c.req.header('x-request-id') || crypto.randomUUID();
    c.set('requestId', requestId);
    c.header('X-Request-Id', requestId);
    await next();
  });

  // Global middleware
  app.use('*', logger());
  app.use('*', securityHeaders());
  app.use('*', cors({
    origin: corsOrigin,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Session-Token', 'X-Request-Id'],
    maxAge: 86400,
  }));

  // Shared health check
  async function checkHealth() {
    const timestamp = new Date().toISOString();
    let dbStatus = 'connected';
    let cacheStatus = 'connected';
    let storageStatus = 'connected';

    try {
      const db = createDatabase();
      await db.execute('SELECT 1');
    } catch {
      dbStatus = 'disconnected';
    }

    try {
      const cache = createCacheClient();
      await cache.get('__health');
    } catch {
      cacheStatus = 'disconnected';
    }

    try {
      const storage = createStorageClient();
      await storage.exists('__health');
    } catch {
      storageStatus = 'disconnected';
    }

    const status = dbStatus === 'connected' ? 'ok' : 'degraded';
    return { status, db: dbStatus, cache: cacheStatus, storage: storageStatus, timestamp };
  }

  // Health check
  app.get('/health', async (c) => {
    const result = await checkHealth();
    return c.json({ ...result, service: 'chat-api' });
  });

  // API health endpoint
  app.get('/api/health', async (c) => {
    const result = await checkHealth();
    return c.json(result);
  });

  // API routes
  app.route('/api/session', sessionRoutes);
  app.route('/api/chat', chatRoutes);
  app.route('/api/feedback', feedbackRoutes);
  app.route('/api/feedback-survey', feedbackSurveyRoutes);

  // 404 handler
  app.notFound((c) => c.json({ error: 'Not found' }, 404));

  // Error handler
  app.onError((err, c) => {
    log.error('Unhandled error', { message: err.message, stack: err.stack });
    return c.json({ error: 'Internal server error' }, 500);
  });

  return app;
}
