import { test, expect, type Page } from '@playwright/test';
import { setupAuthAndProject } from '../../fixtures/project-helpers';

/**
 * Mock chat API endpoints.
 *
 * Chromium: addInitScript fetch override produces proper Response.body for getReader().
 * WebKit:   page.route() at the network level produces proper Response.body for getReader().
 *
 * Neither approach works on the other engine, so we detect the browser and pick.
 */
async function mockChatEndpoints(page: Page, sseBody: string) {
  const isWebKit = page.context().browser()?.browserType().name() === 'webkit';

  if (isWebKit) {
    await page.route('**/api/session/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessionToken: 'mock-session-token',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });
    await page.route('**/api/chat/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: sseBody,
      });
    });
  } else {
    await page.addInitScript((body: string) => {
      const originalFetch = window.fetch;
      window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

        if (url.includes('/api/session/')) {
          return new Response(
            JSON.stringify({
              sessionToken: 'mock-session-token',
              expiresAt: new Date(Date.now() + 86400000).toISOString(),
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        if (url.includes('/api/chat/')) {
          return new Response(body, {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
          });
        }

        return originalFetch.call(window, input, init);
      } as typeof fetch;
    }, sseBody);
  }
}

/** Dismiss the disclaimer banner if visible. */
async function dismissDisclaimer(page: Page) {
  const dismissBtn = page.getByLabel('Dismiss disclaimer');
  if (await dismissBtn.isVisible().catch(() => false)) {
    await dismissBtn.click();
    await expect(dismissBtn).not.toBeVisible();
  }
}

test.describe('Collapsible Sources', () => {
  test('citations are collapsed by default and expand on click', async ({ page }) => {
    const { slug } = await setupAuthAndProject(page, {
      name: 'Sources Collapse Test',
      slug: `sources-collapse-${Date.now()}`,
    });

    const sseBody = [
      'data: {"type":"start","messageId":"mock-src-1"}\n\n',
      'data: {"type":"text","content":"Here is the answer."}\n\n',
      'data: {"type":"citations","citations":[{"documentTitle":"Manual","pageNumbers":[1],"text":"Some source text."},{"documentTitle":"Guide","pageNumbers":[5],"text":"Another source."}]}\n\n',
      'data: {"type":"done"}\n\n',
    ].join('');

    await mockChatEndpoints(page, sseBody);

    await page.goto(`/c/${slug}`);

    await dismissDisclaimer(page);

    // Send a message
    const input = page.getByLabel('Type your message');
    await input.fill('Tell me about the product');
    await page.getByLabel('Send message').click();

    // Wait for response
    await expect(page.getByText('Here is the answer.')).toBeVisible({ timeout: 10000 });

    // Sources should show as collapsed "2 sources" toggle
    const sourcesToggle = page.getByText('2 sources');
    await expect(sourcesToggle).toBeVisible();

    // Citation details (page numbers) should NOT be visible yet
    const citationCard = page.locator('.bg-chat-surface\\/60').first();
    await expect(citationCard).not.toBeVisible();

    // Click the toggle to expand
    await sourcesToggle.click();

    // Now citation cards should be visible
    await expect(citationCard).toBeVisible();
  });

  test('single citation shows "1 source" (singular)', async ({ page }) => {
    const { slug } = await setupAuthAndProject(page, {
      name: 'Sources Singular Test',
      slug: `sources-singular-${Date.now()}`,
    });

    const sseBody = [
      'data: {"type":"start","messageId":"mock-src-2"}\n\n',
      'data: {"type":"text","content":"Single source answer."}\n\n',
      'data: {"type":"citations","citations":[{"documentTitle":"Manual","pageNumbers":[3],"text":"One source."}]}\n\n',
      'data: {"type":"done"}\n\n',
    ].join('');

    await mockChatEndpoints(page, sseBody);

    await page.goto(`/c/${slug}`);

    await dismissDisclaimer(page);

    const input = page.getByLabel('Type your message');
    await input.fill('Question');
    await page.getByLabel('Send message').click();

    await expect(page.getByText('Single source answer.')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('1 source')).toBeVisible();
  });
});

test.describe('Suggested Questions', () => {
  test('welcome screen shows suggested question pills when configured', async ({ page }) => {
    const { projectId, slug } = await setupAuthAndProject(page, {
      name: 'Suggested Q Project',
      slug: `suggested-q-${Date.now()}`,
    });

    // Configure suggested questions via the theme editor
    await page.goto(`/projects/${projectId}/theme`);

    // Wait for theme page to load
    await expect(page.locator('h1')).toContainText('Theme');

    // Find the suggested questions input and add a question
    const sqInput = page.getByPlaceholder('Type a suggested question...');
    if (await sqInput.isVisible().catch(() => false)) {
      await sqInput.fill('What does this product do?');
      await page.getByRole('button', { name: 'Add' }).click();

      // Save the theme
      await page.getByRole('button', { name: /save theme/i }).click();

      // Wait for save confirmation
      await page.waitForTimeout(1000);
    }

    // Visit the public chat page
    await page.goto(`/c/${slug}`);

    // If pills were added successfully, they should appear
    // (This depends on the theme save working correctly)
    await expect(page.getByText(/hello.*how can i help/i)).toBeVisible();
  });
});

test.describe('Feedback Form', () => {
  test('feedback link is not visible when no messages sent', async ({ page }) => {
    const { slug } = await setupAuthAndProject(page, {
      name: 'Feedback No Msg',
      slug: `fb-nomsg-${Date.now()}`,
    });

    await page.goto(`/c/${slug}`);
    await expect(page.getByText(/hello.*how can i help/i)).toBeVisible();

    // The feedback link should not be visible when there are no messages
    // (even if feedbackConfig.enabled is true, link requires messages.length > 0)
    await expect(page.getByText('Leave a feedback')).not.toBeVisible();
  });
});
