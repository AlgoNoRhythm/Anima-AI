import type { Job } from 'bullmq';
import type { IndexingJobData } from '../queues.js';
import { createLogger, MODEL_OPTIONS } from '@anima-ai/shared';

const log = createLogger('indexing-processor');

interface ProcessorDeps {
  db: any;
}

let deps: ProcessorDeps | null = null;

export function setIndexingDeps(d: ProcessorDeps) {
  deps = d;
}

export async function processIndexing(job: Job<IndexingJobData>) {
  const { documentId, provider } = job.data;
  if (!deps) throw new Error('Worker dependencies not initialized. Call setIndexingDeps() before processing jobs.');
  const { db } = deps;

  try {
    const { buildDocumentTree, DEFAULT_PAGE_INDEX_CONFIG } = await import('@anima-ai/ai');
    const { documents } = await import('@anima-ai/database');
    const { eq } = await import('drizzle-orm');

    // Get document info
    const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
    if (!doc) throw new Error(`Document ${documentId} not found`);

    // Update status to indexing
    await db.update(documents)
      .set({ status: 'indexing', updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    // Load page data from the chunks table (pages stored as individual chunks by pdf-processor)
    const { chunks } = await import('@anima-ai/database');
    const chunkRows = await db
      .select({ text: chunks.text, chunkIndex: chunks.chunkIndex })
      .from(chunks)
      .where(eq(chunks.documentId, documentId));

    // Sort by chunkIndex (which represents page number)
    chunkRows.sort((a: { chunkIndex: number }, b: { chunkIndex: number }) => a.chunkIndex - b.chunkIndex);

    const docPages = chunkRows.map((row: { text: string; chunkIndex: number }) => ({
      pageNumber: row.chunkIndex + 1,
      text: row.text,
      tokenCount: Math.ceil(row.text.length / 4),
    }));

    if (docPages.length === 0) {
      throw new Error('No page content found for document');
    }

    await job.updateProgress(20);

    // Build the document tree — use the project's provider if given
    const resolvedProvider = (process.env.INDEXING_PROVIDER || provider || DEFAULT_PAGE_INDEX_CONFIG.provider) as 'openai' | 'anthropic';
    const defaultModelForProvider = MODEL_OPTIONS[resolvedProvider]?.[0]?.value ?? DEFAULT_PAGE_INDEX_CONFIG.model;
    const config = {
      ...DEFAULT_PAGE_INDEX_CONFIG,
      provider: resolvedProvider,
      model: process.env.INDEXING_MODEL || defaultModelForProvider,
    };

    log.info('Building document tree', { documentId, pageCount: docPages.length });
    const result = await buildDocumentTree(docPages, documentId, config);

    await job.updateProgress(80);

    // Store tree index and detected entity in database
    await db.update(documents)
      .set({
        treeIndex: result.tree,
        detectedEntity: result.detectedEntity,
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    await job.updateProgress(100);
    log.info('Document tree built successfully', { documentId, nodeCount: result.tree.length, detectedEntity: result.detectedEntity });

    return { documentId, nodeCount: result.tree.length };
  } catch (error) {
    log.error('Indexing failed', { documentId, message: (error as Error).message });
    try {
      const { documents } = await import('@anima-ai/database');
      const { eq } = await import('drizzle-orm');
      await db.update(documents)
        .set({ status: 'failed', errorMessage: (error as Error).message })
        .where(eq(documents.id, documentId));
    } catch {
      // Ignore DB update error during error handling
    }
    throw error;
  }
}
