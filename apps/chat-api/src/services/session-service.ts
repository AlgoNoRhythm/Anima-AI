import { createDatabase, projectQueries, sessionQueries, analyticsQueries } from '@anima-ai/database';
import { SESSION_EXPIRY_HOURS } from '@anima-ai/shared';

export interface CreateSessionResult {
  sessionToken: string;
  sessionId: string;
  projectId: string;
  expiresAt: Date;
}

export async function createSession(
  projectSlug: string,
  ipHash: string | null,
  userAgent: string | null,
): Promise<CreateSessionResult> {
  const db = createDatabase();

  // Validate project exists
  const project = await projectQueries(db).findBySlug(projectSlug);
  if (!project) {
    throw new Error('Project not found');
  }

  // Create session
  const sessionToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

  const session = await sessionQueries(db).create({
    projectId: project.id,
    sessionToken,
    ipHash,
    userAgent,
    expiresAt,
  });

  // Log analytics
  await analyticsQueries(db).logEvent({
    projectId: project.id,
    sessionId: session.id,
    eventType: 'session_start',
  });

  return {
    sessionToken,
    sessionId: session.id,
    projectId: project.id,
    expiresAt,
  };
}

export async function validateSessionToken(token: string): Promise<{ valid: boolean; sessionId?: string; projectId?: string }> {
  const db = createDatabase();
  const session = await sessionQueries(db).findByToken(token);

  if (!session) {
    return { valid: false };
  }

  if (new Date(session.expiresAt) < new Date()) {
    return { valid: false };
  }

  return { valid: true, sessionId: session.id, projectId: session.projectId };
}
