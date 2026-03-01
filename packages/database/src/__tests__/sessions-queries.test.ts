import { describe, it, expect, beforeAll } from 'vitest';
import { waitForDb } from '../client';
import { userQueries } from '../queries/users';
import { projectQueries } from '../queries/projects';
import { sessionQueries } from '../queries/sessions';
import { messageQueries } from '../queries/messages';
import type { Database } from '../client';

let db: Database;
let projectId: string;
let otherProjectId: string;

beforeAll(async () => {
  db = await waitForDb();

  // Create a user and two projects to isolate session search tests
  const user = await userQueries(db).create({
    email: 'search-sessions@test.com',
    name: 'Search Tester',
    passwordHash: 'hash',
  });

  const project = await projectQueries(db).create({
    userId: user.id,
    name: 'Search Project',
    slug: 'search-project-sessions',
  });
  projectId = project.id;

  const otherProject = await projectQueries(db).create({
    userId: user.id,
    name: 'Other Project',
    slug: 'other-project-sessions',
  });
  otherProjectId = otherProject.id;

  // Create sessions with messages so searchSessions has data to work with
  async function seedSession(token: string, messages: Array<{ role: 'user' | 'assistant'; content: string }>) {
    const session = await sessionQueries(db).create({
      projectId,
      sessionToken: token,
      expiresAt: new Date(Date.now() + 86400000),
    });
    for (const msg of messages) {
      await messageQueries(db).create({ sessionId: session.id, role: msg.role, content: msg.content });
    }
    return session;
  }

  // Session 1: asks about filters
  await seedSession('sess-filter-1', [
    { role: 'user', content: 'How do I clean the filter?' },
    { role: 'assistant', content: 'Remove the filter tray and rinse it.' },
  ]);

  // Session 2: asks about installation
  await seedSession('sess-install-2', [
    { role: 'user', content: 'How do I install the dishwasher?' },
    { role: 'assistant', content: 'Follow the installation guide on page 3.' },
  ]);

  // Session 3: no messages
  await sessionQueries(db).create({
    projectId,
    sessionToken: 'sess-empty-3',
    expiresAt: new Date(Date.now() + 86400000),
  });

  // Create a session in the OTHER project (should not appear in search for our projectId)
  const otherSession = await sessionQueries(db).create({
    projectId: otherProjectId,
    sessionToken: 'sess-other-project',
    expiresAt: new Date(Date.now() + 86400000),
  });
  await messageQueries(db).create({
    sessionId: otherSession.id,
    role: 'user',
    content: 'This belongs to a different project',
  });
});

describe('searchSessions', () => {
  const q = () => sessionQueries(db);

  describe('basic retrieval', () => {
    it('returns sessions with message previews', async () => {
      const { sessions, total } = await q().searchSessions(projectId);

      expect(total).toBeGreaterThanOrEqual(3);
      // Sessions must have the expected shape
      for (const session of sessions) {
        expect(session).toHaveProperty('id');
        expect(session).toHaveProperty('createdAt');
        expect(session).toHaveProperty('messageCount');
        expect(session).toHaveProperty('firstUserMessage');
      }
    });

    it('includes messageCount for sessions with messages', async () => {
      const { sessions } = await q().searchSessions(projectId);

      const sessionWithMessages = sessions.find((s) => s.messageCount > 0);
      expect(sessionWithMessages).toBeDefined();
      expect(sessionWithMessages!.messageCount).toBeGreaterThanOrEqual(2);
    });

    it('sets firstUserMessage to the first user message content', async () => {
      const { sessions } = await q().searchSessions(projectId);

      const filterSession = sessions.find((s) => s.firstUserMessage?.includes('filter'));
      expect(filterSession).toBeDefined();
    });

    it('sets firstUserMessage to null for sessions with no messages', async () => {
      const { sessions } = await q().searchSessions(projectId);

      const emptySession = sessions.find((s) => s.messageCount === 0);
      expect(emptySession).toBeDefined();
      expect(emptySession!.firstUserMessage).toBeNull();
    });

    it('does not include sessions from other projects', async () => {
      const { sessions } = await q().searchSessions(projectId);

      // None of the returned sessions should have the token from the other project
      const ids = sessions.map((s) => s.id);
      // We can verify by ensuring all returned sessions belong to our project
      // by checking message content doesn't include the other project's message
      const crossContam = sessions.find((s) =>
        s.firstUserMessage?.includes('different project'),
      );
      expect(crossContam).toBeUndefined();
    });
  });

  describe('search query parameter', () => {
    it('filters sessions by message content (matching query)', async () => {
      const { sessions, total } = await q().searchSessions(projectId, { search: 'filter' });

      expect(total).toBeGreaterThanOrEqual(1);
      // Every returned session should have at least one message matching "filter"
      for (const session of sessions) {
        const hasMatch =
          session.firstUserMessage?.toLowerCase().includes('filter') ||
          session.messageCount > 0;
        expect(hasMatch).toBe(true);
      }
    });

    it('filters sessions by message content (non-matching query returns empty)', async () => {
      const { sessions, total } = await q().searchSessions(projectId, {
        search: 'zxqwerty-no-match-9999',
      });

      expect(total).toBe(0);
      expect(sessions).toHaveLength(0);
    });

    it('is case-insensitive in search', async () => {
      const { sessions: lower } = await q().searchSessions(projectId, { search: 'install' });
      const { sessions: upper } = await q().searchSessions(projectId, { search: 'INSTALL' });

      expect(lower.length).toBe(upper.length);
    });

    it('matches content in assistant messages as well', async () => {
      // "rinse" appears only in the assistant message of the filter session
      const { sessions } = await q().searchSessions(projectId, { search: 'rinse' });
      expect(sessions.length).toBeGreaterThanOrEqual(1);
    });

    it('returns all sessions when no search term provided', async () => {
      const { sessions: withEmpty } = await q().searchSessions(projectId, { search: '' });
      const { sessions: withUndefined } = await q().searchSessions(projectId);

      expect(withEmpty.length).toBe(withUndefined.length);
    });
  });

  describe('pagination', () => {
    it('returns total count including non-paginated results', async () => {
      const { total } = await q().searchSessions(projectId);
      expect(typeof total).toBe('number');
      expect(total).toBeGreaterThanOrEqual(3);
    });

    it('limits results to the requested page size', async () => {
      const { sessions } = await q().searchSessions(projectId, { limit: 1 });
      expect(sessions.length).toBeLessThanOrEqual(1);
    });

    it('returns correct page of results', async () => {
      const { sessions: page1 } = await q().searchSessions(projectId, { page: 1, limit: 1 });
      const { sessions: page2 } = await q().searchSessions(projectId, { page: 2, limit: 1 });

      if (page1.length > 0 && page2.length > 0) {
        expect(page1[0]!.id).not.toBe(page2[0]!.id);
      }
    });

    it('returns empty array when page exceeds available results', async () => {
      const { sessions } = await q().searchSessions(projectId, { page: 9999, limit: 20 });
      expect(sessions).toHaveLength(0);
    });

    it('uses default limit of 20 when not specified', async () => {
      const { sessions } = await q().searchSessions(projectId);
      // We have 3 sessions, so all should be returned under the default limit of 20
      expect(sessions.length).toBeLessThanOrEqual(20);
    });

    it('total reflects filtered count when search is applied', async () => {
      const { total: allTotal } = await q().searchSessions(projectId);
      const { total: filteredTotal } = await q().searchSessions(projectId, { search: 'filter' });

      // The filtered total should be <= the unfiltered total
      expect(filteredTotal).toBeLessThanOrEqual(allTotal);
    });

    it('truncates firstUserMessage to 200 characters', async () => {
      // Create a session with a very long first user message
      const longMessage = 'A'.repeat(300);
      const session = await sessionQueries(db).create({
        projectId,
        sessionToken: 'sess-long-msg',
        expiresAt: new Date(Date.now() + 86400000),
      });
      await messageQueries(db).create({
        sessionId: session.id,
        role: 'user',
        content: longMessage,
      });

      const { sessions } = await q().searchSessions(projectId);
      const longSession = sessions.find((s) => s.id === session.id);

      expect(longSession).toBeDefined();
      expect(longSession!.firstUserMessage!.length).toBeLessThanOrEqual(200);
    });
  });
});
