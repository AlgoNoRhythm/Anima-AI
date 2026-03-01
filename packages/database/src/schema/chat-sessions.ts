import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  sessionToken: text('session_token').notNull().unique(),
  ipHash: text('ip_hash'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (table) => [
  index('chat_sessions_project_id_idx').on(table.projectId),
]);
