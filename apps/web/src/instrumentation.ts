import { createLogger } from '@anima-ai/shared';

const log = createLogger('instrumentation');

export async function register() {
  // Only run in the Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const g = globalThis as typeof globalThis & {
      __animaDbMigrated?: boolean;
    };

    if (g.__animaDbMigrated) return;

    try {
      const { waitForDb, seedDevData } = await import('@anima-ai/database');

      // waitForDb() creates the singleton and awaits auto-migration
      await waitForDb();

      // Auto-seed demo user in development so there's always an account ready
      if (process.env.NODE_ENV !== 'production') {
        const db = await waitForDb();
        const seeded = await seedDevData(db);
        if (seeded) {
          log.info('Dev seed: demo account created (see seed.ts for credentials)');
        }
      }

      g.__animaDbMigrated = true;
      log.info('Database migrations completed');
    } catch (err) {
      log.error('Database migration error', { error: err instanceof Error ? err.message : err });
    }
  }
}
