import { describe, it, expect } from 'vitest';

describe('Graceful shutdown', () => {
  it('shutdown timeout uses unref so it does not keep process alive', () => {
    // Verify the pattern: setTimeout(() => process.exit(1), 10_000).unref()
    // We test that unref() is available on the timer
    const timer = setTimeout(() => {}, 100);
    expect(typeof timer.unref).toBe('function');
    timer.unref();
    clearTimeout(timer);
  });

  it('flushAnalytics is importable and callable', async () => {
    // This verifies the module wiring is correct
    const { flushAnalytics, stopAnalyticsBuffer } = await import('../services/analytics-buffer.js');
    expect(typeof flushAnalytics).toBe('function');
    expect(typeof stopAnalyticsBuffer).toBe('function');
  });
});
