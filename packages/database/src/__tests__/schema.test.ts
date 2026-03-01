import { describe, it, expect, beforeAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { waitForDb } from '../client';
import type { Database } from '../client';
import {
  users,
  projects,
  documents,
  personalities,
  themes,
  chatSessions,
  messages,
  qrCodes,
  analyticsEvents,
  apiKeys,
} from '../schema/index';

let db: Database;

beforeAll(async () => {
  db = await waitForDb();
});

describe('users CRUD', () => {
  it('inserts and retrieves a user', async () => {
    const [user] = await db.insert(users).values({
      email: 'test@example.com',
      name: 'Test User',
      passwordHash: 'hashed-password',
    }).returning();

    expect(user).toBeDefined();
    expect(user!.email).toBe('test@example.com');
    expect(user!.name).toBe('Test User');
    expect(user!.id).toBeDefined();
    expect(user!.createdAt).toBeInstanceOf(Date);
  });

  it('enforces unique email', async () => {
    await db.insert(users).values({
      email: 'unique@example.com',
      name: 'User 1',
      passwordHash: 'hash1',
    });

    await expect(
      db.insert(users).values({
        email: 'unique@example.com',
        name: 'User 2',
        passwordHash: 'hash2',
      })
    ).rejects.toThrow();
  });
});

describe('projects CRUD', () => {
  it('creates a project linked to a user', async () => {
    const [user] = await db.insert(users).values({
      email: 'proj-user@example.com',
      name: 'Project User',
      passwordHash: 'hash',
    }).returning();

    const [project] = await db.insert(projects).values({
      userId: user!.id,
      name: 'Test Project',
      slug: 'test-project',
      description: 'A test project',
      mode: 'both',
      settings: { maxFileSize: 50 },
    }).returning();

    expect(project).toBeDefined();
    expect(project!.slug).toBe('test-project');
    expect(project!.mode).toBe('both');
    expect(project!.settings).toEqual({ maxFileSize: 50 });
  });
});

describe('documents CRUD', () => {
  it('creates a document linked to a project', async () => {
    const [user] = await db.insert(users).values({
      email: 'doc-user@example.com',
      name: 'Doc User',
      passwordHash: 'hash',
    }).returning();

    const [project] = await db.insert(projects).values({
      userId: user!.id,
      name: 'Doc Project',
      slug: 'doc-project',
      mode: 'chat',
    }).returning();

    const [doc] = await db.insert(documents).values({
      projectId: project!.id,
      filename: 'manual.pdf',
      title: 'Dishwasher Manual',
      totalPages: 42,
      status: 'pending',
      storageUrl: '/uploads/manual.pdf',
      fileSize: 1024000,
    }).returning();

    expect(doc).toBeDefined();
    expect(doc!.filename).toBe('manual.pdf');
    expect(doc!.status).toBe('pending');
    expect(doc!.totalPages).toBe(42);
  });
});

describe('personalities CRUD', () => {
  it('creates a personality with guardrails', async () => {
    const [user] = await db.insert(users).values({
      email: 'pers-user@example.com',
      name: 'Pers User',
      passwordHash: 'hash',
    }).returning();

    const [project] = await db.insert(projects).values({
      userId: user!.id,
      name: 'Pers Project',
      slug: 'pers-project',
      mode: 'chat',
    }).returning();

    const guardrails = {
      blockedTopics: ['politics'],
      maxResponseLength: 1000,
      requireCitations: true,
      allowOffTopic: false,
      customInstructions: null,
    };

    const [personality] = await db.insert(personalities).values({
      projectId: project!.id,
      name: 'Friendly Bot',
      systemPrompt: 'You are a friendly assistant.',
      tone: 'friendly',
      temperature: 0.8,
      guardrails,
    }).returning();

    expect(personality).toBeDefined();
    expect(personality!.tone).toBe('friendly');
    expect(personality!.guardrails).toEqual(guardrails);
  });
});

describe('chat sessions and messages', () => {
  it('creates a session and messages', async () => {
    const [user] = await db.insert(users).values({
      email: 'chat-user@example.com',
      name: 'Chat User',
      passwordHash: 'hash',
    }).returning();

    const [project] = await db.insert(projects).values({
      userId: user!.id,
      name: 'Chat Project',
      slug: 'chat-project',
      mode: 'chat',
    }).returning();

    const [session] = await db.insert(chatSessions).values({
      projectId: project!.id,
      sessionToken: 'tok_abc123',
      ipHash: 'hash123',
      userAgent: 'TestBrowser/1.0',
      expiresAt: new Date(Date.now() + 86400000),
    }).returning();

    expect(session).toBeDefined();
    expect(session!.sessionToken).toBe('tok_abc123');

    const [msg] = await db.insert(messages).values({
      sessionId: session!.id,
      role: 'user',
      content: 'How do I clean the filter?',
      citations: [],
    }).returning();

    expect(msg).toBeDefined();
    expect(msg!.role).toBe('user');
    expect(msg!.content).toBe('How do I clean the filter?');

    const [reply] = await db.insert(messages).values({
      sessionId: session!.id,
      role: 'assistant',
      content: 'Remove the filter and rinse it under water.',
      citations: [{ documentId: 'doc-1', pageNumbers: [12], text: 'rinse under water' }],
    }).returning();

    expect(reply).toBeDefined();
    expect(reply!.citations).toHaveLength(1);
  });
});

describe('themes CRUD', () => {
  it('creates a theme with custom values', async () => {
    const [user] = await db.insert(users).values({
      email: 'theme-user@example.com',
      name: 'Theme User',
      passwordHash: 'hash',
    }).returning();

    const [project] = await db.insert(projects).values({
      userId: user!.id,
      name: 'Theme Project',
      slug: 'theme-project',
      mode: 'both',
    }).returning();

    const [theme] = await db.insert(themes).values({
      projectId: project!.id,
      primaryColor: '#ff6600',
      backgroundColor: '#1a1a1a',
      fontFamily: 'Roboto, sans-serif',
      welcomeMessage: 'Welcome!',
    }).returning();

    expect(theme).toBeDefined();
    expect(theme!.primaryColor).toBe('#ff6600');
    expect(theme!.welcomeMessage).toBe('Welcome!');
  });
});

describe('qr codes CRUD', () => {
  it('creates a QR code config', async () => {
    const [user] = await db.insert(users).values({
      email: 'qr-user@example.com',
      name: 'QR User',
      passwordHash: 'hash',
    }).returning();

    const [project] = await db.insert(projects).values({
      userId: user!.id,
      name: 'QR Project',
      slug: 'qr-project',
      mode: 'chat',
    }).returning();

    const config = { width: 300, height: 300, dotsStyle: 'rounded' };
    const [qr] = await db.insert(qrCodes).values({
      projectId: project!.id,
      config,
    }).returning();

    expect(qr).toBeDefined();
    expect(qr!.config).toEqual(config);
  });
});

describe('analytics events', () => {
  it('creates analytics events', async () => {
    const [user] = await db.insert(users).values({
      email: 'analytics-user@example.com',
      name: 'Analytics User',
      passwordHash: 'hash',
    }).returning();

    const [project] = await db.insert(projects).values({
      userId: user!.id,
      name: 'Analytics Project',
      slug: 'analytics-project',
      mode: 'chat',
    }).returning();

    const [event] = await db.insert(analyticsEvents).values({
      projectId: project!.id,
      eventType: 'session_start',
      metadata: { source: 'qr_scan' },
    }).returning();

    expect(event).toBeDefined();
    expect(event!.eventType).toBe('session_start');
    expect(event!.metadata).toEqual({ source: 'qr_scan' });
  });
});

describe('api keys CRUD', () => {
  it('creates an API key entry', async () => {
    const [user] = await db.insert(users).values({
      email: 'apikey-user@example.com',
      name: 'API Key User',
      passwordHash: 'hash',
    }).returning();

    const [key] = await db.insert(apiKeys).values({
      userId: user!.id,
      provider: 'openai',
      encryptedKey: 'enc_sk-abc123',
      label: 'My OpenAI Key',
    }).returning();

    expect(key).toBeDefined();
    expect(key!.provider).toBe('openai');
    expect(key!.label).toBe('My OpenAI Key');
  });
});

describe('cascade deletes', () => {
  it('deletes project and cascades to documents', async () => {
    const [user] = await db.insert(users).values({
      email: 'cascade-user@example.com',
      name: 'Cascade User',
      passwordHash: 'hash',
    }).returning();

    const [project] = await db.insert(projects).values({
      userId: user!.id,
      name: 'Cascade Project',
      slug: 'cascade-project',
      mode: 'chat',
    }).returning();

    await db.insert(documents).values({
      projectId: project!.id,
      filename: 'test.pdf',
      storageUrl: '/uploads/test.pdf',
      fileSize: 1024,
    });

    // Delete the project
    await db.delete(projects).where(eq(projects.id, project!.id));

    // Documents should be gone
    const docs = await db.select().from(documents).where(eq(documents.projectId, project!.id));
    expect(docs).toHaveLength(0);
  });
});
