export type MessageRole = 'user' | 'assistant' | 'system';
export type FeedbackType = 'positive' | 'negative' | null;

export interface Citation {
  documentId: string;
  documentTitle: string;
  pageNumbers: number[];
  sectionTitle: string | null;
  text: string;
  score: number;
}

export interface Message {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  citations: Citation[];
  feedback: FeedbackType;
  createdAt: Date;
}

export interface ChatSession {
  id: string;
  projectId: string;
  sessionToken: string;
  ipHash: string | null;
  userAgent: string | null;
  createdAt: Date;
  expiresAt: Date;
}
