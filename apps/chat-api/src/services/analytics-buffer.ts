import { createDatabase, analyticsQueries } from '@anima-ai/database';
import { createLogger } from '@anima-ai/shared';

const log = createLogger('analytics-buffer');

interface AnalyticsEvent {
  projectId: string;
  sessionId?: string | null;
  eventType: 'session_start' | 'message_sent' | 'message_received' | 'feedback_given' | 'document_viewed' | 'qr_scanned' | 'feedback_survey_submitted';
  metadata?: Record<string, unknown>;
}

const buffer: AnalyticsEvent[] = [];
const FLUSH_INTERVAL = 2_000; // 2 seconds
const MAX_BUFFER = 50;

let flushTimer: ReturnType<typeof setInterval> | null = null;

function startFlushTimer() {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    flushAnalytics().catch((err) => {
      log.error('Analytics flush failed', { error: (err as Error).message });
    });
  }, FLUSH_INTERVAL);
  flushTimer.unref();
}

export function queueAnalyticsEvent(event: AnalyticsEvent): void {
  buffer.push(event);
  startFlushTimer();
  if (buffer.length >= MAX_BUFFER) {
    flushAnalytics().catch((err) => {
      log.error('Analytics flush failed', { error: (err as Error).message });
    });
  }
}

export async function flushAnalytics(): Promise<void> {
  if (buffer.length === 0) return;

  const batch = buffer.splice(0);
  try {
    const db = createDatabase();
    const queries = analyticsQueries(db);
    // Insert all events in a single batch
    await Promise.all(batch.map((event) => queries.logEvent(event)));
  } catch (err) {
    log.error('Failed to flush analytics batch', {
      count: batch.length,
      error: (err as Error).message,
    });
    // Re-queue failed events (put them back at front)
    buffer.unshift(...batch);
  }
}

export function stopAnalyticsBuffer(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

/** Visible for testing. */
export function getBufferLength(): number {
  return buffer.length;
}

/** Visible for testing — clears buffer without flushing. */
export function clearBuffer(): void {
  buffer.length = 0;
}
