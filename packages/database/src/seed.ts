import { createDatabase } from './client';
import { users, projects, personalities, themes } from './schema/index';
import { DEFAULT_MODEL_PROVIDER, DEFAULT_MODEL_NAME } from '@anima-ai/shared';

// Pre-computed bcrypt hash for password "password123" (12 rounds)
// For dev use only — generate your own in production
const DEMO_PASSWORD_HASH = '$2b$12$UnU.FW1EKZByAWINgzOUBu0BLdmv68fvSqqOYrVkjJInUF1iabyfG';

// Deterministic UUIDs for dev seed data
const DEMO_USER_ID = '00000000-0000-4000-a000-000000000001';
const DEMO_PROJECT_ID = '00000000-0000-4000-a000-000000000002';

/**
 * Seeds the database with a demo user and project.
 * Safe to call multiple times — skips if data already exists.
 */
export async function seedDevData(db: ReturnType<typeof createDatabase>) {
  // Check if demo user already exists
  const existing = await db.select().from(users).limit(1);
  if (existing.length > 0) {
    return false;
  }

  // Create demo user (password: "password123")
  const [user] = await db.insert(users).values({
    id: DEMO_USER_ID,
    email: 'demo@anima-ai.dev',
    name: 'Demo User',
    passwordHash: DEMO_PASSWORD_HASH,
  }).returning();

  if (!user) throw new Error('Failed to create demo user');

  // Create demo project
  const [project] = await db.insert(projects).values({
    id: DEMO_PROJECT_ID,
    userId: user.id,
    name: 'Example Project',
    slug: 'example-project',
    description: 'An example project to get started with Anima AI',
    mode: 'both',
    settings: { maxFileSize: 50, maxDocuments: 10, allowAnonymousChat: true },
  }).returning();

  if (!project) throw new Error('Failed to create demo project');

  // Create personality
  await db.insert(personalities).values({
    projectId: project.id,
    name: 'Helpful Assistant',
    systemPrompt: `You ARE the product described in your knowledge base. Speak in first person.
- Say "I can brew up to 12 cups" not "The manual says the machine brews 12 cups"
- Say "My filter should be cleaned monthly" not "According to the document, clean the filter monthly"
- Say "I support Bluetooth 5.0" not "The spec sheet mentions Bluetooth 5.0"
Stay in character. Cite page numbers when referencing specific details.`,
    tone: 'friendly',
    temperature: 0.7,
    modelProvider: DEFAULT_MODEL_PROVIDER,
    modelName: DEFAULT_MODEL_NAME,
    guardrails: {
      blockedTopics: [],
      maxResponseLength: 2000,
      requireCitations: true,
      allowOffTopic: false,
      customInstructions: null,
    },
  });

  // Create theme
  await db.insert(themes).values({
    projectId: project.id,
    primaryColor: '#eab308',
    backgroundColor: '#f8fafc',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: '0.75rem',
    welcomeMessage: 'Hi! How can I help you today?',
  });

  return true;
}

// CLI entrypoint
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const db = createDatabase();
  const { migrate } = await import('./migrate');
  await migrate(db);
  const seeded = await seedDevData(db);
  if (seeded) {
    console.log('Seed data created successfully!');
    console.log('  User:     demo@anima-ai.dev (password: password123)');
    console.log('  Project:  example-project');
    console.log('  Chat URL: /c/example-project');
  } else {
    console.log('Database already seeded, skipping...');
  }
  process.exit(0);
}
