import { describe, it, expect, beforeAll } from 'vitest';
import { waitForDb } from '../client';
import { userQueries } from '../queries/users';
import { projectQueries } from '../queries/projects';
import { documentQueries } from '../queries/documents';
import { personalityQueries } from '../queries/personalities';
import { themeQueries } from '../queries/themes';
import { sessionQueries } from '../queries/sessions';
import { messageQueries } from '../queries/messages';
import { analyticsQueries } from '../queries/analytics';
import { apiKeyQueries } from '../queries/api-keys';
import { chunkQueries } from '../queries/chunks';
import type { Database } from '../client';

let db: Database;

beforeAll(async () => {
  db = await waitForDb();
});

describe('userQueries', () => {
  const q = () => userQueries(db);

  it('creates and finds a user by email', async () => {
    const user = await q().create({ email: 'test@example.com', name: 'Test User', passwordHash: 'hash123' });
    expect(user.id).toBeDefined();
    expect(user.email).toBe('test@example.com');

    const found = await q().findByEmail('test@example.com');
    expect(found).not.toBeNull();
    expect(found!.id).toBe(user.id);
  });

  it('finds a user by id', async () => {
    const user = await q().create({ email: 'byid@example.com', name: 'ById', passwordHash: 'hash' });
    const found = await q().findById(user.id);
    expect(found).not.toBeNull();
    expect(found!.email).toBe('byid@example.com');
  });

  it('returns null for non-existent user', async () => {
    const found = await q().findByEmail('nonexistent@example.com');
    expect(found).toBeNull();
  });

  it('counts users', async () => {
    const count = await q().count();
    expect(count).toBeGreaterThanOrEqual(2);
  });
});

describe('projectQueries', () => {
  const q = () => projectQueries(db);
  let userId: string;

  beforeAll(async () => {
    const user = await userQueries(db).create({ email: 'proj-owner@example.com', name: 'Owner', passwordHash: 'h' });
    userId = user.id;
  });

  it('creates and finds a project', async () => {
    const project = await q().create({ userId, name: 'My Project', slug: 'my-project', mode: 'both' });
    expect(project.slug).toBe('my-project');

    const found = await q().findBySlug('my-project');
    expect(found).not.toBeNull();
    expect(found!.id).toBe(project.id);
  });

  it('finds projects by user id', async () => {
    const projects = await q().findByUserId(userId);
    expect(projects.length).toBeGreaterThanOrEqual(1);
  });

  it('updates a project', async () => {
    const project = await q().create({ userId, name: 'Updatable', slug: 'updatable' });
    const updated = await q().update(project.id, { name: 'Updated Name' });
    expect(updated!.name).toBe('Updated Name');
  });

  it('deletes a project', async () => {
    const project = await q().create({ userId, name: 'Deletable', slug: 'deletable' });
    await q().delete(project.id);
    const found = await q().findById(project.id);
    expect(found).toBeNull();
  });

  it('counts projects', async () => {
    const count = await q().count(userId);
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

describe('documentQueries', () => {
  const q = () => documentQueries(db);
  let projectId: string;

  beforeAll(async () => {
    const user = await userQueries(db).create({ email: 'doc-owner@example.com', name: 'DocOwner', passwordHash: 'h' });
    const project = await projectQueries(db).create({ userId: user.id, name: 'DocProject', slug: 'doc-project' });
    projectId = project.id;
  });

  it('creates and finds a document', async () => {
    const doc = await q().create({ projectId, filename: 'test.pdf', storageUrl: '/docs/test.pdf', fileSize: 1024 });
    expect(doc.status).toBe('pending');

    const found = await q().findById(doc.id);
    expect(found).not.toBeNull();
    expect(found!.filename).toBe('test.pdf');
  });

  it('updates document status', async () => {
    const doc = await q().create({ projectId, filename: 'status.pdf', storageUrl: '/docs/s.pdf', fileSize: 512 });
    const updated = await q().updateStatus(doc.id, 'completed');
    expect(updated!.status).toBe('completed');
  });

  it('lists documents by project', async () => {
    const docs = await q().findByProjectId(projectId);
    expect(docs.length).toBeGreaterThanOrEqual(2);
  });
});

describe('personalityQueries', () => {
  const q = () => personalityQueries(db);
  let projectId: string;

  beforeAll(async () => {
    const user = await userQueries(db).create({ email: 'pers-owner@example.com', name: 'PersOwner', passwordHash: 'h' });
    const project = await projectQueries(db).create({ userId: user.id, name: 'PersProject', slug: 'pers-project' });
    projectId = project.id;
  });

  it('upserts a personality (insert)', async () => {
    const pers = await q().upsert(projectId, { name: 'Friendly Bot', tone: 'friendly' });
    expect(pers.tone).toBe('friendly');
  });

  it('upserts a personality (update)', async () => {
    const pers = await q().upsert(projectId, { tone: 'formal' });
    expect(pers.tone).toBe('formal');
  });

  it('finds personality by project id', async () => {
    const found = await q().findByProjectId(projectId);
    expect(found).not.toBeNull();
  });
});

describe('themeQueries', () => {
  const q = () => themeQueries(db);
  let projectId: string;

  beforeAll(async () => {
    const user = await userQueries(db).create({ email: 'theme-owner@example.com', name: 'ThemeOwner', passwordHash: 'h' });
    const project = await projectQueries(db).create({ userId: user.id, name: 'ThemeProject', slug: 'theme-project' });
    projectId = project.id;
  });

  it('upserts a theme', async () => {
    const theme = await q().upsert(projectId, { primaryColor: '#ff0000' });
    expect(theme.primaryColor).toBe('#ff0000');
  });

  it('updates existing theme', async () => {
    const theme = await q().upsert(projectId, { primaryColor: '#00ff00' });
    expect(theme.primaryColor).toBe('#00ff00');
  });
});

describe('sessionQueries', () => {
  const q = () => sessionQueries(db);
  let projectId: string;

  beforeAll(async () => {
    const user = await userQueries(db).create({ email: 'sess-owner@example.com', name: 'SessOwner', passwordHash: 'h' });
    const project = await projectQueries(db).create({ userId: user.id, name: 'SessProject', slug: 'sess-project' });
    projectId = project.id;
  });

  it('creates and validates a session', async () => {
    const token = 'test-token-' + Date.now();
    const session = await q().create({
      projectId,
      sessionToken: token,
      expiresAt: new Date(Date.now() + 86400000),
    });
    expect(session.sessionToken).toBe(token);

    const valid = await q().isValid(token);
    expect(valid).toBe(true);
  });

  it('finds session by token', async () => {
    const token = 'find-token-' + Date.now();
    await q().create({ projectId, sessionToken: token, expiresAt: new Date(Date.now() + 86400000) });
    const found = await q().findByToken(token);
    expect(found).not.toBeNull();
    expect(found!.projectId).toBe(projectId);
  });

  it('returns invalid for expired session', async () => {
    const token = 'expired-token-' + Date.now();
    await q().create({ projectId, sessionToken: token, expiresAt: new Date(Date.now() - 1000) });
    const valid = await q().isValid(token);
    expect(valid).toBe(false);
  });
});

describe('messageQueries', () => {
  const q = () => messageQueries(db);
  let sessionId: string;

  beforeAll(async () => {
    const user = await userQueries(db).create({ email: 'msg-owner@example.com', name: 'MsgOwner', passwordHash: 'h' });
    const project = await projectQueries(db).create({ userId: user.id, name: 'MsgProject', slug: 'msg-project' });
    const session = await sessionQueries(db).create({
      projectId: project.id,
      sessionToken: 'msg-session-' + Date.now(),
      expiresAt: new Date(Date.now() + 86400000),
    });
    sessionId = session.id;
  });

  it('creates and retrieves messages', async () => {
    await q().create({ sessionId, role: 'user', content: 'Hello' });
    await q().create({ sessionId, role: 'assistant', content: 'Hi there!', citations: [{ doc: 'test' }] });

    const messages = await q().findBySessionId(sessionId);
    expect(messages.length).toBe(2);
    expect(messages[0]!.role).toBe('user');
    expect(messages[1]!.role).toBe('assistant');
  });

  it('updates message feedback', async () => {
    const msg = await q().create({ sessionId, role: 'assistant', content: 'Good answer' });
    const updated = await q().updateFeedback(msg.id, 'positive');
    expect(updated!.feedback).toBe('positive');
  });
});

describe('analyticsQueries', () => {
  const q = () => analyticsQueries(db);
  let projectId: string;

  beforeAll(async () => {
    const user = await userQueries(db).create({ email: 'analytics-owner@example.com', name: 'AOwner', passwordHash: 'h' });
    const project = await projectQueries(db).create({ userId: user.id, name: 'AnalyticsProject', slug: 'analytics-project' });
    projectId = project.id;
  });

  it('logs and counts events', async () => {
    await q().logEvent({ projectId, eventType: 'message_sent' });
    await q().logEvent({ projectId, eventType: 'message_sent' });
    await q().logEvent({ projectId, eventType: 'session_start' });

    const msgCount = await q().countByType(projectId, 'message_sent');
    expect(msgCount).toBe(2);

    const sessCount = await q().countByType(projectId, 'session_start');
    expect(sessCount).toBe(1);
  });

  it('returns daily aggregates', async () => {
    const agg = await q().dailyAggregates(projectId);
    expect(agg.length).toBeGreaterThanOrEqual(1);
  });
});

describe('apiKeyQueries', () => {
  const q = () => apiKeyQueries(db);
  let userId: string;

  beforeAll(async () => {
    const user = await userQueries(db).create({ email: 'apikey-owner@example.com', name: 'APIOwner', passwordHash: 'h' });
    userId = user.id;
  });

  it('creates and finds api keys', async () => {
    const key = await q().create({ userId, provider: 'openai', encryptedKey: 'enc123', label: 'My Key' });
    expect(key.provider).toBe('openai');

    const keys = await q().findByUserId(userId);
    expect(keys.length).toBe(1);
  });

  it('upserts by provider', async () => {
    await q().upsertByProvider(userId, 'anthropic', 'enc456', 'Anthropic Key');
    await q().upsertByProvider(userId, 'anthropic', 'enc789', 'Updated Key');

    const keys = await q().findByUserId(userId);
    const anthropicKeys = keys.filter(k => k.provider === 'anthropic');
    expect(anthropicKeys.length).toBe(1);
    expect(anthropicKeys[0]!.encryptedKey).toBe('enc789');
  });

  it('deletes an api key', async () => {
    const key = await q().create({ userId, provider: 'test', encryptedKey: 'del' });
    await q().delete(key.id);
    const found = await q().findByUserAndProvider(userId, 'test');
    expect(found).toBeNull();
  });
});

describe('chunkQueries', () => {
  const q = () => chunkQueries(db);
  let documentId: string;

  beforeAll(async () => {
    const user = await userQueries(db).create({ email: 'chunk-owner@example.com', name: 'ChunkOwner', passwordHash: 'h' });
    const project = await projectQueries(db).create({ userId: user.id, name: 'ChunkProject', slug: 'chunk-project' });
    const doc = await documentQueries(db).create({
      projectId: project.id,
      filename: 'chunk-test.pdf',
      storageUrl: '/chunks/test.pdf',
      fileSize: 2048,
    });
    documentId = doc.id;
  });

  it('creates multiple chunks', async () => {
    const chunks = await q().createMany([
      { documentId, text: 'First chunk', chunkIndex: 0, pageNumbers: [1] },
      { documentId, text: 'Second chunk', chunkIndex: 1, pageNumbers: [1, 2] },
    ]);
    expect(chunks.length).toBe(2);
  });

  it('finds chunks by document id', async () => {
    const chunks = await q().findByDocumentId(documentId);
    expect(chunks.length).toBe(2);
  });

  it('finds chunks by ids', async () => {
    const all = await q().findByDocumentId(documentId);
    const found = await q().findByIds([all[0]!.id]);
    expect(found.length).toBe(1);
  });
});
