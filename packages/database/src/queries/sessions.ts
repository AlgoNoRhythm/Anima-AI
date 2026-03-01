import { eq, and, gt, lt, desc, sql, ilike } from 'drizzle-orm';
import { chatSessions, messages } from '../schema/index';
import type { Database } from '../client';

export interface SearchSessionsOptions {
  search?: string;
  page?: number;
  limit?: number;
}

export interface SessionWithPreview {
  id: string;
  createdAt: Date;
  messageCount: number;
  firstUserMessage: string | null;
}

export function sessionQueries(db: Database) {
  return {
    async create(data: {
      projectId: string;
      sessionToken: string;
      ipHash?: string | null;
      userAgent?: string | null;
      expiresAt: Date;
    }) {
      const rows = await db.insert(chatSessions).values(data).returning();
      return rows[0]!;
    },

    async findById(id: string) {
      const rows = await db
        .select()
        .from(chatSessions)
        .where(eq(chatSessions.id, id))
        .limit(1);
      return rows[0] ?? null;
    },

    async findByToken(token: string) {
      const rows = await db
        .select()
        .from(chatSessions)
        .where(eq(chatSessions.sessionToken, token))
        .limit(1);
      return rows[0] ?? null;
    },

    async isValid(token: string) {
      const rows = await db
        .select()
        .from(chatSessions)
        .where(
          and(
            eq(chatSessions.sessionToken, token),
            gt(chatSessions.expiresAt, new Date()),
          ),
        )
        .limit(1);
      return rows.length > 0;
    },

    async findByProjectId(projectId: string) {
      return db
        .select()
        .from(chatSessions)
        .where(eq(chatSessions.projectId, projectId))
        .orderBy(chatSessions.createdAt);
    },

    async countByProjectId(projectId: string) {
      const rows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(chatSessions)
        .where(eq(chatSessions.projectId, projectId));
      return rows[0]?.count ?? 0;
    },

    async countAll(userId?: string) {
      if (userId) {
        const { projects } = await import('../schema/index');
        const rows = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(chatSessions)
          .innerJoin(projects, eq(chatSessions.projectId, projects.id))
          .where(eq(projects.userId, userId));
        return rows[0]?.count ?? 0;
      }
      const rows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(chatSessions);
      return rows[0]?.count ?? 0;
    },

    async deleteExpired() {
      await db
        .delete(chatSessions)
        .where(lt(chatSessions.expiresAt, new Date()));
    },

    async searchSessions(
      projectId: string,
      opts: SearchSessionsOptions = {},
    ): Promise<{ sessions: SessionWithPreview[]; total: number }> {
      const page = opts.page ?? 1;
      const limit = opts.limit ?? 20;
      const offset = (page - 1) * limit;
      const searchTerm = opts.search?.trim().toLowerCase();

      if (searchTerm) {
        // When searching, find sessions that have matching messages using a subquery
        const matchingSessionIds = db
          .select({ sessionId: messages.sessionId })
          .from(messages)
          .where(ilike(messages.content, `%${searchTerm}%`))
          .groupBy(messages.sessionId);

        // Get total count of matching sessions
        const countRows = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(chatSessions)
          .where(
            and(
              eq(chatSessions.projectId, projectId),
              sql`${chatSessions.id} IN (${matchingSessionIds})`,
            ),
          );
        const total = countRows[0]?.count ?? 0;

        // Get paginated sessions with message counts and first user message via lateral join
        const rows = await db.execute(sql`
          SELECT
            cs.id,
            cs.created_at,
            COALESCE(mc.message_count, 0)::int AS message_count,
            fm.content AS first_user_message
          FROM chat_sessions cs
          LEFT JOIN LATERAL (
            SELECT count(*) AS message_count
            FROM messages m WHERE m.session_id = cs.id
          ) mc ON true
          LEFT JOIN LATERAL (
            SELECT m.content
            FROM messages m
            WHERE m.session_id = cs.id AND m.role = 'user'
            ORDER BY m.created_at ASC
            LIMIT 1
          ) fm ON true
          WHERE cs.project_id = ${projectId}
            AND cs.id IN (
              SELECT m.session_id FROM messages m
              WHERE lower(m.content) LIKE ${`%${searchTerm}%`}
              GROUP BY m.session_id
            )
          ORDER BY cs.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `);

        const resultRows = (rows as unknown as { rows: Array<{
          id: string;
          created_at: Date;
          message_count: number;
          first_user_message: string | null;
        }> }).rows;

        const sessions: SessionWithPreview[] = resultRows.map((r) => ({
          id: r.id,
          createdAt: r.created_at,
          messageCount: r.message_count,
          firstUserMessage: r.first_user_message
            ? r.first_user_message.slice(0, 200)
            : null,
        }));

        return { sessions, total };
      }

      // No search: simple paginated query with message counts
      const countRows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(chatSessions)
        .where(eq(chatSessions.projectId, projectId));
      const total = countRows[0]?.count ?? 0;

      const result = await db.execute(sql`
        SELECT
          cs.id,
          cs.created_at,
          COALESCE(mc.message_count, 0)::int AS message_count,
          fm.content AS first_user_message
        FROM chat_sessions cs
        LEFT JOIN LATERAL (
          SELECT count(*) AS message_count
          FROM messages m WHERE m.session_id = cs.id
        ) mc ON true
        LEFT JOIN LATERAL (
          SELECT m.content
          FROM messages m
          WHERE m.session_id = cs.id AND m.role = 'user'
          ORDER BY m.created_at ASC
          LIMIT 1
        ) fm ON true
        WHERE cs.project_id = ${projectId}
        ORDER BY cs.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);

      const resultRows = (result as unknown as { rows: Array<{
        id: string;
        created_at: Date;
        message_count: number;
        first_user_message: string | null;
      }> }).rows;

      const sessions: SessionWithPreview[] = resultRows.map((r) => ({
        id: r.id,
        createdAt: r.created_at,
        messageCount: r.message_count,
        firstUserMessage: r.first_user_message
          ? r.first_user_message.slice(0, 200)
          : null,
      }));

      return { sessions, total };
    },
  };
}
