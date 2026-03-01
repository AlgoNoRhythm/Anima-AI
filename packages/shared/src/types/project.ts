export type ProjectMode = 'chat' | 'pdf' | 'both';

export interface ProjectSettings {
  maxFileSize?: number;
  maxDocuments?: number;
  allowAnonymousChat?: boolean;
  tokenBudgetPerSession?: number;
  enableAnalytics?: boolean;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  slug: string;
  description: string | null;
  mode: ProjectMode;
  settings: ProjectSettings;
  createdAt: Date;
  updatedAt: Date;
}
