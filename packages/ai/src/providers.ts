import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { ModelProvider } from './types';

export function getModel(provider: ModelProvider, modelName: string, apiKey?: string) {
  switch (provider) {
    case 'openai': {
      const key = apiKey || process.env.OPENAI_API_KEY;
      if (!key) {
        // Fall back to Anthropic if available
        const fallbackKey = process.env.ANTHROPIC_API_KEY;
        if (fallbackKey) {
          const anthropic = createAnthropic({ apiKey: fallbackKey });
          return anthropic('claude-haiku-4-5-20251001');
        }
        throw new Error('No AI provider API key is configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in your environment, or add one in Settings.');
      }
      const openai = createOpenAI({ apiKey: key });
      return openai(modelName);
    }
    case 'anthropic': {
      const key = apiKey || process.env.ANTHROPIC_API_KEY;
      if (!key) {
        // Fall back to OpenAI if available
        const fallbackKey = process.env.OPENAI_API_KEY;
        if (fallbackKey) {
          const openai = createOpenAI({ apiKey: fallbackKey });
          return openai('gpt-5-nano');
        }
        throw new Error('No AI provider API key is configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY in your environment, or add one in Settings.');
      }
      const anthropic = createAnthropic({ apiKey: key });
      return anthropic(modelName);
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
