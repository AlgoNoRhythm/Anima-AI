import { pgTable, text, timestamp, uuid, boolean, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const feedbackConfigs = pgTable('feedback_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  enabled: boolean('enabled').notNull().default(false),
  ratings: jsonb('ratings').notNull().default([]),
  questions: jsonb('questions').notNull().default([]),
  submitButtonLabel: text('submit_button_label').notNull().default('Submit Feedback'),
  thankYouMessage: text('thank_you_message').notNull().default('Thank you for your feedback!'),
  translations: jsonb('translations').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('feedback_configs_project_id_idx').on(table.projectId),
]);
