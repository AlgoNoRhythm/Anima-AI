export interface PageContent {
  pageNumber: number; // 1-indexed physical page
  text: string;
  tokenCount: number;
}

export interface TocItem {
  structure: string; // "1", "1.1", "1.2.3"
  title: string;
  pageNumber?: number; // Page number from TOC (before offset)
  physicalIndex?: number; // Actual PDF page number
  appearStart?: boolean;
}

export interface TreeNode {
  title: string;
  nodeId: string; // "0001", "0002", etc.
  startIndex: number; // Physical page start (1-indexed)
  endIndex: number; // Physical page end (inclusive)
  summary: string;
  text: string; // Full section text
  nodes: TreeNode[]; // Children
}

export interface DocumentTreeResult {
  tree: TreeNode[];
  detectedEntity: string | null;
}

export interface DocumentTree {
  docName: string;
  documentId: string;
  structure: TreeNode[];
}

export interface PageIndexConfig {
  model: string;
  provider: 'openai' | 'anthropic';
  tocCheckPageNum: number;
  maxPageNumEachNode: number;
  maxTokenNumEachNode: number;
  apiKey?: string;
}

export interface TreeSearchResult {
  nodes: SelectedNode[];
  context: string;
}

export interface SelectedNode {
  nodeId: string;
  documentId: string;
  title: string;
  startIndex: number;
  endIndex: number;
  text: string;
  summary: string;
  score: number;
}

export const DEFAULT_PAGE_INDEX_CONFIG: PageIndexConfig = {
  model: 'claude-haiku-4-5-20251001',
  provider: 'anthropic',
  tocCheckPageNum: 10,
  maxPageNumEachNode: 5,
  maxTokenNumEachNode: 3000,
};
