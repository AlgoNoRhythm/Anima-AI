import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/auth-helpers', () => ({
  getUserId: vi.fn().mockResolvedValue('user-123'),
}));

vi.mock('../../lib/project-auth', () => ({
  requireProjectAccess: vi.fn(),
}));

vi.mock('@anima-ai/database', () => ({
  createDatabase: vi.fn(() => ({})),
  feedbackConfigQueries: vi.fn(() => ({
    upsert: vi.fn().mockResolvedValue({ id: 'fc-1', enabled: true }),
    findByProjectId: vi.fn(),
  })),
}));

vi.mock('@anima-ai/shared', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

import { feedbackConfigQueries } from '@anima-ai/database';
import { requireProjectAccess } from '../../lib/project-auth';
import { updateFeedbackConfig } from '../../lib/actions/feedback';

const mockRequireAccess = vi.mocked(requireProjectAccess);

function getFeedbackConfigMocks() {
  const queries = vi.mocked(feedbackConfigQueries)({} as any);
  return {
    upsert: vi.mocked(queries.upsert),
    findByProjectId: vi.mocked(queries.findByProjectId),
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  mockRequireAccess.mockResolvedValue({
    project: { id: 'proj-123', userId: 'user-123', name: 'Test', slug: 'test', mode: 'both', settings: {}, description: null, createdAt: new Date(), updatedAt: new Date() } as any,
    role: 'owner',
  });

  vi.mocked(feedbackConfigQueries).mockReturnValue({
    upsert: vi.fn().mockResolvedValue({ id: 'fc-1', enabled: true }),
    findByProjectId: vi.fn(),
  } as any);
});

describe('updateFeedbackConfig', () => {
  it('requires editor access', async () => {
    await updateFeedbackConfig('proj-123', { enabled: true });
    expect(mockRequireAccess).toHaveBeenCalledWith('proj-123', 'editor');
  });

  it('returns error when access denied', async () => {
    mockRequireAccess.mockResolvedValue({ error: 'Project not found' } as any);

    const result = await updateFeedbackConfig('proj-123', { enabled: true });
    expect(result).toEqual({ success: false, error: 'Project not found' });
  });

  it('returns error for invalid rating label too long', async () => {
    const result = await updateFeedbackConfig('proj-123', {
      ratings: [{ id: 'r1', label: 'x'.repeat(201), required: false }],
    });
    expect(result).toEqual({ success: false, error: expect.any(String) });
  });

  it('returns error for too many questions', async () => {
    const questions = Array.from({ length: 11 }, (_, i) => ({
      id: `q${i}`,
      label: `Question ${i}`,
      type: 'text',
      required: false,
    }));
    const result = await updateFeedbackConfig('proj-123', { questions });
    expect(result).toEqual({ success: false, error: expect.any(String) });
  });

  it('returns error for too many ratings', async () => {
    const ratings = Array.from({ length: 11 }, (_, i) => ({
      id: `r${i}`,
      label: `Rating ${i}`,
      required: false,
    }));
    const result = await updateFeedbackConfig('proj-123', { ratings });
    expect(result).toEqual({ success: false, error: expect.any(String) });
  });

  it('returns error for invalid question type', async () => {
    const result = await updateFeedbackConfig('proj-123', {
      questions: [{ id: 'q1', label: 'Test', type: 'number', required: false }],
    });
    expect(result).toEqual({ success: false, error: expect.any(String) });
  });

  it('updates config on success', async () => {
    const mocks = getFeedbackConfigMocks();

    const result = await updateFeedbackConfig('proj-123', {
      enabled: true,
      ratings: [{ id: 'r1', label: 'Rate us', required: false }],
      submitButtonLabel: 'Submit',
      thankYouMessage: 'Thanks!',
      questions: [{ id: 'q1', label: 'What did you like?', type: 'text', required: true }],
    });

    expect(result).toEqual({ success: true });
    expect(mocks.upsert).toHaveBeenCalledWith('proj-123', expect.objectContaining({
      enabled: true,
      ratings: [{ id: 'r1', label: 'Rate us', required: false }],
    }));
  });

  it('handles unexpected errors gracefully', async () => {
    mockRequireAccess.mockRejectedValue(new Error('DB connection lost'));

    const result = await updateFeedbackConfig('proj-123', { enabled: true });
    expect(result).toEqual({ success: false, error: 'An unexpected error occurred' });
  });

  it('accepts partial updates', async () => {
    const mocks = getFeedbackConfigMocks();

    const result = await updateFeedbackConfig('proj-123', { enabled: false });
    expect(result).toEqual({ success: true });
    expect(mocks.upsert).toHaveBeenCalledWith('proj-123', { enabled: false });
  });
});
