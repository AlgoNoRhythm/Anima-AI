import { pgTable, text, timestamp, uuid, jsonb, real, boolean } from 'drizzle-orm/pg-core';
import { DEFAULT_MODEL_PROVIDER, DEFAULT_MODEL_NAME } from '@anima-ai/shared';
import { projects } from './projects';

export const personalities = pgTable('personalities', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  tone: text('tone', { enum: ['professional', 'friendly', 'casual', 'formal', 'technical'] }).notNull().default('professional'),
  temperature: real('temperature').notNull().default(0.7),
  modelProvider: text('model_provider').notNull().default(DEFAULT_MODEL_PROVIDER),
  modelName: text('model_name').notNull().default(DEFAULT_MODEL_NAME),
  guardrails: jsonb('guardrails').notNull().default({}),
  showDisclaimer: boolean('show_disclaimer').notNull().default(true),
  disclaimerText: text('disclaimer_text').notNull().default('AI-generated responses may contain inaccuracies. Please verify important information.'),
  enableImageSupport: boolean('enable_image_support').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
