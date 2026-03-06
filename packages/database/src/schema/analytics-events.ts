import { pgTable, text, timestamp, uuid, jsonb, index } from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { chatSessions } from './chat-sessions';

export const analyticsEvents = pgTable('analytics_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id').references(() => chatSessions.id, { onDelete: 'set null' }),
  eventType: text('event_type', { enum: ['session_start', 'message_sent', 'message_received', 'feedback_given', 'document_viewed', 'qr_scanned', 'feedback_survey_submitted'] }).notNull(),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('analytics_project_id_idx').on(table.projectId),
  index('analytics_event_type_idx').on(table.eventType),
  index('analytics_created_at_idx').on(table.createdAt),
  index('analytics_project_id_created_at_idx').on(table.projectId, table.createdAt),
]);
