import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { ModelProvider } from './types';

export function getModel(provider: ModelProvider, modelName: string, apiKey?: string) {
  switch (provider) {
    case 'openai': {
      const key = apiKey || process.env.OPENAI_API_KEY;
      if (!key) throw new Error('OpenAI API key is not configured. Set OPENAI_API_KEY in your environment or add it in Settings.');
      const openai = createOpenAI({ apiKey: key });
      return openai(modelName);
    }
    case 'anthropic': {
      const key = apiKey || process.env.ANTHROPIC_API_KEY;
      if (!key) throw new Error('Anthropic API key is not configured. Set ANTHROPIC_API_KEY in your environment or add it in Settings.');
      const anthropic = createAnthropic({ apiKey: key });
      return anthropic(modelName);
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
