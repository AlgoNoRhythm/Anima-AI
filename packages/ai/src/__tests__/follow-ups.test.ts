import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateText } from 'ai';
import { getModel } from '../providers';

// vi.mock is hoisted to the top - factories must not reference outer variables
vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

vi.mock('../providers', () => ({
  getModel: vi.fn(() => ({ modelId: 'gpt-4o-mini' })),
}));

import { generateFollowUps } from '../follow-ups';

const mockGenerateText = vi.mocked(generateText);
const mockGetModel = vi.mocked(getModel);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetModel.mockReturnValue({ modelId: 'gpt-4o-mini' } as any);
});

describe('generateFollowUps', () => {
  const QUERY = 'How do I clean the filter?';
  const ANSWER = 'Remove the filter tray, rinse under warm water, and reinsert.';

  it('returns parsed questions array on success', async () => {
    const questions = ['How often should I clean it?', 'Can I use soap?', 'Where is the filter?'];
    mockGenerateText.mockResolvedValue({ text: JSON.stringify(questions) } as any);

    const result = await generateFollowUps(QUERY, ANSWER);

    expect(result).toEqual(questions);
    expect(result).toHaveLength(3);
  });

  it('limits to 3 questions maximum even when AI returns more', async () => {
    const questions = [
      'Question 1?',
      'Question 2?',
      'Question 3?',
      'Question 4?',
      'Question 5?',
    ];
    mockGenerateText.mockResolvedValue({ text: JSON.stringify(questions) } as any);

    const result = await generateFollowUps(QUERY, ANSWER);

    expect(result).toHaveLength(3);
    expect(result).toEqual(questions.slice(0, 3));
  });

  it('returns empty array when AI call throws an error', async () => {
    mockGenerateText.mockRejectedValue(new Error('Network error'));

    const result = await generateFollowUps(QUERY, ANSWER);

    expect(result).toEqual([]);
  });

  it('returns empty array when AI returns malformed JSON', async () => {
    mockGenerateText.mockResolvedValue({ text: 'not valid json at all' } as any);

    const result = await generateFollowUps(QUERY, ANSWER);

    expect(result).toEqual([]);
  });

  it('returns empty array when AI returns a non-array JSON value', async () => {
    mockGenerateText.mockResolvedValue({ text: JSON.stringify({ question: 'foo?' }) } as any);

    const result = await generateFollowUps(QUERY, ANSWER);

    expect(result).toEqual([]);
  });

  it('returns empty array when AI returns array with non-string elements', async () => {
    mockGenerateText.mockResolvedValue({ text: JSON.stringify([1, 2, 3]) } as any);

    const result = await generateFollowUps(QUERY, ANSWER);

    expect(result).toEqual([]);
  });

  it('returns empty array for empty AI response text', async () => {
    mockGenerateText.mockResolvedValue({ text: '' } as any);

    const result = await generateFollowUps(QUERY, ANSWER);

    expect(result).toEqual([]);
  });

  it('passes custom provider and model to getModel', async () => {
    mockGenerateText.mockResolvedValue({ text: JSON.stringify(['Follow-up?']) } as any);

    await generateFollowUps(QUERY, ANSWER, 'anthropic', 'claude-haiku');

    expect(mockGetModel).toHaveBeenCalledWith('anthropic', 'claude-haiku', undefined);
  });

  it('uses anthropic and claude-haiku-4-5-20251001 as defaults when no provider/model supplied', async () => {
    mockGenerateText.mockResolvedValue({ text: JSON.stringify(['Question?']) } as any);

    await generateFollowUps(QUERY, ANSWER);

    expect(mockGetModel).toHaveBeenCalledWith('anthropic', 'claude-haiku-4-5-20251001', undefined);
  });

  it('returns fewer than 3 questions when AI returns fewer', async () => {
    mockGenerateText.mockResolvedValue({ text: JSON.stringify(['Only one?']) } as any);

    const result = await generateFollowUps(QUERY, ANSWER);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe('Only one?');
  });
});
