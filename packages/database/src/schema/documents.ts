import { pgTable, text, timestamp, uuid, integer, index, jsonb } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  title: text('title'),
  totalPages: integer('total_pages'),
  status: text('status', { enum: ['pending', 'parsing', 'indexing', 'completed', 'failed'] }).notNull().default('pending'),
  errorMessage: text('error_message'),
  storageUrl: text('storage_url').notNull(),
  fileSize: integer('file_size').notNull(),
  treeIndex: jsonb('tree_index'),
  detectedEntity: text('detected_entity'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('documents_project_id_idx').on(table.projectId),
]);
