import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const themes = pgTable('themes', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  primaryColor: text('primary_color').notNull().default('#eab308'),
  backgroundColor: text('background_color').notNull().default('#fffdf9'),
  fontFamily: text('font_family').notNull().default('Inter, system-ui, sans-serif'),
  logoUrl: text('logo_url'),
  borderRadius: text('border_radius').notNull().default('0.5rem'),
  customCss: text('custom_css'),
  welcomeMessage: text('welcome_message').notNull().default('Hello! How can I help you today?'),
  actionButtonLabel: text('action_button_label').notNull().default('Open PDF'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('themes_project_id_idx').on(table.projectId),
]);
