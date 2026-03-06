import { Hono } from 'hono';
import type { AppEnv } from '../app.js';
import { rateLimiter } from '../middleware/rate-limiter.js';
import { validateSession } from '../middleware/session-auth.js';
import { createDatabase, feedbackConfigQueries, feedbackResponseQueries, analyticsQueries } from '@anima-ai/database';

export const feedbackSurveyRoutes = new Hono<AppEnv>();

feedbackSurveyRoutes.post('/', rateLimiter(), validateSession(), async (c) => {
  const projectId = c.get('projectId');
  const sessionId = c.get('sessionId');

  if (!projectId) {
    return c.json({ error: 'Invalid session' }, 400);
  }

  const body = await c.req.json<{
    ratings?: Array<{ ratingId: string; value: number }>;
    answers?: Array<{ questionId: string; value: string }>;
  }>();

  const db = createDatabase();

  // Load feedback config to validate submission
  const config = await feedbackConfigQueries(db).findByProjectId(projectId);
  if (!config || !config.enabled) {
    return c.json({ error: 'Feedback is not enabled for this project' }, 400);
  }

  // Validate ratings
  const configRatings = (config.ratings as Array<{ id: string; label: string; required: boolean }>) ?? [];
  const ratingMap = new Map((body.ratings ?? []).map((r) => [r.ratingId, r.value]));

  for (const r of body.ratings ?? []) {
    if (!Number.isInteger(r.value) || r.value < 1 || r.value > 5) {
      return c.json({ error: 'Rating values must be between 1 and 5' }, 400);
    }
  }

  for (const r of configRatings) {
    if (r.required) {
      const value = ratingMap.get(r.id);
      if (value == null) {
        return c.json({ error: `Rating for "${r.label}" is required` }, 400);
      }
    }
  }

  // Validate required questions
  const questions = (config.questions as Array<{ id: string; label: string; type: string; required: boolean }>) ?? [];
  const answerMap = new Map((body.answers ?? []).map((a) => [a.questionId, a.value]));

  for (const q of questions) {
    if (q.required) {
      const answer = answerMap.get(q.id);
      if (!answer || !answer.trim()) {
        return c.json({ error: `Answer to "${q.label}" is required` }, 400);
      }
    }
  }

  // Save response
  await feedbackResponseQueries(db).create({
    projectId,
    sessionId: sessionId ?? null,
    ratings: body.ratings ?? [],
    answers: body.answers ?? [],
  });

  // Log analytics event
  await analyticsQueries(db).logEvent({
    projectId,
    sessionId,
    eventType: 'feedback_survey_submitted',
    metadata: {
      ratingCount: body.ratings?.length ?? 0,
      questionCount: body.answers?.length ?? 0,
    },
  });

  return c.json({ success: true });
});
