import { pgTable, timestamp, uuid, jsonb, index } from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { chatSessions } from './chat-sessions';

export const feedbackResponses = pgTable('feedback_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id').references(() => chatSessions.id, { onDelete: 'set null' }),
  ratings: jsonb('ratings').notNull().default([]),
  answers: jsonb('answers').notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('feedback_responses_project_id_idx').on(table.projectId),
  index('feedback_responses_created_at_idx').on(table.createdAt),
]);
