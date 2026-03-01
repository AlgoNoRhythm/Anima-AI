import { describe, it, expect, beforeAll } from 'vitest';
import { waitForDb } from '../client';
import { userQueries } from '../queries/users';
import { projectQueries } from '../queries/projects';
import { projectMemberQueries } from '../queries/project-members';
import { projectInvitationQueries } from '../queries/project-invitations';
import { migrate } from '../migrate';
import type { Database } from '../client';

let db: Database;
let ownerUserId: string;
let editorUserId: string;
let viewerUserId: string;
let projectId: string;

beforeAll(async () => {
  db = await waitForDb();
  await migrate(db);

  const owner = await userQueries(db).create({ email: 'team-owner@example.com', name: 'Owner', passwordHash: 'h' });
  const editor = await userQueries(db).create({ email: 'team-editor@example.com', name: 'Editor', passwordHash: 'h' });
  const viewer = await userQueries(db).create({ email: 'team-viewer@example.com', name: 'Viewer', passwordHash: 'h' });
  ownerUserId = owner.id;
  editorUserId = editor.id;
  viewerUserId = viewer.id;

  const project = await projectQueries(db).create({
    userId: ownerUserId,
    name: 'Team Test Project',
    slug: 'team-test-project',
  });
  projectId = project.id;
});

describe('projectMemberQueries', () => {
  const q = () => projectMemberQueries(db);

  it('creates a membership', async () => {
    const member = await q().create({ projectId, userId: editorUserId, role: 'editor' });
    expect(member.projectId).toBe(projectId);
    expect(member.userId).toBe(editorUserId);
    expect(member.role).toBe('editor');
  });

  it('creates a viewer membership', async () => {
    const member = await q().create({ projectId, userId: viewerUserId, role: 'viewer' });
    expect(member.role).toBe('viewer');
  });

  it('finds members by project id', async () => {
    const members = await q().findByProjectId(projectId);
    expect(members.length).toBe(2);
    const roles = members.map((m) => m.role).sort();
    expect(roles).toEqual(['editor', 'viewer']);
  });

  it('finds memberships by user id', async () => {
    const memberships = await q().findByUserId(editorUserId);
    expect(memberships.length).toBe(1);
    expect(memberships[0]!.projectId).toBe(projectId);
  });

  it('finds a specific membership', async () => {
    const found = await q().findMembership(projectId, editorUserId);
    expect(found).not.toBeNull();
    expect(found!.role).toBe('editor');
  });

  it('returns null for non-existent membership', async () => {
    const found = await q().findMembership(projectId, ownerUserId);
    expect(found).toBeNull();
  });

  it('updates a role', async () => {
    const updated = await q().updateRole(projectId, viewerUserId, 'editor');
    expect(updated).not.toBeNull();
    expect(updated!.role).toBe('editor');

    // Revert for later tests
    await q().updateRole(projectId, viewerUserId, 'viewer');
  });

  it('deletes a membership', async () => {
    // Create a temporary member to delete
    const tempUser = await userQueries(db).create({ email: 'temp-member@example.com', name: 'Temp', passwordHash: 'h' });
    await q().create({ projectId, userId: tempUser.id, role: 'viewer' });

    await q().delete(projectId, tempUser.id);
    const found = await q().findMembership(projectId, tempUser.id);
    expect(found).toBeNull();
  });

  it('enforces unique constraint on project_id + user_id', async () => {
    await expect(
      q().create({ projectId, userId: editorUserId, role: 'viewer' }),
    ).rejects.toThrow();
  });
});

describe('projectInvitationQueries', () => {
  const q = () => projectInvitationQueries(db);
  const testToken = `invite-token-${Date.now()}`;

  it('creates an invitation', async () => {
    const invitation = await q().create({
      projectId,
      email: 'invitee@example.com',
      role: 'editor',
      token: testToken,
      invitedBy: ownerUserId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    expect(invitation.projectId).toBe(projectId);
    expect(invitation.email).toBe('invitee@example.com');
    expect(invitation.status).toBe('pending');
  });

  it('finds invitation by token', async () => {
    const found = await q().findByToken(testToken);
    expect(found).not.toBeNull();
    expect(found!.email).toBe('invitee@example.com');
    expect(found!.role).toBe('editor');
  });

  it('returns null for non-existent token', async () => {
    const found = await q().findByToken('nonexistent-token');
    expect(found).toBeNull();
  });

  it('finds invitations by project id', async () => {
    const invitations = await q().findByProjectId(projectId);
    expect(invitations.length).toBeGreaterThanOrEqual(1);
  });

  it('updates invitation status', async () => {
    const found = await q().findByToken(testToken);
    const updated = await q().updateStatus(found!.id, 'accepted');
    expect(updated!.status).toBe('accepted');
  });

  it('deletes an invitation', async () => {
    const invitation = await q().create({
      projectId,
      email: 'delete-me@example.com',
      role: 'viewer',
      token: `delete-token-${Date.now()}`,
      invitedBy: ownerUserId,
      expiresAt: new Date(Date.now() + 86400000),
    });

    await q().delete(invitation.id);
    const found = await q().findByToken(invitation.token);
    expect(found).toBeNull();
  });

  it('enforces unique constraint on token', async () => {
    const token = `unique-token-${Date.now()}`;
    await q().create({
      projectId,
      email: 'first@example.com',
      role: 'editor',
      token,
      invitedBy: ownerUserId,
      expiresAt: new Date(Date.now() + 86400000),
    });

    await expect(
      q().create({
        projectId,
        email: 'second@example.com',
        role: 'viewer',
        token, // same token
        invitedBy: ownerUserId,
        expiresAt: new Date(Date.now() + 86400000),
      }),
    ).rejects.toThrow();
  });
});

describe('projectQueries.findByIdAndMember', () => {
  const q = () => projectQueries(db);

  it('returns project + owner role when user is the project owner', async () => {
    const result = await q().findByIdAndMember(projectId, ownerUserId);
    expect(result).not.toBeNull();
    expect(result!.role).toBe('owner');
    expect(result!.project.id).toBe(projectId);
  });

  it('returns project + member role for an editor member', async () => {
    const result = await q().findByIdAndMember(projectId, editorUserId);
    expect(result).not.toBeNull();
    expect(result!.role).toBe('editor');
    expect(result!.project.id).toBe(projectId);
  });

  it('returns project + member role for a viewer member', async () => {
    const result = await q().findByIdAndMember(projectId, viewerUserId);
    expect(result).not.toBeNull();
    expect(result!.role).toBe('viewer');
  });

  it('returns null for a non-member', async () => {
    const stranger = await userQueries(db).create({ email: 'stranger@example.com', name: 'Stranger', passwordHash: 'h' });
    const result = await q().findByIdAndMember(projectId, stranger.id);
    expect(result).toBeNull();
  });

  it('returns null for non-existent project', async () => {
    const result = await q().findByIdAndMember('00000000-0000-0000-0000-000000000000', ownerUserId);
    expect(result).toBeNull();
  });
});

describe('projectQueries.findByUserId includes member projects', () => {
  const q = () => projectQueries(db);

  it('includes projects where user is a member', async () => {
    const projects = await q().findByUserId(editorUserId);
    const projectIds = projects.map((p) => p.id);
    expect(projectIds).toContain(projectId);
  });

  it('includes projects where user is the owner', async () => {
    const projects = await q().findByUserId(ownerUserId);
    const projectIds = projects.map((p) => p.id);
    expect(projectIds).toContain(projectId);
  });
});
