import { streamText } from 'ai';
import { getModel } from '../providers';
import { retrieveFromTrees } from './retrieval';
import { extractCitations } from './citations';
import { buildSystemPrompt } from '../personality';
import { validateInput } from '../guardrails';
import type { PersonalityConfig, RAGResult, SearchOptions, HistoryMessage } from '../types';
import type { DocumentTree } from '../page-index/types';
import { documentQueries } from '@anima-ai/database';
import type { CacheClient } from '@anima-ai/cache';
import { getCachedDocumentTrees, setCachedDocumentTrees } from '@anima-ai/cache';

export async function ragPipeline(
  query: string,
  projectId: string,
  personality: PersonalityConfig,
  db: any,
  documentTitles: Map<string, string>,
  options: SearchOptions = {},
  history: HistoryMessage[] = [],
  apiKey?: string,
  cache?: CacheClient,
): Promise<RAGResult> {
  // Validate input
  const inputValidation = validateInput(query, personality.guardrails);
  if (!inputValidation.valid) {
    const errorMessage = inputValidation.reason || 'Input validation failed';
    return {
      textStream: (async function* () { yield errorMessage; })(),
      citations: [],
    };
  }

  // Load document trees — check cache first
  type TreeRow = { docName: string; documentId: string; treeIndex: unknown; detectedEntity?: string | null };
  let treeRows: TreeRow[] | null = null;

  if (cache) {
    treeRows = await getCachedDocumentTrees<TreeRow[]>(cache, projectId);
  }

  if (!treeRows) {
    treeRows = await documentQueries(db).getTreeIndices(projectId);
    if (cache && treeRows.length > 0) {
      await setCachedDocumentTrees(cache, projectId, treeRows);
    }
  }

  if (treeRows.length === 0) {
    const noResultsMessage =
      "I don't have any documents to reference yet. Please upload documents to this project first, then I'll be able to help answer your questions.";
    return {
      textStream: (async function* () { yield noResultsMessage; })(),
      citations: [],
    };
  }

  // Build DocumentTree array from DB rows
  const trees: DocumentTree[] = treeRows.map((row) => ({
    docName: row.docName,
    documentId: row.documentId,
    structure: row.treeIndex as any,
  }));

  // Use entity name from personality config (injected by chat service)
  if (personality.entityName === undefined) {
    // Auto-detect from first document's detectedEntity if not already set
    const firstEntity = treeRows[0]?.detectedEntity;
    if (firstEntity) {
      personality = { ...personality, entityName: firstEntity };
    }
  }

  // Search trees for relevant nodes
  const searchResult = await retrieveFromTrees(query, trees, {
    provider: personality.modelProvider,
    model: personality.modelName,
    maxNodes: options.maxNodes,
    apiKey,
  });

  // If no relevant nodes found
  if (searchResult.nodes.length === 0) {
    const noResultsMessage =
      "I couldn't find relevant information in the uploaded documents to answer your question.";
    return {
      textStream: (async function* () { yield noResultsMessage; })(),
      citations: [],
    };
  }

  // Extract citations from selected nodes
  const citations = extractCitations(searchResult.nodes, documentTitles);

  // Build context from search results
  const context = searchResult.context;

  // Build system prompt
  const systemPrompt = buildSystemPrompt(personality, context);

  // Stream response
  const model = getModel(personality.modelProvider, personality.modelName, apiKey);

  // Build messages array with conversation history
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: query },
  ];

  // Capture streaming errors so they can be surfaced to the client.
  // The Vercel AI SDK may silently swallow provider errors (e.g. quota
  // exceeded, invalid model) and return an empty stream with zero chunks.
  let streamError: unknown = null;

  const result = streamText({
    model,
    system: systemPrompt,
    messages,
    temperature: personality.temperature,
    maxTokens: personality.guardrails.maxResponseLength,
    onError: ({ error }) => {
      console.error('[rag-pipeline] streamText error:', error);
      streamError = error;
    },
  });

  // Wrap textStream to re-throw captured errors and detect empty streams
  async function* safeTextStream(): AsyncGenerator<string> {
    let hasChunks = false;
    try {
      for await (const chunk of result.textStream) {
        hasChunks = true;
        yield chunk;
      }
    } catch (err) {
      // Re-throw stream iteration errors with a user-friendly message
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`AI provider error: ${msg}`);
    }
    // If the provider silently failed, surface the captured error
    if (!hasChunks && streamError) {
      const msg = streamError instanceof Error ? streamError.message : String(streamError);
      throw new Error(`AI provider error: ${msg}`);
    }
    if (!hasChunks) {
      throw new Error('AI provider returned an empty response. Check your API key and model configuration.');
    }
  }

  return {
    textStream: safeTextStream(),
    citations,
  };
}
