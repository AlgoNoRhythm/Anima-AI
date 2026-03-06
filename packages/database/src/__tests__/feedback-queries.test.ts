import { describe, it, expect, beforeAll } from 'vitest';
import { waitForDb } from '../client';
import { userQueries } from '../queries/users';
import { projectQueries } from '../queries/projects';
import { sessionQueries } from '../queries/sessions';
import { feedbackConfigQueries } from '../queries/feedback-configs';
import { feedbackResponseQueries } from '../queries/feedback-responses';
import { themeQueries } from '../queries/themes';
import type { Database } from '../client';

let db: Database;

beforeAll(async () => {
  db = await waitForDb();
});

describe('feedbackConfigQueries', () => {
  const q = () => feedbackConfigQueries(db);
  let projectId: string;

  beforeAll(async () => {
    const user = await userQueries(db).create({ email: 'fb-cfg-owner@example.com', name: 'FbCfgOwner', passwordHash: 'h' });
    const project = await projectQueries(db).create({ userId: user.id, name: 'FbCfgProject', slug: 'fb-cfg-project' });
    projectId = project.id;
  });

  it('returns null when no config exists', async () => {
    const found = await q().findByProjectId(projectId);
    expect(found).toBeNull();
  });

  it('upserts a feedback config (insert)', async () => {
    const config = await q().upsert(projectId, {
      enabled: true,
      ratings: [{ id: 'r1', label: 'Rate us!', required: true }],
      questions: [{ id: 'q1', label: 'What did you like?', type: 'text', required: false }],
      submitButtonLabel: 'Send',
      thankYouMessage: 'Thanks!',
    });
    expect(config.enabled).toBe(true);
    expect(config.ratings).toEqual([{ id: 'r1', label: 'Rate us!', required: true }]);
    expect(config.submitButtonLabel).toBe('Send');
    expect(config.thankYouMessage).toBe('Thanks!');
    expect(config.projectId).toBe(projectId);
  });

  it('upserts a feedback config (update)', async () => {
    const config = await q().upsert(projectId, {
      enabled: false,
      ratings: [{ id: 'r1', label: 'Updated label', required: false }],
    });
    expect(config.enabled).toBe(false);
    expect(config.ratings).toEqual([{ id: 'r1', label: 'Updated label', required: false }]);
  });

  it('findByProjectId returns the config', async () => {
    const found = await q().findByProjectId(projectId);
    expect(found).not.toBeNull();
    expect(found!.projectId).toBe(projectId);
    expect(found!.ratings).toEqual([{ id: 'r1', label: 'Updated label', required: false }]);
  });
});

describe('feedbackResponseQueries', () => {
  const q = () => feedbackResponseQueries(db);
  let projectId: string;
  let sessionId: string;

  beforeAll(async () => {
    const user = await userQueries(db).create({ email: 'fb-resp-owner@example.com', name: 'FbRespOwner', passwordHash: 'h' });
    const project = await projectQueries(db).create({ userId: user.id, name: 'FbRespProject', slug: 'fb-resp-project' });
    projectId = project.id;

    const session = await sessionQueries(db).create({
      projectId,
      sessionToken: 'fb-resp-session-' + Date.now(),
      expiresAt: new Date(Date.now() + 86400000),
    });
    sessionId = session.id;
  });

  it('creates a feedback response', async () => {
    const response = await q().create({
      projectId,
      sessionId,
      ratings: [{ ratingId: 'r1', value: 4 }],
      answers: [{ questionId: 'q1', value: 'Great service' }],
    });
    expect(response.id).toBeDefined();
    expect(response.ratings).toEqual([{ ratingId: 'r1', value: 4 }]);
    expect(response.projectId).toBe(projectId);
  });

  it('creates a response without session', async () => {
    const response = await q().create({
      projectId,
      ratings: [{ ratingId: 'r1', value: 5 }],
      answers: [],
    });
    expect(response.id).toBeDefined();
    expect(response.ratings).toEqual([{ ratingId: 'r1', value: 5 }]);
  });

  it('counts responses by project', async () => {
    const count = await q().countByProjectId(projectId);
    expect(count).toBe(2);
  });

  it('calculates average star rating from first rating', async () => {
    const avg = await q().averageStarRating(projectId);
    expect(avg).not.toBeNull();
    // (4 + 5) / 2 = 4.5
    expect(avg).toBe(4.5);
  });

  it('returns null average when no responses exist', async () => {
    // Use a fresh project with no responses
    const user = await userQueries(db).create({ email: 'fb-empty@example.com', name: 'Empty', passwordHash: 'h' });
    const project = await projectQueries(db).create({ userId: user.id, name: 'EmptyFb', slug: 'empty-fb' });
    const avg = await q().averageStarRating(project.id);
    expect(avg).toBeNull();
  });

  it('finds responses by project (paginated)', async () => {
    const responses = await q().findByProjectId(projectId);
    expect(responses.length).toBe(2);

    // With limit
    const limited = await q().findByProjectId(projectId, 1, 0);
    expect(limited.length).toBe(1);
  });
});

describe('feedbackResponseQueries (new analytics methods)', () => {
  const q = () => feedbackResponseQueries(db);
  let projectId: string;

  beforeAll(async () => {
    const user = await userQueries(db).create({
      email: `fb-analytics-${Date.now()}@example.com`,
      name: 'FbAnalytics',
      passwordHash: 'h',
    });
    const project = await projectQueries(db).create({
      userId: user.id,
      name: 'FbAnalyticsProject',
      slug: `fb-analytics-${Date.now()}`,
    });
    projectId = project.id;

    // Create responses with multiple ratings
    await q().create({
      projectId,
      ratings: [
        { ratingId: 'experience', value: 5 },
        { ratingId: 'quality', value: 3 },
      ],
      answers: [{ questionId: 'improve', value: 'Nothing, it was great!' }],
    });
    await q().create({
      projectId,
      ratings: [
        { ratingId: 'experience', value: 4 },
        { ratingId: 'quality', value: 4 },
      ],
      answers: [{ questionId: 'improve', value: 'Faster responses would be nice.' }],
    });
    await q().create({
      projectId,
      ratings: [
        { ratingId: 'experience', value: 5 },
        { ratingId: 'quality', value: 2 },
      ],
      answers: [],
    });
  });

  it('countByProjectId with since filter', async () => {
    const total = await q().countByProjectId(projectId);
    expect(total).toBe(3);

    // Future date should yield 0
    const future = new Date(Date.now() + 86400000);
    const futureCount = await q().countByProjectId(projectId, future);
    expect(futureCount).toBe(0);

    // Past date should yield all
    const past = new Date(Date.now() - 86400000);
    const pastCount = await q().countByProjectId(projectId, past);
    expect(pastCount).toBe(3);
  });

  it('findByProjectId with since filter', async () => {
    const all = await q().findByProjectId(projectId, 50, 0);
    expect(all.length).toBe(3);

    // Future date should yield 0
    const future = new Date(Date.now() + 86400000);
    const none = await q().findByProjectId(projectId, 50, 0, future);
    expect(none.length).toBe(0);

    // Past date should yield all
    const past = new Date(Date.now() - 86400000);
    const pastResults = await q().findByProjectId(projectId, 50, 0, past);
    expect(pastResults.length).toBe(3);
  });

  it('ratingDistribution returns counts per star value', async () => {
    const dist = await q().ratingDistribution(projectId, 'experience');
    // experience: 5, 4, 5 → value 4: 1, value 5: 2
    expect(dist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 4, count: 1 }),
        expect.objectContaining({ value: 5, count: 2 }),
      ]),
    );
    // Should not have entries for values with 0 count
    const values = dist.map((d) => d.value);
    expect(values).not.toContain(1);
    expect(values).not.toContain(2);
    expect(values).not.toContain(3);
  });

  it('ratingDistribution for different ratingId', async () => {
    const dist = await q().ratingDistribution(projectId, 'quality');
    // quality: 3, 4, 2 → value 2: 1, value 3: 1, value 4: 1
    expect(dist.length).toBe(3);
    expect(dist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 2, count: 1 }),
        expect.objectContaining({ value: 3, count: 1 }),
        expect.objectContaining({ value: 4, count: 1 }),
      ]),
    );
  });

  it('ratingDistribution with since filter', async () => {
    // Future date should yield empty
    const future = new Date(Date.now() + 86400000);
    const dist = await q().ratingDistribution(projectId, 'experience', future);
    expect(dist.length).toBe(0);
  });

  it('ratingDistribution for nonexistent ratingId returns empty', async () => {
    const dist = await q().ratingDistribution(projectId, 'nonexistent');
    expect(dist.length).toBe(0);
  });

  it('averageRatingById returns correct average', async () => {
    // experience: (5 + 4 + 5) / 3 = 4.67
    const avg = await q().averageRatingById(projectId, 'experience');
    expect(avg).not.toBeNull();
    expect(avg).toBeCloseTo(4.67, 1);
  });

  it('averageRatingById for quality rating', async () => {
    // quality: (3 + 4 + 2) / 3 = 3.0
    const avg = await q().averageRatingById(projectId, 'quality');
    expect(avg).not.toBeNull();
    expect(avg).toBeCloseTo(3.0, 1);
  });

  it('averageRatingById with since filter', async () => {
    const future = new Date(Date.now() + 86400000);
    const avg = await q().averageRatingById(projectId, 'experience', future);
    expect(avg).toBeNull();
  });

  it('averageRatingById for nonexistent ratingId returns null', async () => {
    const avg = await q().averageRatingById(projectId, 'nonexistent');
    expect(avg).toBeNull();
  });

  it('dailyRatingAverages returns daily aggregates', async () => {
    const daily = await q().dailyRatingAverages(projectId, 'experience', 30);
    expect(daily.length).toBeGreaterThanOrEqual(1);
    // All 3 responses created today
    const today = daily[daily.length - 1]!;
    expect(today.count).toBe(3);
    expect(today.avg).toBeCloseTo(4.67, 1);
    expect(today.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('dailyRatingAverages with 0 days returns empty', async () => {
    const daily = await q().dailyRatingAverages(projectId, 'experience', 0);
    // 0-day window should exclude everything
    expect(daily.length).toBe(0);
  });

  it('dailyRatingAverages for nonexistent ratingId returns empty', async () => {
    const daily = await q().dailyRatingAverages(projectId, 'nonexistent', 30);
    expect(daily.length).toBe(0);
  });
});

describe('themeQueries suggestedQuestions', () => {
  const q = () => themeQueries(db);
  let projectId: string;

  beforeAll(async () => {
    const user = await userQueries(db).create({ email: 'theme-sq-owner@example.com', name: 'ThemeSQ', passwordHash: 'h' });
    const project = await projectQueries(db).create({ userId: user.id, name: 'ThemeSQProject', slug: 'theme-sq-project' });
    projectId = project.id;
  });

  it('stores and retrieves suggestedQuestions', async () => {
    const theme = await q().upsert(projectId, {
      suggestedQuestions: ['What is this?', 'How does it work?'],
    });
    expect(theme.suggestedQuestions).toEqual(['What is this?', 'How does it work?']);
  });

  it('updates suggestedQuestions', async () => {
    const theme = await q().upsert(projectId, {
      suggestedQuestions: ['New question'],
    });
    expect(theme.suggestedQuestions).toEqual(['New question']);
  });

  it('defaults to empty array', async () => {
    const user = await userQueries(db).create({ email: 'theme-sq-default@example.com', name: 'Default', passwordHash: 'h' });
    const project = await projectQueries(db).create({ userId: user.id, name: 'DefaultSQ', slug: 'default-sq' });
    const theme = await q().upsert(project.id, { primaryColor: '#000' });
    expect(theme.suggestedQuestions).toEqual([]);
  });
});
