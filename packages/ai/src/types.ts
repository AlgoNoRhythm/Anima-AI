export type ModelProvider = 'openai' | 'anthropic';

export interface ProviderConfig {
  provider: ModelProvider;
  modelName: string;
  apiKey?: string;
}

export interface RankedChunk {
  id: string;
  documentId: string;
  text: string;
  pageNumbers: number[];
  sectionTitle: string | null;
  score: number;
  chunkIndex: number;
}

export interface RetrievedNode {
  nodeId: string;
  documentId: string;
  title: string;
  startIndex: number;
  endIndex: number;
  text: string;
  summary: string;
  score: number;
}

export interface Citation {
  documentId: string;
  documentTitle: string;
  pageNumbers: number[];
  sectionTitle: string | null;
  text: string;
  score: number;
}

export interface RAGResult {
  textStream: AsyncIterable<string>;
  citations: Citation[];
}

export interface Guardrails {
  blockedTopics: string[];
  maxResponseLength: number;
  requireCitations: boolean;
  allowOffTopic: boolean;
  customInstructions: string | null;
}

export interface PersonalityConfig {
  name: string;
  systemPrompt: string;
  tone: string;
  temperature: number;
  modelProvider: ModelProvider;
  modelName: string;
  guardrails: Guardrails;
  entityName?: string | null;
}

export interface SearchOptions {
  maxNodes?: number;
}

export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}
