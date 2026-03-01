import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { createLogger } from '@anima-ai/shared';
import { closeDatabase } from '@anima-ai/database';

const log = createLogger('chat-api');
const app = createApp();
const port = parseInt(process.env.CHAT_API_PORT || '3001', 10);

const server = serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, (info) => {
  log.info(`Chat API running on http://0.0.0.0:${info.port}`);
});

async function shutdown(signal: string) {
  log.info(`Received ${signal}, shutting down gracefully…`);
  server.close();
  await closeDatabase();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
