import { pgTable, text, uuid, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { documents } from './documents';

export const chunks = pgTable('chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  pageNumbers: integer('page_numbers').array(),
  sectionTitle: text('section_title'),
  bbox: jsonb('bbox'),
  chunkIndex: integer('chunk_index').notNull(),
}, (table) => [
  index('chunks_document_id_idx').on(table.documentId),
  index('chunks_chunk_index_idx').on(table.chunkIndex),
]);
