import { pgTable, timestamp, uuid, jsonb, index } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const qrCodes = pgTable('qr_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  config: jsonb('config').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('qr_codes_project_id_idx').on(table.projectId),
]);
