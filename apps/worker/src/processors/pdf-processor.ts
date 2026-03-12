import type { Job } from 'bullmq';
import type { PdfJobData, IndexingJobData } from '../queues.js';
import { parsePdfBuffer } from '../pdf-parser.js';
import { INDEXING_QUEUE } from '../queues.js';
import { parseTxt, parseMarkdown, parseHtml, parseDocx, parseToPages } from '../text-parser.js';
import { createLogger } from '@anima-ai/shared';

const log = createLogger('pdf-processor');

interface ProcessorDeps {
  db: any;
  storage: any;
  doclingUrl: string;
}

let deps: ProcessorDeps | null = null;

export function setProcessorDeps(d: ProcessorDeps) {
  deps = d;
}

interface DoclingOutput {
  pages: Array<{
    page_number: number;
    sections: Array<{ title: string | null; text: string; bbox: object | null }>;
    tables: Array<{ markdown: string; bbox: object | null }>;
  }>;
  total_pages: number;
  filename: string;
}

async function parseWithDocling(pdfBuffer: Buffer, filename: string, doclingUrl: string): Promise<DoclingOutput> {
  const formData = new FormData();
  formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), filename);

  const response = await fetch(`${doclingUrl}/parse`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Docling parsing failed: ${response.statusText}`);
  }

  return response.json() as Promise<DoclingOutput>;
}

/**
 * Extract per-page text from a DoclingOutput.
 */
function doclingToPages(output: DoclingOutput): Array<{ pageNumber: number; text: string; tokenCount: number }> {
  return output.pages.map((page) => {
    const sectionTexts = page.sections.map((s) => {
      const title = s.title ? `${s.title}\n` : '';
      return `${title}${s.text}`;
    });
    const tableTexts = page.tables.map((t) => t.markdown);
    const fullText = [...sectionTexts, ...tableTexts].join('\n\n');
    return {
      pageNumber: page.page_number,
      text: fullText,
      tokenCount: Math.ceil(fullText.length / 4),
    };
  });
}

export async function processPdf(job: Job<PdfJobData>) {
  const { documentId, projectId, storageUrl, filename } = job.data;
  if (!deps) throw new Error('Worker dependencies not initialized. Call setProcessorDeps() before processing jobs.');
  const { db, storage, doclingUrl } = deps;

  try {
    // Update status to parsing
    await job.updateProgress(10);
    const { documents } = await import('@anima-ai/database');
    const { eq } = await import('drizzle-orm');
    await db.update(documents).set({ status: 'parsing' }).where(eq(documents.id, documentId));

    // Download file from storage
    const fileBuffer = await storage.get(storageUrl);
    if (!fileBuffer) throw new Error(`File not found at ${storageUrl}`);

    // Parse: detect file type and extract per-page text
    const ext = filename.split('.').pop()?.toLowerCase();
    let pages: Array<{ pageNumber: number; text: string; tokenCount: number }>;

    if (ext && ['txt', 'md', 'html', 'docx'].includes(ext)) {
      // Non-PDF formats: use parseToPages for synthetic page splitting
      pages = await parseToPages(fileBuffer, filename);
    } else {
      // PDF: try Docling first, fallback to pdf-parse
      let doclingOutput: DoclingOutput;
      if (doclingUrl) {
        try {
          doclingOutput = await parseWithDocling(fileBuffer, filename, doclingUrl);
        } catch (doclingError) {
          log.warn('Docling unavailable, falling back to pdf-parse', { message: (doclingError as Error).message });
          doclingOutput = await parsePdfBuffer(fileBuffer, filename);
        }
      } else {
        doclingOutput = await parsePdfBuffer(fileBuffer, filename);
      }
      pages = doclingToPages(doclingOutput);
    }

    await job.updateProgress(40);

    // Update document with page count
    await db.update(documents)
      .set({ status: 'indexing', totalPages: pages.length })
      .where(eq(documents.id, documentId));

    // Store pages as chunks (for the indexing processor to pick up)
    const { chunks: chunksTable } = await import('@anima-ai/database');
    for (const page of pages) {
      await db.insert(chunksTable).values({
        documentId,
        text: page.text,
        pageNumbers: [page.pageNumber],
        sectionTitle: null,
        bbox: null,
        chunkIndex: page.pageNumber - 1, // 0-indexed chunk index = page - 1
      });
    }
    await job.updateProgress(60);

    // Enqueue indexing job
    const { Queue } = await import('bullmq');
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) throw new Error('REDIS_URL is required for the worker');
    const IORedis = (await import('ioredis')).default;
    const indexingQueue = new Queue<IndexingJobData>(INDEXING_QUEUE, {
      connection: new IORedis(redisUrl, { maxRetriesPerRequest: null }),
    });
    await indexingQueue.add('build-tree-index', {
      documentId,
      projectId,
      provider: job.data.provider,
    });

    await job.updateProgress(100);
    return { documentId, pagesExtracted: pages.length };
  } catch (error) {
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
