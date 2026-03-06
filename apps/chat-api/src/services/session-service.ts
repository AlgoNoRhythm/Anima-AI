import { createDatabase, projectQueries, sessionQueries, analyticsQueries } from '@anima-ai/database';
import { SESSION_EXPIRY_HOURS } from '@anima-ai/shared';
import { createCacheClient, getCachedSession, setCachedSession } from '@anima-ai/cache';

const cache = createCacheClient();

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

  // Cache the session for fast validation
  const ttlSeconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
  await setCachedSession(cache, sessionToken, {
    sessionId: session.id,
    projectId: project.id,
    expiresAt: expiresAt.toISOString(),
  }, ttlSeconds);

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
  // Check cache first
  const cached = await getCachedSession<{ sessionId: string; projectId: string; expiresAt: string }>(cache, token);
  if (cached) {
    if (new Date(cached.expiresAt) > new Date()) {
      return { valid: true, sessionId: cached.sessionId, projectId: cached.projectId };
    }
    // Expired — remove from cache
    return { valid: false };
  }

  // Cache miss — query DB
  const db = createDatabase();
  const session = await sessionQueries(db).findByToken(token);

  if (!session) {
    return { valid: false };
  }

  if (new Date(session.expiresAt) < new Date()) {
    return { valid: false };
  }

  // Populate cache for future hits
  const ttlSeconds = Math.max(1, Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000));
  await setCachedSession(cache, token, {
    sessionId: session.id,
    projectId: session.projectId,
    expiresAt: new Date(session.expiresAt).toISOString(),
  }, ttlSeconds);

  return { valid: true, sessionId: session.id, projectId: session.projectId };
}
