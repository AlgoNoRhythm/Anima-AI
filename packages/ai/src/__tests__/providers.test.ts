import { describe, it, expect } from 'vitest';
import { getModel } from '../providers';

describe('providers', () => {
  it('returns an OpenAI model', () => {
    const model = getModel('openai', 'gpt-4o-mini', 'test-key');
    expect(model).toBeDefined();
    expect(model.modelId).toBe('gpt-4o-mini');
  });

  it('returns an Anthropic model', () => {
    const model = getModel('anthropic', 'claude-sonnet-4-20250514', 'test-key');
    expect(model).toBeDefined();
    expect(model.modelId).toBe('claude-sonnet-4-20250514');
  });

  it('throws for unsupported provider', () => {
    expect(() => getModel('unknown' as any, 'model')).toThrow('Unsupported provider');
  });
});
