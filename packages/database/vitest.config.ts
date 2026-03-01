import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run test files sequentially — they share a single Postgres test database
    fileParallelism: false,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
