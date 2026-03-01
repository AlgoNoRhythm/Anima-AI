import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { createApp } from '../app.js';
import { resetRateLimiter } from '../middleware/rate-limiter.js';
import { waitForDb, userQueries, projectQueries, sessionQueries } from '@anima-ai/database';

let pdfToken: string;
let pdfSlug: string;
let chatToken: string;
let chatSlug: string;
let bothToken: string;
let bothSlug: string;

const testId = Date.now();

beforeAll(async () => {
  const db = await waitForDb();

  const user = await userQueries(db).create({
    email: `mode-test-${testId}@test.com`,
    name: 'Mode Test',
    passwordHash: 'hash',
  });

  // Create project in pdf mode
  const pdfProject = await projectQueries(db).create({
    userId: user.id,
    name: 'PDF Only',
    slug: `pdf-only-${testId}`,
    mode: 'pdf',
  });
  pdfSlug = pdfProject.slug;
  const pdfSession = await sessionQueries(db).create({
    projectId: pdfProject.id,
    sessionToken: `pdf-mode-token-${testId}`,
    expiresAt: new Date(Date.now() + 86400000),
  });
  pdfToken = pdfSession.sessionToken;

  // Create project in chat mode
  const chatProject = await projectQueries(db).create({
    userId: user.id,
    name: 'Chat Only',
    slug: `chat-only-${testId}`,
    mode: 'chat',
  });
  chatSlug = chatProject.slug;
  const chatSession = await sessionQueries(db).create({
    projectId: chatProject.id,
    sessionToken: `chat-mode-token-${testId}`,
    expiresAt: new Date(Date.now() + 86400000),
  });
  chatToken = chatSession.sessionToken;

  // Create project in both mode
  const bothProject = await projectQueries(db).create({
    userId: user.id,
    name: 'Both Mode',
    slug: `both-mode-${testId}`,
    mode: 'both',
  });
  bothSlug = bothProject.slug;
  const bothSession = await sessionQueries(db).create({
    projectId: bothProject.id,
    sessionToken: `both-mode-token-${testId}`,
    expiresAt: new Date(Date.now() + 86400000),
  });
  bothToken = bothSession.sessionToken;
});

describe('Mode Enforcement in Chat API', () => {
  const app = createApp();

  beforeEach(() => {
    resetRateLimiter();
  });

  it('rejects chat for pdf-mode project with "document viewing only" error', async () => {
    const res = await app.request(`/api/chat/${pdfSlug}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': pdfToken,
      },
      body: JSON.stringify({ message: 'hello' }),
    });

    // The response should be an SSE stream that contains an error event
    expect(res.status).toBe(200); // SSE responses return 200
    const text = await res.text();
    expect(text).toContain('document viewing only');
  });

  it('allows chat for chat-mode project', async () => {
    const res = await app.request(`/api/chat/${chatSlug}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': chatToken,
      },
      body: JSON.stringify({ message: 'hello' }),
    });

    // Should not contain the pdf-only error
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain('document viewing only');
  });

  it('allows chat for both-mode project', async () => {
    const res = await app.request(`/api/chat/${bothSlug}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': bothToken,
      },
      body: JSON.stringify({ message: 'hello' }),
    });

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain('document viewing only');
  });
});
