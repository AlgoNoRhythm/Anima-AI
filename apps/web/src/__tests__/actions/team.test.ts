import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/auth-helpers', () => ({
  getUserId: vi.fn().mockResolvedValue('user-owner'),
}));

vi.mock('../../lib/project-auth', () => ({
  requireProjectAccess: vi.fn(),
}));

vi.mock('@anima-ai/database', () => ({
  createDatabase: vi.fn(() => ({})),
  projectQueries: vi.fn(() => ({
    findById: vi.fn(),
  })),
  projectMemberQueries: vi.fn(() => ({
    findMembership: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    updateRole: vi.fn(),
  })),
  projectInvitationQueries: vi.fn(() => ({
    findByProjectId: vi.fn(),
    findByToken: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
  })),
  userQueries: vi.fn(() => ({
    findByEmail: vi.fn(),
  })),
}));

import { requireProjectAccess } from '../../lib/project-auth';
import { getUserId } from '../../lib/auth-helpers';
import {
  projectQueries,
  projectMemberQueries,
  projectInvitationQueries,
  userQueries,
} from '@anima-ai/database';
import {
  inviteMember,
  acceptInvitation,
  removeMember,
  updateMemberRole,
  cancelInvitation,
} from '../../lib/actions/team';

const mockRequireAccess = vi.mocked(requireProjectAccess);
const PROJECT_ID = 'proj-abc';

function mockOwnerAccess() {
  mockRequireAccess.mockResolvedValue({
    project: { id: PROJECT_ID, userId: 'user-owner', name: 'Test', slug: 'test', mode: 'both', settings: {}, description: null, createdAt: new Date(), updatedAt: new Date() } as any,
    role: 'owner',
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockOwnerAccess();

  vi.mocked(userQueries).mockReturnValue({
    findByEmail: vi.fn().mockResolvedValue(null),
  } as any);

  vi.mocked(projectMemberQueries).mockReturnValue({
    findMembership: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ projectId: PROJECT_ID, userId: 'user-new', role: 'editor' }),
    delete: vi.fn().mockResolvedValue(undefined),
    updateRole: vi.fn().mockResolvedValue({ role: 'editor' }),
  } as any);

  vi.mocked(projectInvitationQueries).mockReturnValue({
    findByProjectId: vi.fn().mockResolvedValue([]),
    findByToken: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: 'inv-1', token: 'tok-123' }),
    updateStatus: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(undefined),
  } as any);

  vi.mocked(projectQueries).mockReturnValue({
    findById: vi.fn().mockResolvedValue({ id: PROJECT_ID, userId: 'user-owner' }),
  } as any);
});

describe('inviteMember', () => {
  it('returns error when user lacks owner access', async () => {
    mockRequireAccess.mockResolvedValue({ error: 'Project not found' } as any);
    const result = await inviteMember(PROJECT_ID, { email: 'test@example.com', role: 'editor' });
    expect(result).toEqual({ success: false, error: 'Project not found' });
  });

  it('returns error for invalid email', async () => {
    const result = await inviteMember(PROJECT_ID, { email: 'not-an-email', role: 'editor' });
    expect(result).toEqual({ success: false, error: expect.stringContaining('email') });
  });

  it('returns error for invalid role', async () => {
    const result = await inviteMember(PROJECT_ID, { email: 'test@example.com', role: 'admin' });
    expect(result).toEqual({ success: false, error: expect.any(String) });
  });

  it('returns error when user is already project owner', async () => {
    vi.mocked(userQueries).mockReturnValue({
      findByEmail: vi.fn().mockResolvedValue({ id: 'user-owner', email: 'owner@example.com' }),
    } as any);

    const result = await inviteMember(PROJECT_ID, { email: 'owner@example.com', role: 'editor' });
    expect(result).toEqual({ success: false, error: 'This user is already the project owner' });
  });

  it('returns error when user is already a member', async () => {
    vi.mocked(userQueries).mockReturnValue({
      findByEmail: vi.fn().mockResolvedValue({ id: 'user-existing', email: 'member@example.com' }),
    } as any);
    vi.mocked(projectMemberQueries).mockReturnValue({
      findMembership: vi.fn().mockResolvedValue({ role: 'editor' }),
      create: vi.fn(),
      delete: vi.fn(),
      updateRole: vi.fn(),
    } as any);

    const result = await inviteMember(PROJECT_ID, { email: 'member@example.com', role: 'editor' });
    expect(result).toEqual({ success: false, error: 'This user is already a member of this project' });
  });

  it('returns error when pending invitation already exists', async () => {
    vi.mocked(projectInvitationQueries).mockReturnValue({
      findByProjectId: vi.fn().mockResolvedValue([
        { email: 'pending@example.com', status: 'pending' },
      ]),
      findByToken: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
      delete: vi.fn(),
    } as any);

    const result = await inviteMember(PROJECT_ID, { email: 'pending@example.com', role: 'editor' });
    expect(result).toEqual({ success: false, error: 'An invitation has already been sent to this email' });
  });

  it('creates invitation and returns token on success', async () => {
    const result = await inviteMember(PROJECT_ID, { email: 'new@example.com', role: 'editor' });
    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
  });

  it('calls create with correct params', async () => {
    const createMock = vi.fn().mockResolvedValue({ id: 'inv-1', token: 'tok-123' });
    vi.mocked(projectInvitationQueries).mockReturnValue({
      findByProjectId: vi.fn().mockResolvedValue([]),
      findByToken: vi.fn(),
      create: createMock,
      updateStatus: vi.fn(),
      delete: vi.fn(),
    } as any);

    await inviteMember(PROJECT_ID, { email: 'new@example.com', role: 'viewer' });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: PROJECT_ID,
        email: 'new@example.com',
        role: 'viewer',
        invitedBy: 'user-owner',
      }),
    );
  });

  it('requires owner role', async () => {
    await inviteMember(PROJECT_ID, { email: 'new@example.com', role: 'editor' });
    expect(mockRequireAccess).toHaveBeenCalledWith(PROJECT_ID, 'owner');
  });
});

describe('acceptInvitation', () => {
  it('returns error for non-existent token', async () => {
    const result = await acceptInvitation('bad-token');
    expect(result).toEqual({ success: false, error: 'Invitation not found' });
  });

  it('returns error for already used invitation', async () => {
    vi.mocked(projectInvitationQueries).mockReturnValue({
      findByProjectId: vi.fn(),
      findByToken: vi.fn().mockResolvedValue({
        id: 'inv-1',
        status: 'accepted',
        projectId: PROJECT_ID,
        email: 'test@example.com',
        role: 'editor',
        expiresAt: new Date(Date.now() + 86400000),
      }),
      create: vi.fn(),
      updateStatus: vi.fn(),
      delete: vi.fn(),
    } as any);

    const result = await acceptInvitation('used-token');
    expect(result).toEqual({ success: false, error: 'This invitation has already been used or expired' });
  });

  it('returns error and marks expired invitation', async () => {
    const updateStatusMock = vi.fn().mockResolvedValue({});
    vi.mocked(projectInvitationQueries).mockReturnValue({
      findByProjectId: vi.fn(),
      findByToken: vi.fn().mockResolvedValue({
        id: 'inv-1',
        status: 'pending',
        projectId: PROJECT_ID,
        email: 'test@example.com',
        role: 'editor',
        expiresAt: new Date(Date.now() - 86400000), // expired
      }),
      create: vi.fn(),
      updateStatus: updateStatusMock,
      delete: vi.fn(),
    } as any);

    const result = await acceptInvitation('expired-token');
    expect(result).toEqual({ success: false, error: 'This invitation has expired' });
    expect(updateStatusMock).toHaveBeenCalledWith('inv-1', 'expired');
  });

  it('succeeds without creating member if already a member', async () => {
    const createMock = vi.fn();
    vi.mocked(projectInvitationQueries).mockReturnValue({
      findByProjectId: vi.fn(),
      findByToken: vi.fn().mockResolvedValue({
        id: 'inv-1',
        status: 'pending',
        projectId: PROJECT_ID,
        email: 'test@example.com',
        role: 'editor',
        expiresAt: new Date(Date.now() + 86400000),
      }),
      create: vi.fn(),
      updateStatus: vi.fn().mockResolvedValue({}),
      delete: vi.fn(),
    } as any);
    vi.mocked(projectMemberQueries).mockReturnValue({
      findMembership: vi.fn().mockResolvedValue({ role: 'editor' }),
      create: createMock,
      delete: vi.fn(),
      updateRole: vi.fn(),
    } as any);

    const result = await acceptInvitation('valid-token');
    expect(result).toEqual({ success: true, projectId: PROJECT_ID });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('succeeds without creating member if user is project owner', async () => {
    const createMock = vi.fn();
    vi.mocked(projectInvitationQueries).mockReturnValue({
      findByProjectId: vi.fn(),
      findByToken: vi.fn().mockResolvedValue({
        id: 'inv-1',
        status: 'pending',
        projectId: PROJECT_ID,
        email: 'test@example.com',
        role: 'editor',
        expiresAt: new Date(Date.now() + 86400000),
      }),
      create: vi.fn(),
      updateStatus: vi.fn().mockResolvedValue({}),
      delete: vi.fn(),
    } as any);
    vi.mocked(projectMemberQueries).mockReturnValue({
      findMembership: vi.fn().mockResolvedValue(null),
      create: createMock,
      delete: vi.fn(),
      updateRole: vi.fn(),
    } as any);

    const result = await acceptInvitation('valid-token');
    expect(result).toEqual({ success: true, projectId: PROJECT_ID });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('creates membership on success for new user', async () => {
    vi.mocked(getUserId).mockResolvedValue('user-new');
    const createMock = vi.fn().mockResolvedValue({});
    vi.mocked(projectInvitationQueries).mockReturnValue({
      findByProjectId: vi.fn(),
      findByToken: vi.fn().mockResolvedValue({
        id: 'inv-1',
        status: 'pending',
        projectId: PROJECT_ID,
        email: 'new@example.com',
        role: 'editor',
        expiresAt: new Date(Date.now() + 86400000),
      }),
      create: vi.fn(),
      updateStatus: vi.fn().mockResolvedValue({}),
      delete: vi.fn(),
    } as any);
    vi.mocked(projectMemberQueries).mockReturnValue({
      findMembership: vi.fn().mockResolvedValue(null),
      create: createMock,
      delete: vi.fn(),
      updateRole: vi.fn(),
    } as any);
    vi.mocked(projectQueries).mockReturnValue({
      findById: vi.fn().mockResolvedValue({ id: PROJECT_ID, userId: 'user-owner' }),
    } as any);

    const result = await acceptInvitation('valid-token');
    expect(result).toEqual({ success: true, projectId: PROJECT_ID });
    expect(createMock).toHaveBeenCalledWith({
      projectId: PROJECT_ID,
      userId: 'user-new',
      role: 'editor',
    });
  });
});

describe('removeMember', () => {
  it('returns error when user lacks owner access', async () => {
    mockRequireAccess.mockResolvedValue({ error: 'You do not have permission to perform this action' } as any);
    const result = await removeMember(PROJECT_ID, 'user-member');
    expect(result).toEqual({ success: false, error: 'You do not have permission to perform this action' });
  });

  it('deletes member on success', async () => {
    const deleteMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(projectMemberQueries).mockReturnValue({
      findMembership: vi.fn(),
      create: vi.fn(),
      delete: deleteMock,
      updateRole: vi.fn(),
    } as any);

    const result = await removeMember(PROJECT_ID, 'user-member');
    expect(result).toEqual({ success: true });
    expect(deleteMock).toHaveBeenCalledWith(PROJECT_ID, 'user-member');
  });

  it('requires owner role', async () => {
    await removeMember(PROJECT_ID, 'user-member');
    expect(mockRequireAccess).toHaveBeenCalledWith(PROJECT_ID, 'owner');
  });
});

describe('updateMemberRole', () => {
  it('returns error when user lacks owner access', async () => {
    mockRequireAccess.mockResolvedValue({ error: 'Project not found' } as any);
    const result = await updateMemberRole(PROJECT_ID, 'user-member', 'editor');
    expect(result).toEqual({ success: false, error: 'Project not found' });
  });

  it('returns error for invalid role', async () => {
    const result = await updateMemberRole(PROJECT_ID, 'user-member', 'admin');
    expect(result).toEqual({ success: false, error: 'Invalid role' });
  });

  it('updates role on success', async () => {
    const updateRoleMock = vi.fn().mockResolvedValue({ role: 'viewer' });
    vi.mocked(projectMemberQueries).mockReturnValue({
      findMembership: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      updateRole: updateRoleMock,
    } as any);

    const result = await updateMemberRole(PROJECT_ID, 'user-member', 'viewer');
    expect(result).toEqual({ success: true });
    expect(updateRoleMock).toHaveBeenCalledWith(PROJECT_ID, 'user-member', 'viewer');
  });

  it('requires owner role', async () => {
    await updateMemberRole(PROJECT_ID, 'user-member', 'editor');
    expect(mockRequireAccess).toHaveBeenCalledWith(PROJECT_ID, 'owner');
  });
});

describe('cancelInvitation', () => {
  it('returns error when user lacks owner access', async () => {
    mockRequireAccess.mockResolvedValue({ error: 'Project not found' } as any);
    const result = await cancelInvitation(PROJECT_ID, 'inv-1');
    expect(result).toEqual({ success: false, error: 'Project not found' });
  });

  it('returns error when invitation not found for project', async () => {
    vi.mocked(projectInvitationQueries).mockReturnValue({
      findByProjectId: vi.fn().mockResolvedValue([]),
      findByToken: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
      delete: vi.fn(),
    } as any);

    const result = await cancelInvitation(PROJECT_ID, 'inv-nonexistent');
    expect(result).toEqual({ success: false, error: 'Invitation not found' });
  });

  it('deletes invitation on success', async () => {
    const deleteMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(projectInvitationQueries).mockReturnValue({
      findByProjectId: vi.fn().mockResolvedValue([
        { id: 'inv-1', email: 'test@example.com', status: 'pending' },
      ]),
      findByToken: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
      delete: deleteMock,
    } as any);

    const result = await cancelInvitation(PROJECT_ID, 'inv-1');
    expect(result).toEqual({ success: true });
    expect(deleteMock).toHaveBeenCalledWith('inv-1');
  });

  it('requires owner role', async () => {
    vi.mocked(projectInvitationQueries).mockReturnValue({
      findByProjectId: vi.fn().mockResolvedValue([{ id: 'inv-1' }]),
      findByToken: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
      delete: vi.fn(),
    } as any);

    await cancelInvitation(PROJECT_ID, 'inv-1');
    expect(mockRequireAccess).toHaveBeenCalledWith(PROJECT_ID, 'owner');
  });
});
