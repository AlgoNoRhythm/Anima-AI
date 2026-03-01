import { createDecipheriv } from 'node:crypto';
import { createDatabase, projectQueries, personalityQueries, documentQueries, messageQueries, analyticsQueries, apiKeyQueries } from '@anima-ai/database';
import { ragPipeline } from '@anima-ai/ai';
import type { PersonalityConfig, Guardrails } from '@anima-ai/ai';
import { DEFAULT_PERSONALITY, DEFAULT_GUARDRAILS, createLogger } from '@anima-ai/shared';

const log = createLogger('chat-service');

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'ENCRYPTION_KEY environment variable must be set in production.',
      );
    }
    const fallback = process.env.AUTH_SECRET ?? 'dev-encryption-key-not-for-production';
    return Buffer.from(fallback.padEnd(32, '0').slice(0, 32));
  }
  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }
  return Buffer.from(key, 'hex');
}

function decryptApiKey(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted key format');
  }
  const [ivHex, encryptedHex, authTagHex] = parts;
  const encKey = getEncryptionKey();
  const iv = Buffer.from(ivHex!, 'hex');
  const authTag = Buffer.from(authTagHex!, 'hex');
  const decipher = createDecipheriv(ALGORITHM, encKey, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex!, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  projectSlug: string;
  sessionId: string;
  message: string;
  history?: ChatHistoryMessage[];
}

export interface ChatResponse {
  messageId: string;
  textStream: AsyncIterable<string>;
  citations: Array<{
    documentId: string;
    documentTitle: string;
    pageNumbers: number[];
    text: string;
    score: number;
    sectionTitle: string | null;
  }>;
  /** Generate follow-up questions (captures API key internally — never exposed to clients). */
  getFollowUps: (query: string, answer: string) => Promise<string[]>;
}

export async function handleChat(request: ChatRequest): Promise<ChatResponse> {
  const db = createDatabase();

  // Look up project by slug
  const project = await projectQueries(db).findBySlug(request.projectSlug);
  if (!project) {
    throw new Error('Project not found');
  }

  if (project.mode === 'pdf') {
    throw new Error('This project is configured for document viewing only');
  }

  // Get personality config (fall back to defaults for unconfigured projects)
  const personality = await personalityQueries(db).findByProjectId(project.id);

  // Build document titles map and detect entity
  const documents = await documentQueries(db).findByProjectId(project.id);
  const documentTitles = new Map<string, string>();
  let entityName: string | null = null;
  for (const doc of documents) {
    documentTitles.set(doc.id, doc.title || doc.filename);
    if (!entityName && doc.detectedEntity) {
      entityName = doc.detectedEntity;
    }
  }

  // Build PersonalityConfig for the RAG pipeline
  const personalityConfig: PersonalityConfig = personality
    ? (() => {
        const guardrails = (personality.guardrails ?? {}) as Guardrails;
        return {
          name: personality.name,
          systemPrompt: personality.systemPrompt,
          tone: personality.tone,
          temperature: personality.temperature,
          modelProvider: personality.modelProvider as 'openai' | 'anthropic',
          modelName: personality.modelName,
          entityName,
          guardrails: {
            blockedTopics: guardrails.blockedTopics || [],
            maxResponseLength: guardrails.maxResponseLength || 2000,
            requireCitations: guardrails.requireCitations ?? true,
            allowOffTopic: guardrails.allowOffTopic ?? false,
            customInstructions: guardrails.customInstructions || null,
          },
        };
      })()
    : {
        name: DEFAULT_PERSONALITY.name,
        systemPrompt: DEFAULT_PERSONALITY.systemPrompt,
        tone: DEFAULT_PERSONALITY.tone,
        temperature: DEFAULT_PERSONALITY.temperature,
        modelProvider: DEFAULT_PERSONALITY.modelProvider as 'openai' | 'anthropic',
        modelName: DEFAULT_PERSONALITY.modelName,
        entityName,
        guardrails: {
          blockedTopics: [...DEFAULT_GUARDRAILS.blockedTopics],
          maxResponseLength: DEFAULT_GUARDRAILS.maxResponseLength,
          requireCitations: DEFAULT_GUARDRAILS.requireCitations,
          allowOffTopic: DEFAULT_GUARDRAILS.allowOffTopic,
          customInstructions: DEFAULT_GUARDRAILS.customInstructions,
        },
      };

  // Save user message
  const userMessage = await messageQueries(db).create({
    sessionId: request.sessionId,
    role: 'user',
    content: request.message,
  });

  // Log analytics
  await analyticsQueries(db).logEvent({
    projectId: project.id,
    sessionId: request.sessionId,
    eventType: 'message_sent',
  });

  // Load the project owner's stored API key for the configured provider (if any)
  let ownerApiKey: string | undefined;
  try {
    const storedKey = await apiKeyQueries(db).findByUserAndProvider(
      project.userId,
      personalityConfig.modelProvider as string,
    );
    if (storedKey) {
      ownerApiKey = decryptApiKey(storedKey.encryptedKey);
    }
  } catch (err) {
    // Check if we can fall back to env var
    const provider = personalityConfig.modelProvider as string;
    const envKey = provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY;
    if (envKey) {
      log.warn('Failed to decrypt stored API key, falling back to env key', { provider });
    } else {
      throw new Error(`Failed to decrypt stored API key and no fallback environment variable is configured. Please re-save your API key in Settings.`);
    }
  }

  // Run RAG pipeline
  const result = await ragPipeline(
    request.message,
    project.id,
    personalityConfig,
    db,
    documentTitles,
    {},
    request.history || [],
    ownerApiKey,
  );

  // Create a wrapper that saves the assistant message on completion
  const collectedText: string[] = [];
  const wrappedStream: AsyncIterable<string> = {
    [Symbol.asyncIterator]() {
      const iterator = result.textStream[Symbol.asyncIterator]();
      return {
        async next() {
          const { value, done } = await iterator.next();
          if (!done && value) {
            collectedText.push(value);
          }
          if (done) {
            // Save assistant message with full text and citations
            const fullText = collectedText.join('');
            if (fullText) {
              await messageQueries(db).create({
                sessionId: request.sessionId,
                role: 'assistant',
                content: fullText,
                citations: result.citations,
              });

              await analyticsQueries(db).logEvent({
                projectId: project.id,
                sessionId: request.sessionId,
                eventType: 'message_received',
              });
            }
          }
          return { value, done };
        },
      };
    },
  };

  return {
    messageId: userMessage.id,
    textStream: wrappedStream,
    citations: result.citations,
    getFollowUps: async (query: string, answer: string) => {
      const { generateFollowUps } = await import('@anima-ai/ai');
      return generateFollowUps(query, answer, personalityConfig.modelProvider, personalityConfig.modelName, ownerApiKey);
    },
  };
}
