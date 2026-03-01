import { generateText } from 'ai';
import { getModel } from './providers';
import { DEFAULT_MODEL_PROVIDER, DEFAULT_MODEL_NAME } from '@anima-ai/shared';

/**
 * Generate follow-up question suggestions based on a Q&A exchange.
 * Returns 2-3 brief questions the user might ask next.
 * Non-fatal: returns empty array on failure.
 */
export async function generateFollowUps(
  query: string,
  answer: string,
  provider?: string,
  modelName?: string,
  apiKey?: string,
): Promise<string[]> {
  try {
    const model = getModel(
      (provider as 'openai' | 'anthropic') || DEFAULT_MODEL_PROVIDER,
      modelName || DEFAULT_MODEL_NAME,
      apiKey,
    );

    const { text } = await generateText({
      model,
      prompt: `Based on this Q&A, suggest 2-3 brief follow-up questions the user might ask next. Return ONLY a JSON array of strings, no other text.\n\nQ: ${query}\nA: ${answer}`,
      maxTokens: 200,
    });

    const questions = JSON.parse(text);
    if (Array.isArray(questions) && questions.every((q) => typeof q === 'string')) {
      return questions.slice(0, 3);
    }
    return [];
  } catch {
    return [];
  }
}
