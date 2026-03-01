import { eq, and, gte, sql } from 'drizzle-orm';
import { analyticsEvents } from '../schema/index';
import type { Database } from '../client';

type EventType = 'session_start' | 'message_sent' | 'message_received' | 'feedback_given' | 'document_viewed' | 'qr_scanned';

export function analyticsQueries(db: Database) {
  return {
    async logEvent(data: {
      projectId: string;
      sessionId?: string | null;
      eventType: EventType;
      metadata?: Record<string, unknown>;
    }) {
      const rows = await db
        .insert(analyticsEvents)
        .values({
          projectId: data.projectId,
          sessionId: data.sessionId ?? undefined,
          eventType: data.eventType,
          metadata: data.metadata ?? {},
        })
        .returning();
      return rows[0]!;
    },

    async countByType(projectId: string, eventType: EventType, since?: Date) {
      const rows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(analyticsEvents)
        .where(
          since
            ? and(
                eq(analyticsEvents.projectId, projectId),
                eq(analyticsEvents.eventType, eventType),
                gte(analyticsEvents.createdAt, since),
              )
            : and(
                eq(analyticsEvents.projectId, projectId),
                eq(analyticsEvents.eventType, eventType),
              ),
        );
      return rows[0]?.count ?? 0;
    },

    async dailyAggregates(projectId: string, days: number = 30): Promise<Array<{ date: string; [key: string]: unknown }>> {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const result = await db.execute(sql`
        SELECT
          to_char(created_at, 'YYYY-MM-DD') AS date,
          event_type,
          count(*)::int AS count
        FROM analytics_events
        WHERE project_id = ${projectId}
          AND created_at >= ${since}
        GROUP BY date, event_type
        ORDER BY date ASC
      `);

      const rows = (result as unknown as { rows: Array<{ date: string; event_type: string; count: number }> }).rows;

      // Pivot rows into { date, session_start: N, message_sent: N, ... } format
      const dailyMap = new Map<string, { date: string; [key: string]: unknown }>();
      for (const row of rows) {
        if (!dailyMap.has(row.date)) {
          dailyMap.set(row.date, { date: row.date });
        }
        dailyMap.get(row.date)![row.event_type] = row.count;
      }

      return Array.from(dailyMap.values()).sort(
        (a, b) => a.date.localeCompare(b.date),
      );
    },

    async feedbackCounts(projectId: string): Promise<{ positive: number; negative: number }> {
      const result = await db.execute(sql`
        SELECT
          COALESCE(
            sum(CASE WHEN metadata->>'feedback' = 'positive' THEN 1 ELSE 0 END),
            0
          )::int AS positive,
          COALESCE(
            sum(CASE WHEN metadata->>'feedback' = 'negative' THEN 1 ELSE 0 END),
            0
          )::int AS negative
        FROM analytics_events
        WHERE project_id = ${projectId}
          AND event_type = 'feedback_given'
      `);

      const row = (result as unknown as { rows: Array<{ positive: number; negative: number }> }).rows[0];
      return {
        positive: row?.positive ?? 0,
        negative: row?.negative ?? 0,
      };
    },
  };
}
