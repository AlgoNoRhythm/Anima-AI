import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { createApp } from '../app.js';
import { resetRateLimiter } from '../middleware/rate-limiter.js';
import { waitForDb, userQueries, projectQueries, sessionQueries } from '@anima-ai/database';

let validToken: string;
let projectSlug: string;

const testId = Date.now();

beforeAll(async () => {
  const db = await waitForDb();

  // Seed test data with unique identifiers
  const user = await userQueries(db).create({ email: `chat-test-${testId}@test.com`, name: 'Test', passwordHash: 'hash' });
  const project = await projectQueries(db).create({ userId: user.id, name: 'Test Project', slug: `test-project-${testId}` });
  projectSlug = project.slug;

  const session = await sessionQueries(db).create({
    projectId: project.id,
    sessionToken: `valid-test-token-${testId}`,
    expiresAt: new Date(Date.now() + 86400000),
  });
  validToken = session.sessionToken;
});

describe('Chat API', () => {
  const app = createApp();

  beforeEach(() => {
    resetRateLimiter();
  });

  it('returns health check', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const data = await res.json() as Record<string, unknown>;
    expect(data.status).toBe('ok');
    expect(data.service).toBe('chat-api');
  });

  it('returns 404 for unknown routes', async () => {
    const res = await app.request('/unknown');
    expect(res.status).toBe(404);
  });

  it('requires session token for chat', async () => {
    const res = await app.request(`/api/chat/${projectSlug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hello' }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects empty messages', async () => {
    const res = await app.request(`/api/chat/${projectSlug}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': validToken,
      },
      body: JSON.stringify({ message: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects invalid session tokens', async () => {
    const res = await app.request(`/api/chat/${projectSlug}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': 'invalid-token',
      },
      body: JSON.stringify({ message: 'hello' }),
    });
    expect(res.status).toBe(401);
  });
});

describe('Session API', () => {
  const app = createApp();

  it('creates a new session', async () => {
    const res = await app.request(`/api/session/${projectSlug}`, {
      method: 'POST',
    });
    expect(res.status).toBe(201);
    const data = await res.json() as Record<string, unknown>;
    expect(data.sessionToken).toBeDefined();
    expect(data.projectSlug).toBe(projectSlug);
  });

  it('returns 404 for non-existent project', async () => {
    const res = await app.request('/api/session/non-existent-project', {
      method: 'POST',
    });
    expect(res.status).toBe(404);
  });
});

describe('Feedback API', () => {
  const app = createApp();

  it('requires session token', async () => {
    const res = await app.request('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: 'msg-1', feedback: 'positive' }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects invalid feedback', async () => {
    const res = await app.request('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': validToken,
      },
      body: JSON.stringify({ messageId: 'msg-1', feedback: 'invalid' }),
    });
    expect(res.status).toBe(400);
  });
});
