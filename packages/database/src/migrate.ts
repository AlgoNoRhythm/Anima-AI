import { sql } from 'drizzle-orm';
import { createDatabase } from './client';
import * as schema from './schema/index';

const allTables = [
  schema.feedbackResponses,
  schema.feedbackConfigs,
  schema.analyticsEvents,
  schema.qrCodes,
  schema.messages,
  schema.chatSessions,
  schema.chunks,
  schema.documents,
  schema.themes,
  schema.personalities,
  schema.projectInvitations,
  schema.projectMembers,
  schema.projects,
  schema.apiKeys,
  schema.users,
];

export async function migrate(db: ReturnType<typeof createDatabase>) {
  // Create tables using raw SQL from schema
  // In production, use drizzle-kit migrations
  // For development/testing, we push the schema directly
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      mode TEXT NOT NULL DEFAULT 'both',
      settings JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      title TEXT,
      total_pages INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      error_message TEXT,
      storage_url TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      tree_index JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Add tree_index column if it doesn't exist (for existing databases)
  await db.execute(sql`
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS tree_index JSONB
  `);

  // Add detected_entity column if it doesn't exist (for existing databases)
  await db.execute(sql`
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS detected_entity TEXT
  `);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS documents_project_id_idx ON documents(project_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id)`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS chunks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      page_numbers INTEGER[],
      section_title TEXT,
      bbox JSONB,
      chunk_index INTEGER NOT NULL
    )
  `);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS chunks_document_id_idx ON chunks(document_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS chunks_chunk_index_idx ON chunks(chunk_index)`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS personalities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      system_prompt TEXT NOT NULL,
      tone TEXT NOT NULL DEFAULT 'professional',
      temperature REAL NOT NULL DEFAULT 0.7,
      model_provider TEXT NOT NULL DEFAULT 'anthropic',
      model_name TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20251001',
      guardrails JSONB NOT NULL DEFAULT '{}',
      show_disclaimer BOOLEAN NOT NULL DEFAULT TRUE,
      disclaimer_text TEXT NOT NULL DEFAULT 'AI-generated responses may contain inaccuracies. Please verify important information.',
      enable_image_support BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Upgrade to unique index (idempotent: drop non-unique if exists, then create unique)
  await db.execute(sql`DROP INDEX IF EXISTS personalities_project_id_idx`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS personalities_project_id_idx ON personalities(project_id)`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS themes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      primary_color TEXT NOT NULL DEFAULT '#eab308',
      background_color TEXT NOT NULL DEFAULT '#fffdf9',
      font_family TEXT NOT NULL DEFAULT 'Inter, system-ui, sans-serif',
      logo_url TEXT,
      border_radius TEXT NOT NULL DEFAULT '0.5rem',
      custom_css TEXT,
      welcome_message TEXT NOT NULL DEFAULT 'Hello! How can I help you today?',
      action_button_label TEXT NOT NULL DEFAULT 'Open PDF',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS themes_project_id_idx ON themes(project_id)`);

  // Add suggested_questions column if it doesn't exist (for existing databases)
  await db.execute(sql`
    ALTER TABLE themes ADD COLUMN IF NOT EXISTS suggested_questions JSONB NOT NULL DEFAULT '[]'
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS feedback_configs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      enabled BOOLEAN NOT NULL DEFAULT FALSE,
      ratings JSONB NOT NULL DEFAULT '[]',
      questions JSONB NOT NULL DEFAULT '[]',
      submit_button_label TEXT NOT NULL DEFAULT 'Submit Feedback',
      thank_you_message TEXT NOT NULL DEFAULT 'Thank you for your feedback!',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Migrate from star rating columns to ratings JSONB (for existing databases)
  await db.execute(sql`ALTER TABLE feedback_configs ADD COLUMN IF NOT EXISTS ratings JSONB NOT NULL DEFAULT '[]'`);
  await db.execute(sql`ALTER TABLE feedback_configs DROP COLUMN IF EXISTS star_rating_enabled`);
  await db.execute(sql`ALTER TABLE feedback_configs DROP COLUMN IF EXISTS star_rating_label`);
  await db.execute(sql`ALTER TABLE feedback_configs DROP COLUMN IF EXISTS star_rating_required`);

  // Upgrade to unique index (idempotent: drop non-unique if exists, then create unique)
  await db.execute(sql`DROP INDEX IF EXISTS feedback_configs_project_id_idx`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS feedback_configs_project_id_idx ON feedback_configs(project_id)`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      session_token TEXT NOT NULL UNIQUE,
      ip_hash TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    )
  `);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS chat_sessions_project_id_idx ON chat_sessions(project_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS chat_sessions_expires_at_idx ON chat_sessions(expires_at)`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS feedback_responses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
      ratings JSONB NOT NULL DEFAULT '[]',
      answers JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Migrate from star_rating column to ratings JSONB (for existing databases)
  await db.execute(sql`ALTER TABLE feedback_responses ADD COLUMN IF NOT EXISTS ratings JSONB NOT NULL DEFAULT '[]'`);
  await db.execute(sql`ALTER TABLE feedback_responses DROP COLUMN IF EXISTS star_rating`);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS feedback_responses_project_id_idx ON feedback_responses(project_id)`);

  // Add translations columns (for existing databases)
  await db.execute(sql`ALTER TABLE themes ADD COLUMN IF NOT EXISTS translations JSONB NOT NULL DEFAULT '{}'`);
  await db.execute(sql`ALTER TABLE personalities ADD COLUMN IF NOT EXISTS translations JSONB NOT NULL DEFAULT '{}'`);
  await db.execute(sql`ALTER TABLE feedback_configs ADD COLUMN IF NOT EXISTS translations JSONB NOT NULL DEFAULT '{}'`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS feedback_responses_created_at_idx ON feedback_responses(created_at)`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      citations JSONB NOT NULL DEFAULT '[]',
      feedback TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS messages_session_id_idx ON messages(session_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS messages_feedback_idx ON messages(feedback)`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS qr_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      config JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
      event_type TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS analytics_project_id_idx ON analytics_events(project_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS analytics_event_type_idx ON analytics_events(event_type)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS analytics_created_at_idx ON analytics_events(created_at)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS analytics_project_id_created_at_idx ON analytics_events(project_id, created_at)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS analytics_project_event_type_idx ON analytics_events(project_id, event_type)`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS api_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      encrypted_key TEXT NOT NULL,
      label TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON api_keys(user_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS qr_codes_project_id_idx ON qr_codes(project_id)`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS project_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'viewer',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(project_id, user_id)
    )
  `);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS project_members_project_id_idx ON project_members(project_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS project_members_user_id_idx ON project_members(user_id)`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS project_invitations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      token TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      invited_by UUID NOT NULL REFERENCES users(id),
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS project_invitations_project_id_idx ON project_invitations(project_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS project_invitations_token_idx ON project_invitations(token)`);
}

export async function dropAll(db: ReturnType<typeof createDatabase>) {
  for (const table of allTables) {
    await db.execute(sql`DROP TABLE IF EXISTS ${table} CASCADE`);
  }
}

// CLI entrypoint
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const db = createDatabase();
  await migrate(db);
  console.log('Migration completed successfully');
  process.exit(0);
}
