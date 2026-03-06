import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auth — must match the import specifier used in the route file
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock database
const mockFindByIdAndMember = vi.fn();
const mockFindByProjectId = vi.fn();
const mockCountByProjectId = vi.fn();
const mockRatingDistribution = vi.fn();
const mockAverageRatingById = vi.fn();
const mockDailyRatingAverages = vi.fn();

vi.mock('@anima-ai/database', () => ({
  createDatabase: vi.fn(() => ({})),
  projectQueries: vi.fn(() => ({
    findByIdAndMember: mockFindByIdAndMember,
  })),
  feedbackResponseQueries: vi.fn(() => ({
    findByProjectId: mockFindByProjectId,
    countByProjectId: mockCountByProjectId,
    ratingDistribution: mockRatingDistribution,
    averageRatingById: mockAverageRatingById,
    dailyRatingAverages: mockDailyRatingAverages,
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

import { auth } from '@/lib/auth';
import { GET } from '../../app/api/projects/[projectId]/feedback-responses/route';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;

function makeRequest(searchParams: Record<string, string> = {}) {
  const url = new URL('http://localhost:3000/api/projects/proj-123/feedback-responses');
  for (const [k, v] of Object.entries(searchParams)) {
    url.searchParams.set(k, v);
  }
  return new Request(url.toString());
}

function makeParams(projectId = 'proj-123') {
  return { params: Promise.resolve({ projectId }) };
}

beforeEach(() => {
  vi.clearAllMocks();

  mockAuth.mockResolvedValue({
    user: { id: 'user-123', name: 'Test', email: 'test@test.com' },
    expires: new Date(Date.now() + 86400000).toISOString(),
  } as any);

  mockFindByIdAndMember.mockResolvedValue({
    project: { id: 'proj-123', name: 'Test' },
    role: 'owner',
  });

  mockFindByProjectId.mockResolvedValue([]);
  mockCountByProjectId.mockResolvedValue(0);
  mockRatingDistribution.mockResolvedValue([]);
  mockAverageRatingById.mockResolvedValue(null);
  mockDailyRatingAverages.mockResolvedValue([]);
});

describe('GET /api/projects/[projectId]/feedback-responses', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 404 when project not found or not a member', async () => {
    mockFindByIdAndMember.mockResolvedValue(null);

    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error).toBe('Not found');
  });

  it('returns responses and totalCount', async () => {
    const mockResponses = [
      { id: 'r1', ratings: [{ ratingId: 'exp', value: 5 }], answers: [], createdAt: new Date() },
    ];
    mockFindByProjectId.mockResolvedValue(mockResponses);
    mockCountByProjectId.mockResolvedValue(1);

    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.responses).toHaveLength(1);
    expect(body.totalCount).toBe(1);
    expect(body.ratingDistribution).toBeUndefined();
  });

  it('includes rating data when ratingId is provided', async () => {
    mockRatingDistribution.mockResolvedValue([
      { value: 4, count: 1 },
      { value: 5, count: 2 },
    ]);
    mockAverageRatingById.mockResolvedValue(4.67);
    mockDailyRatingAverages.mockResolvedValue([
      { date: '2026-03-01', avg: 4.67, count: 3 },
    ]);

    const res = await GET(
      makeRequest({ ratingId: 'experience' }),
      makeParams(),
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ratingDistribution).toEqual([
      { value: 4, count: 1 },
      { value: 5, count: 2 },
    ]);
    expect(body.ratingAverage).toBe(4.67);
    expect(body.dailyRatingAverages).toHaveLength(1);
  });

  it('passes days filter as since date', async () => {
    const res = await GET(
      makeRequest({ days: '7' }),
      makeParams(),
    );
    expect(res.status).toBe(200);

    // Verify findByProjectId was called with a since Date
    expect(mockFindByProjectId).toHaveBeenCalledWith(
      'proj-123',
      50,
      0,
      expect.any(Date),
    );
    expect(mockCountByProjectId).toHaveBeenCalledWith(
      'proj-123',
      expect.any(Date),
    );
  });

  it('passes undefined since when no days param', async () => {
    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(200);

    expect(mockFindByProjectId).toHaveBeenCalledWith(
      'proj-123',
      50,
      0,
      undefined,
    );
  });

  it('respects limit and offset params', async () => {
    const res = await GET(
      makeRequest({ limit: '10', offset: '20' }),
      makeParams(),
    );
    expect(res.status).toBe(200);

    expect(mockFindByProjectId).toHaveBeenCalledWith(
      'proj-123',
      10,
      20,
      undefined,
    );
  });

  it('clamps limit to max 100', async () => {
    await GET(makeRequest({ limit: '999' }), makeParams());

    expect(mockFindByProjectId).toHaveBeenCalledWith(
      'proj-123',
      100,
      0,
      undefined,
    );
  });

  it('clamps limit to min 1', async () => {
    await GET(makeRequest({ limit: '-5' }), makeParams());

    expect(mockFindByProjectId).toHaveBeenCalledWith(
      'proj-123',
      1,
      0,
      undefined,
    );
  });

  it('clamps offset to min 0', async () => {
    await GET(makeRequest({ offset: '-10' }), makeParams());

    expect(mockFindByProjectId).toHaveBeenCalledWith(
      'proj-123',
      50,
      0,
      undefined,
    );
  });

  it('returns 500 on unexpected error', async () => {
    mockFindByIdAndMember.mockRejectedValue(new Error('DB down'));

    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toBe('Internal server error');
  });

  it('passes ratingId to distribution queries when provided with days', async () => {
    await GET(
      makeRequest({ ratingId: 'quality', days: '30' }),
      makeParams(),
    );

    expect(mockRatingDistribution).toHaveBeenCalledWith(
      'proj-123',
      'quality',
      expect.any(Date),
    );
    expect(mockAverageRatingById).toHaveBeenCalledWith(
      'proj-123',
      'quality',
      expect.any(Date),
    );
    expect(mockDailyRatingAverages).toHaveBeenCalledWith(
      'proj-123',
      'quality',
      30,
    );
  });

  it('uses 30 as default days for dailyRatingAverages when no days param', async () => {
    await GET(
      makeRequest({ ratingId: 'quality' }),
      makeParams(),
    );

    expect(mockDailyRatingAverages).toHaveBeenCalledWith(
      'proj-123',
      'quality',
      30,
    );
  });
});
