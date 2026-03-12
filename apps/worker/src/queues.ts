import { Queue } from 'bullmq';
import type IORedis from 'ioredis';

export const PDF_QUEUE = 'pdf-processing';
export const INDEXING_QUEUE = 'tree-indexing';

export interface PdfJobData {
  documentId: string;
  projectId: string;
  storageUrl: string;
  filename: string;
  provider?: string;
}

export interface IndexingJobData {
  documentId: string;
  projectId: string;
  provider?: string;
}

export function createQueues(connection: IORedis) {
  const pdfQueue = new Queue<PdfJobData>(PDF_QUEUE, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    },
  });

  const indexingQueue = new Queue<IndexingJobData>(INDEXING_QUEUE, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    },
  });

  return { pdfQueue, indexingQueue };
}
