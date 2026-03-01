import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../personality';
import type { PersonalityConfig } from '../types';

const basePersonality: PersonalityConfig = {
  name: 'Test Bot',
  systemPrompt: 'You are a helpful assistant.',
  tone: 'friendly',
  temperature: 0.7,
  modelProvider: 'openai',
  modelName: 'gpt-4o-mini',
  guardrails: {
    blockedTopics: [],
    maxResponseLength: 2000,
    requireCitations: true,
    allowOffTopic: false,
    customInstructions: null,
  },
};

describe('buildSystemPrompt', () => {
  it('includes base system prompt', () => {
    const result = buildSystemPrompt(basePersonality, '');
    expect(result).toContain('You are a helpful assistant.');
  });

  it('includes tone instruction', () => {
    const result = buildSystemPrompt(basePersonality, '');
    expect(result).toContain('warm');
  });

  it('includes citation instruction when required', () => {
    const result = buildSystemPrompt(basePersonality, '');
    expect(result).toContain('Reference page numbers and section titles');
  });

  it('includes off-topic instruction when not allowed', () => {
    const result = buildSystemPrompt(basePersonality, '');
    expect(result).toContain('Only answer questions about yourself');
  });

  it('includes context when provided', () => {
    const result = buildSystemPrompt(basePersonality, 'This is the manual content.');
    expect(result).toContain('This is the manual content.');
  });

  it('includes custom instructions', () => {
    const config = {
      ...basePersonality,
      guardrails: { ...basePersonality.guardrails, customInstructions: 'Always respond in Spanish.' },
    };
    const result = buildSystemPrompt(config, '');
    expect(result).toContain('Always respond in Spanish.');
  });

  it('omits off-topic restriction when allowed', () => {
    const config = {
      ...basePersonality,
      guardrails: { ...basePersonality.guardrails, allowOffTopic: true },
    };
    const result = buildSystemPrompt(config, '');
    expect(result).not.toContain('Only answer questions about yourself');
  });
});
