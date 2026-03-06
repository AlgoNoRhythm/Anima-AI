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

test.describe('Public Chat', () => {
  test('public chat page renders for a real project', async ({ page }) => {
    const { slug } = await setupAuthAndProject(page, {
      name: 'Public Chat Project',
      slug: `public-chat-${Date.now()}`,
    });

    await page.goto(`/c/${slug}`);
    await expect(page.getByText(/hello.*how can i help/i)).toBeVisible();
  });

  test('chat page shows personality name in header', async ({ page }) => {
    const { slug } = await setupAuthAndProject(page, {
      name: 'Chat Header Test',
      slug: `chat-header-${Date.now()}`,
    });

    await page.goto(`/c/${slug}`);
    await expect(page.getByText('Default Assistant')).toBeVisible();
  });

  test('chat input is visible', async ({ page }) => {
    const { slug } = await setupAuthAndProject(page, {
      name: 'Chat Input Project',
      slug: `chat-input-${Date.now()}`,
    });

    await page.goto(`/c/${slug}`);
    await expect(page.getByLabel('Type your message')).toBeVisible();
    await expect(page.getByLabel('Send message')).toBeVisible();
  });

  test('can type in chat input', async ({ page }) => {
    const { slug } = await setupAuthAndProject(page, {
      name: 'Chat Type Project',
      slug: `chat-type-${Date.now()}`,
    });

    await page.goto(`/c/${slug}`);

    const input = page.getByLabel('Type your message');
    await input.click();
    await input.fill('How do I clean the filter?');
    await expect(input).toHaveValue('How do I clean the filter?');
  });

  test('chat page shows welcome message when no messages', async ({ page }) => {
    const { slug } = await setupAuthAndProject(page, {
      name: 'Chat Welcome Project',
      slug: `chat-welcome-${Date.now()}`,
    });

    await page.goto(`/c/${slug}`);
    await expect(page.getByText('Ask me anything.')).toBeVisible();
  });

  test('can send a message and receive a streamed response', async ({ page }) => {
    const { slug } = await setupAuthAndProject(page, {
      name: 'Chat Send Receive',
      slug: `chat-send-${Date.now()}`,
    });

    const sseBody = [
      'data: {"type":"start","messageId":"mock-msg-1"}\n\n',
      'data: {"type":"text","content":"The filter "}\n\n',
      'data: {"type":"text","content":"should be cleaned "}\n\n',
      'data: {"type":"text","content":"every month."}\n\n',
      'data: {"type":"citations","citations":[{"documentTitle":"User Manual","pageNumbers":[3],"text":"Clean the filter monthly."}]}\n\n',
      'data: {"type":"done"}\n\n',
    ].join('');

    await mockChatEndpoints(page, sseBody);

    await page.goto(`/c/${slug}`);
    await expect(page.getByText('Ask me anything.')).toBeVisible();

    await dismissDisclaimer(page);

    // Type and send a message
    const input = page.getByLabel('Type your message');
    await input.click();
    await input.fill('How do I clean the filter?');
    await expect(input).toHaveValue('How do I clean the filter?');
    await page.getByLabel('Send message').click();

    // User message should appear
    await expect(page.getByText('How do I clean the filter?')).toBeVisible({ timeout: 10000 });

    // Assistant response should stream in
    await expect(page.getByText('The filter should be cleaned every month.')).toBeVisible({ timeout: 15000 });

    // Citation should appear (collapsed by default — look for sources toggle)
    await expect(page.getByText('1 source')).toBeVisible({ timeout: 5000 });

    // Input should be cleared and re-enabled for the next message
    await expect(input).toHaveValue('');
    await expect(input).toBeEnabled();
  });

  test('shows user and assistant messages with correct styling', async ({ page }) => {
    const { slug } = await setupAuthAndProject(page, {
      name: 'Chat Styling Test',
      slug: `chat-style-${Date.now()}`,
    });

    const sseBody = [
      'data: {"type":"start","messageId":"mock-msg-2"}\n\n',
      'data: {"type":"text","content":"I can help with that!"}\n\n',
      'data: {"type":"done"}\n\n',
    ].join('');

    await mockChatEndpoints(page, sseBody);

    await page.goto(`/c/${slug}`);

    await dismissDisclaimer(page);

    // Send a message
    const input = page.getByLabel('Type your message');
    await input.click();
    await input.fill('Hello there');
    await expect(input).toHaveValue('Hello there');
    await page.getByLabel('Send message').click();

    // User message appears in a right-aligned bubble (flex-row-reverse layout)
    const userBubble = page.locator('.flex-row-reverse').first();
    await expect(userBubble).toBeVisible({ timeout: 10000 });
    await expect(userBubble).toContainText('Hello there');

    // Assistant message appears in a left-aligned bubble with chat-assistant styling
    const assistantBubble = page.locator('.bg-chat-assistant').first();
    await expect(assistantBubble).toBeVisible({ timeout: 15000 });
    await expect(assistantBubble).toContainText('I can help with that!');

    // Feedback buttons (thumbs up/down) should appear on assistant message
    await expect(page.getByLabel('Thumbs up')).toBeVisible();
    await expect(page.getByLabel('Thumbs down')).toBeVisible();
  });

  test('welcome screen disappears after sending first message', async ({ page }) => {
    const { slug } = await setupAuthAndProject(page, {
      name: 'Chat Welcome Gone',
      slug: `chat-gone-${Date.now()}`,
    });

    const sseBody = [
      'data: {"type":"start","messageId":"mock-msg-3"}\n\n',
      'data: {"type":"text","content":"Hello!"}\n\n',
      'data: {"type":"done"}\n\n',
    ].join('');

    await mockChatEndpoints(page, sseBody);

    await page.goto(`/c/${slug}`);
    await expect(page.getByText('Ask me anything.')).toBeVisible();

    await dismissDisclaimer(page);

    // Send a message
    const input = page.getByLabel('Type your message');
    await input.click();
    await input.fill('Hi');
    await expect(input).toHaveValue('Hi');
    await page.getByLabel('Send message').click();

    // Wait for response
    await expect(page.getByText('Hello!')).toBeVisible({ timeout: 10000 });

    // Welcome screen should be gone
    await expect(page.getByText('Ask me anything.')).not.toBeVisible();
  });

  test('non-existent project slug shows 404', async ({ page }) => {
    await page.goto('/c/this-project-does-not-exist-xyz-123');
    const response = await page.request.get('/c/this-project-does-not-exist-xyz-123');
    expect(response.status()).toBe(404);
  });
});
