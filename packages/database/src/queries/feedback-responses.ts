import { eq, sql, desc, and, gte } from 'drizzle-orm';
import { feedbackResponses } from '../schema/index';
import type { Database } from '../client';

export function feedbackResponseQueries(db: Database) {
  return {
    async create(data: {
      projectId: string;
      sessionId?: string | null;
      ratings?: Array<{ ratingId: string; value: number }>;
      answers?: Array<{ questionId: string; value: string }>;
    }) {
      const rows = await db
        .insert(feedbackResponses)
        .values({
          projectId: data.projectId,
          sessionId: data.sessionId ?? undefined,
          ratings: data.ratings ?? [],
          answers: data.answers ?? [],
        })
        .returning();
      return rows[0]!;
    },

    async findByProjectId(projectId: string, limit = 50, offset = 0, since?: Date) {
      const conditions = [eq(feedbackResponses.projectId, projectId)];
      if (since) conditions.push(gte(feedbackResponses.createdAt, since));

      return db
        .select()
        .from(feedbackResponses)
        .where(and(...conditions))
        .orderBy(desc(feedbackResponses.createdAt))
        .limit(limit)
        .offset(offset);
    },

    async countByProjectId(projectId: string, since?: Date): Promise<number> {
      const conditions = [eq(feedbackResponses.projectId, projectId)];
      if (since) conditions.push(gte(feedbackResponses.createdAt, since));

      const rows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(feedbackResponses)
        .where(and(...conditions));
      return rows[0]?.count ?? 0;
    },

    async averageStarRating(projectId: string): Promise<number | null> {
      // Compute average from the first rating value in the JSONB array
      const rows = await db
        .select({
          avg: sql<number | null>`avg((ratings->0->>'value')::numeric)::numeric(3,2)`,
        })
        .from(feedbackResponses)
        .where(eq(feedbackResponses.projectId, projectId));
      const avg = rows[0]?.avg;
      return avg != null ? Number(avg) : null;
    },

    async ratingDistribution(
      projectId: string,
      ratingId: string,
      since?: Date,
    ): Promise<Array<{ value: number; count: number }>> {
      const sinceClause = since
        ? sql`AND fr.created_at >= ${since}`
        : sql``;

      const rows = await db.execute<{ value: number; count: number }>(sql`
        SELECT (r->>'value')::int AS value, count(*)::int AS count
        FROM feedback_responses fr,
             jsonb_array_elements(fr.ratings) AS r
        WHERE fr.project_id = ${projectId}
          AND r->>'ratingId' = ${ratingId}
          ${sinceClause}
        GROUP BY (r->>'value')::int
        ORDER BY value
      `);
      return rows.rows ?? rows;
    },

    async averageRatingById(
      projectId: string,
      ratingId: string,
      since?: Date,
    ): Promise<number | null> {
      const sinceClause = since
        ? sql`AND fr.created_at >= ${since}`
        : sql``;

      const rows = await db.execute<{ avg: string | null }>(sql`
        SELECT avg((r->>'value')::numeric)::numeric(3,2) AS avg
        FROM feedback_responses fr,
             jsonb_array_elements(fr.ratings) AS r
        WHERE fr.project_id = ${projectId}
          AND r->>'ratingId' = ${ratingId}
          ${sinceClause}
      `);
      const row = (rows.rows ?? rows)[0];
      return row?.avg != null ? Number(row.avg) : null;
    },

    async dailyRatingAverages(
      projectId: string,
      ratingId: string,
      days: number,
    ): Promise<Array<{ date: string; avg: number; count: number }>> {
      const rows = await db.execute<{ date: string; avg: number; count: number }>(sql`
        SELECT
          to_char(fr.created_at, 'YYYY-MM-DD') AS date,
          avg((r->>'value')::numeric)::numeric(3,2) AS avg,
          count(*)::int AS count
        FROM feedback_responses fr,
             jsonb_array_elements(fr.ratings) AS r
        WHERE fr.project_id = ${projectId}
          AND r->>'ratingId' = ${ratingId}
          AND fr.created_at >= now() - make_interval(days => ${days})
        GROUP BY to_char(fr.created_at, 'YYYY-MM-DD')
        ORDER BY date
      `);
      return (rows.rows ?? rows).map((r: { date: string; avg: number | string; count: number }) => ({
        date: r.date,
        avg: Number(r.avg),
        count: r.count,
      }));
    },
  };
}
