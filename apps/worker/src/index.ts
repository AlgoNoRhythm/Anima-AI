import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { processPdf } from './processors/pdf-processor.js';
import { setProcessorDeps } from './processors/pdf-processor.js';
import { processIndexing } from './processors/indexing-processor.js';
import { setIndexingDeps } from './processors/indexing-processor.js';
import { PDF_QUEUE, INDEXING_QUEUE } from './queues.js';
import { createLogger } from '@anima-ai/shared';
import { createDatabase, closeDatabase } from '@anima-ai/database';
import { createStorageClient } from '@anima-ai/storage';

const log = createLogger('worker');

function getRedisUrl(): string {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error('REDIS_URL is required for the worker. The worker uses BullMQ which requires Redis/Valkey.');
  }
  return url;
}

function initializeDeps() {
  const db = createDatabase();
  const storage = createStorageClient();
  const doclingUrl = process.env.DOCLING_URL || '';

  setProcessorDeps({ db, storage, doclingUrl });
  setIndexingDeps({ db });

  log.info('Worker dependencies initialized', {
    storage: process.env.STORAGE_ENDPOINT ? 's3' : 'local',
    docling: doclingUrl ? 'enabled' : 'disabled',
  });
}

export function startWorkers(connection?: IORedis) {
  initializeDeps();

  const redisUrl = getRedisUrl();
  const conn = connection || new IORedis(redisUrl, { maxRetriesPerRequest: null });

  const pdfWorker = new Worker(PDF_QUEUE, processPdf, {
    connection: conn,
    concurrency: 2,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  });

  const indexingWorker = new Worker(INDEXING_QUEUE, processIndexing, {
    connection: conn,
    concurrency: 2,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  });

  pdfWorker.on('completed', (job) => {
    log.info('PDF processing completed', { jobId: job.id });
  });

  pdfWorker.on('failed', (job, err) => {
    log.error('PDF processing failed', { jobId: job?.id, message: err.message });
  });

  indexingWorker.on('completed', (job) => {
    log.info('Tree indexing completed', { jobId: job.id });
  });

  indexingWorker.on('failed', (job, err) => {
    log.error('Tree indexing failed', { jobId: job?.id, message: err.message });
  });

  log.info('Workers started', { redisUrl: redisUrl.replace(/\/\/.*@/, '//***@') });

  return { pdfWorker, indexingWorker, connection: conn };
}

// CLI entrypoint
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMainModule) {
  const { pdfWorker, indexingWorker, connection } = startWorkers();

  // Periodic expired session cleanup (every 15 minutes)
  const cleanupInterval = setInterval(async () => {
    try {
      const { createDatabase: getDb, sessionQueries } = await import('@anima-ai/database');
      const db = getDb();
      await sessionQueries(db).deleteExpired();
      log.info('Expired sessions cleaned up');
    } catch (err) {
      log.error('Session cleanup failed', { message: (err as Error).message });
    }
  }, 15 * 60 * 1000);

  async function shutdown(signal: string) {
    log.info(`Received ${signal}, shutting down gracefully…`);
    clearInterval(cleanupInterval);
    await Promise.all([pdfWorker.close(), indexingWorker.close()]);
    connection.disconnect();
    await closeDatabase();
    log.info('Shutdown complete');
    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
