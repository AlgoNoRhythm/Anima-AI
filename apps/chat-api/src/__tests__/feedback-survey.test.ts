import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { createApp } from '../app.js';
import { resetRateLimiter } from '../middleware/rate-limiter.js';
import {
  waitForDb,
  userQueries,
  projectQueries,
  sessionQueries,
  feedbackConfigQueries,
  feedbackResponseQueries,
} from '@anima-ai/database';

let validToken: string;
let projectId: string;
let projectSlug: string;
let sessionId: string;

const testId = Date.now();

beforeAll(async () => {
  const db = await waitForDb();

  const user = await userQueries(db).create({
    email: `fb-survey-test-${testId}@test.com`,
    name: 'FBSurveyTest',
    passwordHash: 'hash',
  });
  const project = await projectQueries(db).create({
    userId: user.id,
    name: 'FB Survey Project',
    slug: `fb-survey-project-${testId}`,
  });
  projectId = project.id;
  projectSlug = project.slug;

  const session = await sessionQueries(db).create({
    projectId: project.id,
    sessionToken: `fb-survey-token-${testId}`,
    expiresAt: new Date(Date.now() + 86400000),
  });
  validToken = session.sessionToken;
  sessionId = session.id;

  // Enable feedback config with one required rating and one required question
  await feedbackConfigQueries(db).upsert(projectId, {
    enabled: true,
    ratings: [
      { id: 'r1', label: 'Rate us', required: true },
    ],
    questions: [
      { id: 'q1', label: 'What did you like?', type: 'text', required: true },
      { id: 'q2', label: 'Optional feedback', type: 'text', required: false },
    ],
    submitButtonLabel: 'Submit',
    thankYouMessage: 'Thanks!',
  });
});

describe('Feedback Survey API', () => {
  const app = createApp();

  beforeEach(() => {
    resetRateLimiter();
  });

  it('requires session token', async () => {
    const res = await app.request('/api/feedback-survey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ratings: [{ ratingId: 'r1', value: 5 }] }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects invalid session token', async () => {
    const res = await app.request('/api/feedback-survey', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': 'invalid-token-xyz',
      },
      body: JSON.stringify({ ratings: [{ ratingId: 'r1', value: 5 }] }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects when required rating is missing', async () => {
    const res = await app.request('/api/feedback-survey', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': validToken,
      },
      body: JSON.stringify({
        answers: [{ questionId: 'q1', value: 'Great' }],
      }),
    });
    expect(res.status).toBe(400);
    const data = await res.json() as Record<string, unknown>;
    expect(data.error).toContain('Rate us');
  });

  it('rejects rating value out of range', async () => {
    const res = await app.request('/api/feedback-survey', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': validToken,
      },
      body: JSON.stringify({
        ratings: [{ ratingId: 'r1', value: 6 }],
        answers: [{ questionId: 'q1', value: 'Great' }],
      }),
    });
    expect(res.status).toBe(400);
    const data = await res.json() as Record<string, unknown>;
    expect(data.error).toContain('between 1 and 5');
  });

  it('rejects rating value of 0', async () => {
    const res = await app.request('/api/feedback-survey', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': validToken,
      },
      body: JSON.stringify({
        ratings: [{ ratingId: 'r1', value: 0 }],
        answers: [{ questionId: 'q1', value: 'Great' }],
      }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects when required question is missing', async () => {
    const res = await app.request('/api/feedback-survey', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': validToken,
      },
      body: JSON.stringify({
        ratings: [{ ratingId: 'r1', value: 4 }],
        answers: [],
      }),
    });
    expect(res.status).toBe(400);
    const data = await res.json() as Record<string, unknown>;
    expect(data.error).toContain('What did you like?');
  });

  it('accepts valid submission', async () => {
    const res = await app.request('/api/feedback-survey', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': validToken,
      },
      body: JSON.stringify({
        ratings: [{ ratingId: 'r1', value: 5 }],
        answers: [
          { questionId: 'q1', value: 'Everything!' },
          { questionId: 'q2', value: 'Keep it up' },
        ],
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as Record<string, unknown>;
    expect(data.success).toBe(true);
  });

  it('accepts submission with only required fields', async () => {
    const res = await app.request('/api/feedback-survey', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': validToken,
      },
      body: JSON.stringify({
        ratings: [{ ratingId: 'r1', value: 3 }],
        answers: [{ questionId: 'q1', value: 'Decent' }],
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as Record<string, unknown>;
    expect(data.success).toBe(true);
  });

  it('saves response to database', async () => {
    const db = await waitForDb();
    const count = await feedbackResponseQueries(db).countByProjectId(projectId);
    // We submitted 2 valid responses above
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it('rejects when feedback is disabled', async () => {
    const db = await waitForDb();

    // Create a separate project with feedback disabled
    const user = await userQueries(db).create({
      email: `fb-disabled-${testId}@test.com`,
      name: 'Disabled',
      passwordHash: 'hash',
    });
    const project = await projectQueries(db).create({
      userId: user.id,
      name: 'Disabled FB',
      slug: `fb-disabled-${testId}`,
    });
    const session = await sessionQueries(db).create({
      projectId: project.id,
      sessionToken: `fb-disabled-token-${testId}`,
      expiresAt: new Date(Date.now() + 86400000),
    });

    // Feedback config with enabled=false
    await feedbackConfigQueries(db).upsert(project.id, { enabled: false });

    const res = await app.request('/api/feedback-survey', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': session.sessionToken,
      },
      body: JSON.stringify({ ratings: [{ ratingId: 'r1', value: 5 }] }),
    });
    expect(res.status).toBe(400);
    const data = await res.json() as Record<string, unknown>;
    expect(data.error).toContain('not enabled');
  });
});
