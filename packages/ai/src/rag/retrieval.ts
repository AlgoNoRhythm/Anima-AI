import { searchTree } from '../page-index/tree-search';
import { DEFAULT_PAGE_INDEX_CONFIG } from '../page-index/types';
import type { DocumentTree, TreeSearchResult, PageIndexConfig } from '../page-index/types';

export interface TreeRetrievalOptions {
  provider?: string;
  model?: string;
  maxNodes?: number;
  apiKey?: string;
}

/**
 * Retrieve relevant nodes from document trees using LLM-based tree search.
 * Replaces the old vector-based hybridSearch.
 */
export async function retrieveFromTrees(
  query: string,
  trees: DocumentTree[],
  options: TreeRetrievalOptions = {},
): Promise<TreeSearchResult> {
  const config: PageIndexConfig = {
    ...DEFAULT_PAGE_INDEX_CONFIG,
    provider: (options.provider as 'openai' | 'anthropic') || DEFAULT_PAGE_INDEX_CONFIG.provider,
    model: options.model || DEFAULT_PAGE_INDEX_CONFIG.model,
    apiKey: options.apiKey,
  };

  return searchTree(query, trees, config);
}
