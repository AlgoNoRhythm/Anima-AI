import { createLogger } from '@anima-ai/shared';

const log = createLogger('queue-client');

/**
 * Enqueues a PDF processing job to BullMQ, or processes locally when no REDIS_URL.
 */
export async function enqueueProcessing(
  documentId: string,
  projectId: string,
  storageUrl: string,
  filename: string,
  pdfBuffer?: Buffer,
  apiKey?: string,
  provider?: string,
) {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    // Production mode: enqueue to BullMQ (optional deps, only available when REDIS_URL is set)
    try {
      // @ts-expect-error -- bullmq is an optional production dependency
      const { Queue } = await import('bullmq');
      // @ts-expect-error -- ioredis is an optional production dependency
      const IORedis = (await import('ioredis')).default;
      const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

      const pdfQueue = new Queue('pdf-processing', { connection });
      await pdfQueue.add('process-pdf', {
        documentId,
        projectId,
        storageUrl,
        filename,
      });
      log.info('Job enqueued', { documentId, projectId });
      await pdfQueue.close();
      await connection.quit();
    } catch (err) {
      log.error('Failed to enqueue job', { documentId, error: err instanceof Error ? err.message : err });
      throw err;
    }
  } else if (pdfBuffer) {
    // Local mode: process synchronously in background
    // Fire and forget - don't await so the upload response returns immediately
    const { processDocumentLocally } = await import('./local-processor');
    processDocumentLocally(documentId, pdfBuffer, filename, apiKey, provider).catch((err) => {
      log.error('Local PDF processing failed', { documentId, error: err instanceof Error ? err.message : err });
    });
  }
}
