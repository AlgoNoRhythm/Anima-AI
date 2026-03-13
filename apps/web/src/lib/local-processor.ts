import { createDatabase, documentQueries, chunkQueries, analyticsQueries, projectQueries, apiKeyQueries } from '@anima-ai/database';
import { buildDocumentTree, DEFAULT_PAGE_INDEX_CONFIG } from '@anima-ai/ai';
import { MODEL_OPTIONS, createLogger } from '@anima-ai/shared';
import { decryptApiKey } from '@anima-ai/shared/crypto';
import type { PageContent } from '@anima-ai/ai';

const log = createLogger('local-processor');

// ---- Inlined types from worker/src/chunker.ts ----

interface DoclingSection {
  title: string | null;
  text: string;
  bbox: { l: number; t: number; r: number; b: number } | null;
}

interface DoclingPage {
  page_number: number;
  sections: DoclingSection[];
  tables: Array<{ markdown: string; bbox: { l: number; t: number; r: number; b: number } | null }>;
}

interface DoclingOutput {
  pages: DoclingPage[];
  total_pages: number;
  filename: string;
}

// ---- Inlined pdf-parser logic ----

function splitTextIntoSections(text: string): DoclingSection[] {
  const lines = text.split('\n');
  const sections: DoclingSection[] = [];
  let currentTitle: string | null = null;
  let currentText = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      currentText += '\n';
      continue;
    }

    const isLikelyHeading =
      trimmed.length < 80 &&
      trimmed.length > 2 &&
      !trimmed.endsWith('.') &&
      !trimmed.endsWith(',') &&
      (trimmed === trimmed.toUpperCase() || /^[A-Z][a-z]/.test(trimmed));

    if (isLikelyHeading && currentText.trim().length > 0) {
      sections.push({ title: currentTitle, text: currentText.trim(), bbox: null });
      currentTitle = trimmed;
      currentText = '';
    } else if (isLikelyHeading && currentText.trim().length === 0) {
      currentTitle = trimmed;
    } else {
      currentText += trimmed + '\n';
    }
  }

  if (currentText.trim()) {
    sections.push({ title: currentTitle, text: currentText.trim(), bbox: null });
  }

  if (sections.length === 0 && text.trim()) {
    sections.push({ title: null, text: text.trim(), bbox: null });
  }

  return sections;
}

async function parsePdfBuffer(buffer: Buffer, filename: string): Promise<DoclingOutput> {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  const doc = await (parser as any).load();
  const totalPages = doc.numPages || 1;

  // Extract text page by page
  const result = await (parser as any).getText();
  const pageTexts: string[] = result.pages
    ? result.pages.map((p: { text: string }) => p.text)
    : [];

  const pages: DoclingPage[] = [];

  if (pageTexts.length > 0) {
    for (let i = 0; i < pageTexts.length; i++) {
      const text = pageTexts[i]!;
      if (text.trim()) {
        pages.push({ page_number: i + 1, sections: splitTextIntoSections(text), tables: [] });
      }
    }
  } else {
    // Fallback: single page with all text
    const fullText = result.text || '';
    if (fullText.trim()) {
      pages.push({ page_number: 1, sections: splitTextIntoSections(fullText), tables: [] });
    }
  }

  return { pages, total_pages: totalPages, filename };
}

/**
 * Convert DoclingOutput to PageContent[] for tree building.
 */
function doclingToPageContents(output: DoclingOutput): PageContent[] {
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

// ---- Main processor ----

/**
 * Synchronous document processing for local dev (no Redis/BullMQ needed).
 * parse -> build tree index -> DB
 */
export async function processDocumentLocally(documentId: string, pdfBuffer: Buffer, filename: string, apiKey?: string, provider?: string) {
  const db = createDatabase();
  const docs = documentQueries(db);

  try {
    await docs.updateStatus(documentId, 'parsing');

    const doclingOutput = await parsePdfBuffer(pdfBuffer, filename);
    await docs.updatePageCount(documentId, doclingOutput.total_pages);

    await docs.updateStatus(documentId, 'indexing');

    // Convert to page contents for tree building
    const pageContents = doclingToPageContents(doclingOutput);

    // Also store pages as chunks for reference
    const chunksQ = chunkQueries(db);
    await chunksQ.createMany(
      pageContents.map((p, i) => ({
        documentId,
        text: p.text,
        pageNumbers: [p.pageNumber],
        sectionTitle: null,
        bbox: null,
        chunkIndex: i,
      })),
    );

    // Build tree index — resolve API key: passed key > stored(pref) > env(pref) > stored(alt) > env(alt)
    let resolvedProvider = (process.env.INDEXING_PROVIDER || provider || DEFAULT_PAGE_INDEX_CONFIG.provider) as 'openai' | 'anthropic';
    let resolvedApiKey = apiKey;

    // Look up the project owner's stored API key from the database
    if (!resolvedApiKey) {
      try {
        const doc = await docs.findById(documentId);
        if (doc) {
          const project = await projectQueries(db).findById(doc.projectId);
          if (project) {
            const storedKey = await apiKeyQueries(db).findByUserAndProvider(project.userId, resolvedProvider);
            if (storedKey) {
              resolvedApiKey = decryptApiKey(storedKey.encryptedKey);
            }
          }
        }
      } catch (keyErr) {
        log.warn('Failed to retrieve stored API key', { error: keyErr instanceof Error ? keyErr.message : String(keyErr) });
      }
    }

    // Try env var for preferred provider
    if (!resolvedApiKey) {
      const envKey = resolvedProvider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY;
      if (envKey) {
        resolvedApiKey = envKey;
      }
    }

    // Fall back to alternate provider (stored key, then env var)
    if (!resolvedApiKey) {
      const altProvider = resolvedProvider === 'anthropic' ? 'openai' : 'anthropic';
      try {
        const doc = await docs.findById(documentId);
        if (doc) {
          const project = await projectQueries(db).findById(doc.projectId);
          if (project) {
            const altKey = await apiKeyQueries(db).findByUserAndProvider(project.userId, altProvider);
            if (altKey) {
              resolvedApiKey = decryptApiKey(altKey.encryptedKey);
              resolvedProvider = altProvider;
            }
          }
        }
      } catch { /* fall through */ }
      if (!resolvedApiKey) {
        const altEnv = altProvider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY;
        if (altEnv) {
          resolvedApiKey = altEnv;
          resolvedProvider = altProvider;
        }
      }
    }

    const defaultModelForProvider = MODEL_OPTIONS[resolvedProvider]?.[0]?.value ?? DEFAULT_PAGE_INDEX_CONFIG.model;
    const config = {
      ...DEFAULT_PAGE_INDEX_CONFIG,
      provider: resolvedProvider,
      model: process.env.INDEXING_MODEL || defaultModelForProvider,
      apiKey: resolvedApiKey,
    };

    const result = await buildDocumentTree(pageContents, documentId, config);

    // Store tree index and detected entity
    await docs.updateTreeIndex(documentId, result.tree);
    if (result.detectedEntity) {
      await docs.updateEntity(documentId, result.detectedEntity);
    }
    await docs.updateStatus(documentId, 'completed');

    // Log indexing_completed analytics event
    try {
      const doc = await docs.findById(documentId);
      if (doc) {
        const analytics = analyticsQueries(db);
        await analytics.logEvent({
          projectId: doc.projectId,
          eventType: 'document_viewed',
          metadata: {
            action: 'indexing_completed',
            documentId,
            nodeCount: result.tree.length,
          },
        });
      }
    } catch (analyticsErr) {
      log.error('Failed to log indexing_completed analytics event', { error: analyticsErr instanceof Error ? analyticsErr.message : analyticsErr });
    }

    return { nodeCount: result.tree.length };
  } catch (error) {
    // Log indexing_failed analytics event
    try {
      const doc = await docs.findById(documentId);
      if (doc) {
        const analytics = analyticsQueries(db);
        await analytics.logEvent({
          projectId: doc.projectId,
          eventType: 'document_viewed',
          metadata: {
            action: 'indexing_failed',
            documentId,
            error: (error as Error).message,
          },
        });
      }
    } catch (analyticsErr) {
      log.error('Failed to log indexing_failed analytics event', { error: analyticsErr instanceof Error ? analyticsErr.message : analyticsErr });
    }

    await docs.updateStatus(documentId, 'failed', (error as Error).message);
    throw error;
  }
}
