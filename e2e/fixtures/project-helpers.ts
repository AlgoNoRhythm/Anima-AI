import { type Page } from '@playwright/test';
import { registerAndLogin } from './auth';

/**
 * Creates a test project via the UI form and returns the project ID extracted
 * from the redirect URL.
 */
export async function createTestProject(
  page: Page,
  options: { name?: string; slug?: string } = {},
): Promise<{ projectId: string; slug: string }> {
  const slug = options.slug ?? `e2e-test-${Date.now()}`;
  const name = options.name ?? 'E2E Test Project';

  await page.goto('/projects/new');
  await page.fill('input[name="name"]', name);
  await page.fill('input[name="slug"]', slug);
  await page.selectOption('select[name="mode"]', 'both');
  await page.click('button[type="submit"]');

  // Wait for redirect to project overview: /projects/[uuid] (NOT /projects/new)
  // The project ID is a UUID (8-4-4-4-12 hex chars), so we match that pattern.
  await page.waitForURL(
    (url) => {
      const pathname = new URL(url).pathname;
      // Match /projects/<uuid> but NOT /projects/new or /projects/new?error=...
      return /\/projects\/[0-9a-f-]{36}$/.test(pathname);
    },
    { timeout: 15000 },
  );

  const url = page.url();
  const match = url.match(/\/projects\/([0-9a-f-]{36})$/);
  if (!match) {
    throw new Error(`Could not extract project ID from URL: ${url}`);
  }
  const projectId = match[1]!;
  return { projectId, slug };
}

/**
 * Convenience: register+login then create a test project.
 * Returns the projectId and slug for use in tests.
 */
export async function setupAuthAndProject(
  page: Page,
  options: { name?: string; slug?: string } = {},
): Promise<{ projectId: string; slug: string }> {
  await registerAndLogin(page);
  return createTestProject(page, options);
}
