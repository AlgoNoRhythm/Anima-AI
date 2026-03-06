import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { createLogger } from '@anima-ai/shared';
import { closeDatabase } from '@anima-ai/database';
import { flushAnalytics, stopAnalyticsBuffer } from './services/analytics-buffer.js';

const log = createLogger('chat-api');
const app = createApp();
const port = parseInt(process.env.CHAT_API_PORT || '3001', 10);

if (!process.env.REDIS_URL && process.env.NODE_ENV === 'production') {
  log.error(
    'REDIS_URL is not set in production. Rate limiting and session state will NOT be shared across instances. ' +
    'Set REDIS_URL to a Valkey/Redis instance for production deployments.',
  );
}

const server = serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, (info) => {
  log.info(`Chat API running on http://0.0.0.0:${info.port}`);
});

async function shutdown(signal: string) {
  log.info(`Received ${signal}, shutting down gracefully…`);
  server.close();
  stopAnalyticsBuffer();
  await flushAnalytics();
  await closeDatabase();
  log.info('Shutdown complete');
  // Force exit after 10s if connections don't drain
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
