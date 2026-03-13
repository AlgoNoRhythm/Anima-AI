export const MAX_FILE_SIZE_MB = 50;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const MAX_DOCUMENTS_PER_PROJECT = 100;
export const MAX_CHUNK_TOKENS = 512;
export const CHUNK_OVERLAP_TOKENS = 64;
export const DEFAULT_RATE_LIMIT = {
  maxRequests: 20,
  windowSeconds: 60,
} as const;

export const DEFAULT_TOKEN_BUDGET_PER_SESSION = 10000;

export const SESSION_EXPIRY_HOURS = 24;

export const DEFAULT_THEME = {
  primaryColor: '#eab308',
  backgroundColor: '#fffdf9',
  fontFamily: 'Inter, system-ui, sans-serif',
  welcomeMessage: 'Hi! How can I help you today?',
} as const;

export const DEFAULT_GUARDRAILS = {
  blockedTopics: [],
  maxResponseLength: 2000,
  requireCitations: true,
  allowOffTopic: false,
  customInstructions: null,
} as const;

export const SUPPORTED_FILE_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/html',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export const FILE_ACCEPT_STRING = '.pdf,.txt,.md,.html,.docx';

/**
 * Centralized model options. Update these when providers release new models.
 * The first entry in each provider is the default.
 */
export const MODEL_OPTIONS: Record<string, { value: string; label: string }[]> = {
  anthropic: [
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
    { value: 'claude-sonnet-4-5-20250514', label: 'Claude Sonnet 4.5' },
  ],
  openai: [
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  ],
};

/** Default provider key (must match a key in MODEL_OPTIONS) */
export const DEFAULT_MODEL_PROVIDER = 'anthropic' as const;

/** Default model (must match a value in MODEL_OPTIONS[DEFAULT_MODEL_PROVIDER]) */
export const DEFAULT_MODEL_NAME = MODEL_OPTIONS[DEFAULT_MODEL_PROVIDER]![0]!.value;

export const DEFAULT_PERSONALITY = {
  name: 'Default',
  systemPrompt: `You ARE the entity described in your knowledge base. Speak in first person as if you are this entity — whether it's a product, a place, an appliance, or anything else.
- Use "I" and "my" when talking about yourself: "I have 3 bedrooms" not "The apartment has 3 bedrooms"
- Present facts as your own: "My warranty covers 2 years" not "According to the manual, the warranty is 2 years"
- If asked who you are, introduce yourself naturally by your name
Stay in character. Cite page numbers when referencing specific details.`,
  tone: 'professional' as const,
  temperature: 0.7,
  modelProvider: DEFAULT_MODEL_PROVIDER,
  modelName: DEFAULT_MODEL_NAME,
} as const;
