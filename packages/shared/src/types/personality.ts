export type Tone = 'professional' | 'friendly' | 'casual' | 'formal' | 'technical';

export interface Guardrails {
  blockedTopics: string[];
  maxResponseLength: number;
  requireCitations: boolean;
  allowOffTopic: boolean;
  customInstructions: string | null;
}

export interface Personality {
  id: string;
  projectId: string;
  name: string;
  systemPrompt: string;
  tone: Tone;
  temperature: number;
  modelProvider: string;
  modelName: string;
  guardrails: Guardrails;
  createdAt: Date;
  updatedAt: Date;
}
