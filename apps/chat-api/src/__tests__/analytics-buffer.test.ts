import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock database module before importing analytics-buffer
vi.mock('@anima-ai/database', () => {
  const logEventMock = vi.fn().mockResolvedValue({});
  return {
    createDatabase: vi.fn(() => ({})),
    analyticsQueries: vi.fn(() => ({
      logEvent: logEventMock,
    })),
    _logEventMock: logEventMock,
  };
});

// Must import after mock setup
const { queueAnalyticsEvent, flushAnalytics, getBufferLength, clearBuffer, stopAnalyticsBuffer } = await import('../services/analytics-buffer.js');
const { analyticsQueries } = await import('@anima-ai/database');

describe('AnalyticsBuffer', () => {
  beforeEach(() => {
    clearBuffer();
    vi.clearAllMocks();
  });

  afterEach(() => {
    stopAnalyticsBuffer();
    clearBuffer();
  });

  it('queues events without immediate DB call', () => {
    queueAnalyticsEvent({
      projectId: 'proj-1',
      sessionId: 'sess-1',
      eventType: 'message_sent',
    });

    expect(getBufferLength()).toBe(1);
    // No immediate DB call
    const logEvent = analyticsQueries({} as any).logEvent;
    expect(logEvent).not.toHaveBeenCalled();
  });

  it('flushes buffer to DB', async () => {
    queueAnalyticsEvent({
      projectId: 'proj-1',
      sessionId: 'sess-1',
      eventType: 'message_sent',
    });
    queueAnalyticsEvent({
      projectId: 'proj-1',
      sessionId: 'sess-1',
      eventType: 'message_received',
    });

    expect(getBufferLength()).toBe(2);

    await flushAnalytics();

    expect(getBufferLength()).toBe(0);
    const logEvent = analyticsQueries({} as any).logEvent;
    expect(logEvent).toHaveBeenCalledTimes(2);
  });

  it('does nothing on flush when buffer is empty', async () => {
    await flushAnalytics();
    const logEvent = analyticsQueries({} as any).logEvent;
    expect(logEvent).not.toHaveBeenCalled();
  });

  it('re-queues events on flush failure', async () => {
    const logEvent = analyticsQueries({} as any).logEvent as ReturnType<typeof vi.fn>;
    logEvent.mockRejectedValueOnce(new Error('DB error'));

    queueAnalyticsEvent({
      projectId: 'proj-1',
      eventType: 'session_start',
    });

    await flushAnalytics();

    // Events should be re-queued
    expect(getBufferLength()).toBe(1);
  });
});
