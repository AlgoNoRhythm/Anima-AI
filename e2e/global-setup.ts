import type { FullConfig } from '@playwright/test';

async function globalSetup(_config: FullConfig) {
  console.log('E2E Global Setup: Preparing test environment...');

  // Set test environment variables
  // PostgreSQL must be running: docker compose -f docker/docker-compose.local.yml up -d
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://anima:anima@localhost:5432/anima';
  process.env.REDIS_URL = '';
  process.env.OPENAI_API_KEY = 'test-key';
  process.env.ANTHROPIC_API_KEY = 'test-key';
  process.env.AUTH_SECRET = 'e2e-test-secret-at-least-32-chars-long-dev';
  process.env.NEXTAUTH_URL = process.env.BASE_URL || (process.env.CI ? 'http://localhost:3002' : 'http://localhost:3000');

  // Store test credentials for use in auth fixture
  process.env.TEST_USER_EMAIL = 'demo@anima-ai.dev';
  process.env.TEST_USER_PASSWORD = 'password123';
}

export default globalSetup;
