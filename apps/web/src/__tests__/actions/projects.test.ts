import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted before imports - factories must NOT reference outer const/let variables.

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string): never => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock('../../lib/auth-helpers', () => ({
  getUserId: vi.fn().mockResolvedValue('user-123'),
}));

vi.mock('../../lib/project-auth', () => ({
  requireProjectAccess: vi.fn(),
}));

vi.mock('@anima-ai/database', () => ({
  createDatabase: vi.fn(() => ({})),
  projectQueries: vi.fn(() => ({
    findBySlug: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    findByIdAndUser: vi.fn(),
    findByIdAndMember: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    count: vi.fn(),
  })),
  personalityQueries: vi.fn(() => ({
    upsert: vi.fn().mockResolvedValue({}),
  })),
  themeQueries: vi.fn(() => ({
    upsert: vi.fn().mockResolvedValue({}),
  })),
}));

// Import after mocks are declared
import { redirect } from 'next/navigation';
import { projectQueries, personalityQueries, themeQueries } from '@anima-ai/database';
import { requireProjectAccess } from '../../lib/project-auth';
import { createProject, updateProject, deleteProject } from '../../lib/actions/projects';

const mockRedirect = vi.mocked(redirect);
const mockRequireAccess = vi.mocked(requireProjectAccess);

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

function getProjectMocks() {
  const queries = vi.mocked(projectQueries)({} as any);
  return {
    findBySlug: vi.mocked(queries.findBySlug),
    create: vi.mocked(queries.create),
    delete: vi.mocked(queries.delete),
    update: vi.mocked(queries.update),
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  mockRedirect.mockImplementation((url: string): never => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  });

  // Default: requireProjectAccess succeeds as owner
  mockRequireAccess.mockResolvedValue({
    project: { id: 'proj-123', userId: 'user-123', name: 'Test', slug: 'test', mode: 'both', settings: {}, description: null, createdAt: new Date(), updatedAt: new Date() } as any,
    role: 'owner',
  });

  vi.mocked(projectQueries).mockReturnValue({
    findBySlug: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    findByIdAndUser: vi.fn(),
    findByIdAndMember: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    count: vi.fn(),
  } as any);

  vi.mocked(personalityQueries).mockReturnValue({
    upsert: vi.fn().mockResolvedValue({}),
  } as any);

  vi.mocked(themeQueries).mockReturnValue({
    upsert: vi.fn().mockResolvedValue({}),
  } as any);
});

describe('createProject', () => {
  it('redirects with error when name is empty', async () => {
    const fd = makeFormData({ name: '', slug: 'my-project' });

    await expect(createProject(fd)).rejects.toThrow('NEXT_REDIRECT');
    const redirectUrl: string = mockRedirect.mock.calls[0]?.[0] as string;
    expect(redirectUrl).toContain('/projects/new?error=');
  });

  it('redirects with error when slug is empty', async () => {
    const fd = makeFormData({ name: 'My Project', slug: '' });

    await expect(createProject(fd)).rejects.toThrow('NEXT_REDIRECT');
    const redirectUrl: string = mockRedirect.mock.calls[0]?.[0] as string;
    expect(redirectUrl).toContain('/projects/new?error=');
  });

  it('redirects with error when slug has invalid characters', async () => {
    const fd = makeFormData({ name: 'My Project', slug: 'My Project!' });

    await expect(createProject(fd)).rejects.toThrow('NEXT_REDIRECT');
    const redirectUrl: string = mockRedirect.mock.calls[0]?.[0] as string;
    expect(redirectUrl).toContain('/projects/new?error=');
  });

  it('redirects with error when slug already exists', async () => {
    const mocks = getProjectMocks();
    mocks.findBySlug.mockResolvedValue({ id: 'existing-id', slug: 'taken-slug' } as any);

    const fd = makeFormData({ name: 'My Project', slug: 'taken-slug' });

    await expect(createProject(fd)).rejects.toThrow('NEXT_REDIRECT');
    const redirectUrl: string = mockRedirect.mock.calls[0]?.[0] as string;
    expect(decodeURIComponent(redirectUrl)).toContain('already exists');
  });

  it('creates project and redirects to project page on success', async () => {
    const mocks = getProjectMocks();
    mocks.findBySlug.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: 'proj-456', slug: 'new-project' } as any);

    const fd = makeFormData({ name: 'New Project', slug: 'new-project', mode: 'both' });

    await expect(createProject(fd)).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New Project',
        slug: 'new-project',
        userId: 'user-123',
      }),
    );

    const redirectUrl: string = mockRedirect.mock.calls[0]?.[0] as string;
    expect(redirectUrl).toBe('/projects/proj-456');
  });

  it('uses default mode "both" when mode not provided', async () => {
    const mocks = getProjectMocks();
    mocks.findBySlug.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: 'proj-789', slug: 'another-project' } as any);

    const fd = makeFormData({ name: 'Another Project', slug: 'another-project' });

    await expect(createProject(fd)).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'both' }),
    );
  });

  it('creates default personality and theme after project creation', async () => {
    const mocks = getProjectMocks();
    mocks.findBySlug.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: 'proj-999', slug: 'with-defaults' } as any);

    const personalityMocks = vi.mocked(personalityQueries)({} as any);
    const themeMocks = vi.mocked(themeQueries)({} as any);

    const fd = makeFormData({ name: 'With Defaults', slug: 'with-defaults' });
    await expect(createProject(fd)).rejects.toThrow('NEXT_REDIRECT');

    expect(personalityMocks.upsert).toHaveBeenCalledWith(
      'proj-999',
      expect.objectContaining({ name: 'Default Assistant' }),
    );
    expect(themeMocks.upsert).toHaveBeenCalledWith('proj-999', {});
  });
});

describe('updateProject', () => {
  it('returns error when user lacks owner access', async () => {
    mockRequireAccess.mockResolvedValue({ error: 'Project not found' } as any);

    const result = await updateProject('proj-123', { name: 'New Name' });
    expect(result).toEqual({ success: false, error: 'Project not found' });
  });

  it('returns error for invalid data', async () => {
    const result = await updateProject('proj-123', { slug: 'INVALID SLUG!' });
    expect(result).toEqual({ success: false, error: expect.any(String) });
  });

  it('updates project on success', async () => {
    const mocks = getProjectMocks();
    mocks.update.mockResolvedValue({ id: 'proj-123', name: 'Updated' } as any);

    const result = await updateProject('proj-123', { name: 'Updated' });
    expect(result).toEqual({ success: true });
    expect(mocks.update).toHaveBeenCalledWith('proj-123', { name: 'Updated' });
  });

  it('accepts settings in update payload (bug fix)', async () => {
    const mocks = getProjectMocks();
    mocks.update.mockResolvedValue({ id: 'proj-123' } as any);

    const result = await updateProject('proj-123', { settings: { rateLimit: 10 } });
    expect(result).toEqual({ success: true });
    expect(mocks.update).toHaveBeenCalledWith('proj-123', { settings: { rateLimit: 10 } });
  });

  it('requires owner role', async () => {
    await updateProject('proj-123', { name: 'Test' });
    expect(mockRequireAccess).toHaveBeenCalledWith('proj-123', 'owner');
  });
});

describe('deleteProject', () => {
  it('returns error when project not found', async () => {
    mockRequireAccess.mockResolvedValue({ error: 'Project not found' } as any);

    const result = await deleteProject('non-existent-id');
    expect(result).toEqual({ success: false, error: 'Project not found' });
  });

  it('deletes project and redirects to /projects on success', async () => {
    const mocks = getProjectMocks();

    await expect(deleteProject('proj-123')).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.delete).toHaveBeenCalledWith('proj-123');
    const redirectUrl: string = mockRedirect.mock.calls[0]?.[0] as string;
    expect(redirectUrl).toBe('/projects');
  });

  it('requires owner role', async () => {
    await expect(deleteProject('proj-123')).rejects.toThrow('NEXT_REDIRECT');
    expect(mockRequireAccess).toHaveBeenCalledWith('proj-123', 'owner');
  });

  it('returns error on unexpected exception', async () => {
    mockRequireAccess.mockRejectedValue(new Error('DB connection lost'));

    const result = await deleteProject('proj-abc');
    expect(result).toEqual({ success: false, error: 'An unexpected error occurred' });
  });
});
