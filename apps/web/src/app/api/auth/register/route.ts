import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createDatabase, userQueries, projectInvitationQueries, projectMemberQueries } from '@anima-ai/database';
import { z } from 'zod';
import { createLogger } from '@anima-ai/shared';

const log = createLogger('api:register');

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  token: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const db = createDatabase();
    const users = userQueries(db);

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Validation failed' },
        { status: 400 },
      );
    }

    const { name, email, password, token } = parsed.data;

    // Check if registration is allowed:
    // 1. No users exist (initial admin setup), OR
    // 2. User has a valid invite token matching the email
    const userCount = await users.count();
    let invitation: Awaited<ReturnType<ReturnType<typeof projectInvitationQueries>['findByToken']>> = null;

    if (token) {
      invitation = await projectInvitationQueries(db).findByToken(token);
      if (!invitation || invitation.status !== 'pending' || new Date() > invitation.expiresAt) {
        invitation = null;
      }
      // Email must match the invitation
      if (invitation && invitation.email !== email) {
        return NextResponse.json(
          { error: `This invitation was sent to ${invitation.email}. Please register with that email address.` },
          { status: 403 },
        );
      }
    }

    if (userCount > 0 && !invitation && process.env.ALLOW_OPEN_REGISTRATION !== 'true') {
      return NextResponse.json({ error: 'Registration is disabled' }, { status: 403 });
    }

    const existing = await users.findByEmail(email);
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const newUser = await users.create({ email, name, passwordHash });

    // If registering via invite, auto-accept: create membership and consume the token
    if (invitation) {
      await projectMemberQueries(db).create({
        projectId: invitation.projectId,
        userId: newUser.id,
        role: invitation.role as 'editor' | 'viewer',
      });
      await projectInvitationQueries(db).updateStatus(invitation.id, 'accepted');
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    log.error('Registration error', { error: error instanceof Error ? error.message : error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
