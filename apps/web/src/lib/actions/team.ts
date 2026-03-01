'use server';

import { createDatabase, projectQueries, projectMemberQueries, projectInvitationQueries, userQueries } from '@anima-ai/database';
import { createLogger } from '@anima-ai/shared';
import { getUserId } from '../auth-helpers';
import { requireProjectAccess } from '../project-auth';
import { z } from 'zod';

const log = createLogger('action:team');

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['editor', 'viewer']),
});

export async function inviteMember(projectId: string, data: { email: string; role: string }) {
  try {
    const userId = await getUserId();
    const access = await requireProjectAccess(projectId, 'owner');
    if (access.error) {
      return { success: false, error: access.error };
    }

    const parsed = inviteSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' };
    }

    const db = createDatabase();

    // Check if user is already a member
    const existingUser = await userQueries(db).findByEmail(parsed.data.email);
    if (existingUser) {
      // Check if already owner
      if (access.project!.userId === existingUser.id) {
        return { success: false, error: 'This user is already the project owner' };
      }
      // Check if already a member
      const existingMember = await projectMemberQueries(db).findMembership(projectId, existingUser.id);
      if (existingMember) {
        return { success: false, error: 'This user is already a member of this project' };
      }
    }

    // Check for existing pending invitation
    const existingInvitations = await projectInvitationQueries(db).findByProjectId(projectId);
    const pendingForEmail = existingInvitations.find(
      (inv) => inv.email === parsed.data.email && inv.status === 'pending',
    );
    if (pendingForEmail) {
      return { success: false, error: 'An invitation has already been sent to this email' };
    }

    // Create invitation with 7-day expiry
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await projectInvitationQueries(db).create({
      projectId,
      email: parsed.data.email,
      role: parsed.data.role as 'editor' | 'viewer',
      token,
      invitedBy: userId,
      expiresAt,
    });

    return { success: true, token };
  } catch (error) {
    log.error('inviteMember error', { error: error instanceof Error ? error.message : error });
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function acceptInvitation(token: string) {
  try {
    const userId = await getUserId();
    const db = createDatabase();

    const invitation = await projectInvitationQueries(db).findByToken(token);
    if (!invitation) {
      return { success: false, error: 'Invitation not found' };
    }

    if (invitation.status !== 'pending') {
      return { success: false, error: 'This invitation has already been used or expired' };
    }

    if (new Date() > invitation.expiresAt) {
      await projectInvitationQueries(db).updateStatus(invitation.id, 'expired');
      return { success: false, error: 'This invitation has expired' };
    }

    // Check if already a member
    const existingMember = await projectMemberQueries(db).findMembership(invitation.projectId, userId);
    if (existingMember) {
      await projectInvitationQueries(db).updateStatus(invitation.id, 'accepted');
      return { success: true, projectId: invitation.projectId };
    }

    // Check if user is already the owner
    const project = await projectQueries(db).findById(invitation.projectId);
    if (project && project.userId === userId) {
      await projectInvitationQueries(db).updateStatus(invitation.id, 'accepted');
      return { success: true, projectId: invitation.projectId };
    }

    // Create membership
    await projectMemberQueries(db).create({
      projectId: invitation.projectId,
      userId,
      role: invitation.role as 'editor' | 'viewer',
    });

    // Mark invitation as accepted
    await projectInvitationQueries(db).updateStatus(invitation.id, 'accepted');

    return { success: true, projectId: invitation.projectId };
  } catch (error) {
    log.error('acceptInvitation error', { error: error instanceof Error ? error.message : error });
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function removeMember(projectId: string, memberUserId: string) {
  try {
    const access = await requireProjectAccess(projectId, 'owner');
    if (access.error) {
      return { success: false, error: access.error };
    }

    const db = createDatabase();
    await projectMemberQueries(db).delete(projectId, memberUserId);

    return { success: true };
  } catch (error) {
    log.error('removeMember error', { error: error instanceof Error ? error.message : error });
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function updateMemberRole(projectId: string, memberUserId: string, role: string) {
  try {
    const access = await requireProjectAccess(projectId, 'owner');
    if (access.error) {
      return { success: false, error: access.error };
    }

    if (role !== 'editor' && role !== 'viewer') {
      return { success: false, error: 'Invalid role' };
    }

    const db = createDatabase();
    await projectMemberQueries(db).updateRole(projectId, memberUserId, role);

    return { success: true };
  } catch (error) {
    log.error('updateMemberRole error', { error: error instanceof Error ? error.message : error });
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function cancelInvitation(projectId: string, invitationId: string) {
  try {
    const access = await requireProjectAccess(projectId, 'owner');
    if (access.error) {
      return { success: false, error: access.error };
    }

    const db = createDatabase();

    // Verify the invitation belongs to this project
    const invitations = await projectInvitationQueries(db).findByProjectId(projectId);
    const invitation = invitations.find((inv) => inv.id === invitationId);
    if (!invitation) {
      return { success: false, error: 'Invitation not found' };
    }

    await projectInvitationQueries(db).delete(invitationId);

    return { success: true };
  } catch (error) {
    log.error('cancelInvitation error', { error: error instanceof Error ? error.message : error });
    return { success: false, error: 'An unexpected error occurred' };
  }
}
