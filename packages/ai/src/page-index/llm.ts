import { generateText } from 'ai';
import { getModel } from '../providers';
import type { PageIndexConfig } from './types';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Call the LLM with retry logic. Returns the generated text.
 */
export async function callLLM(prompt: string, config: PageIndexConfig): Promise<string> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const model = getModel(config.provider, config.model, config.apiKey);
      const result = await generateText({
        model,
        prompt,
        temperature: 0,
        maxTokens: 4096,
      });
      return result.text;
    } catch (error) {
      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
      throw error;
    }
  }
  throw new Error('LLM call failed after all retries');
}

/**
 * Call the LLM and return both text and finish reason (for continuation handling).
 */
export async function callLLMWithFinishReason(
  prompt: string,
  config: PageIndexConfig,
): Promise<{ text: string; finishReason: string }> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const model = getModel(config.provider, config.model, config.apiKey);
      const result = await generateText({
        model,
        prompt,
        temperature: 0,
        maxTokens: 4096,
      });
      return { text: result.text, finishReason: result.finishReason };
    } catch (error) {
      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
      throw error;
    }
  }
  throw new Error('LLM call failed after all retries');
}
