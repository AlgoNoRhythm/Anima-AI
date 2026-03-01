import { test, expect } from '@playwright/test';
import { setupAuthAndProject } from '../../fixtures/project-helpers';

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

    await page.goto(`/c/${slug}`);
    await expect(page.getByText('Ask me anything.')).toBeVisible();

    // Dismiss the disclaimer banner if present
    const dismissBtn = page.getByLabel('Dismiss disclaimer');
    if (await dismissBtn.isVisible().catch(() => false)) {
      await dismissBtn.click();
    }

    // Intercept the chat SSE endpoint to return a mock streamed response
    await page.route(/\/api\/chat\//, async (route) => {
      const sseBody = [
        'data: {"type":"start","messageId":"mock-msg-1"}\n\n',
        'data: {"type":"text","content":"The filter "}\n\n',
        'data: {"type":"text","content":"should be cleaned "}\n\n',
        'data: {"type":"text","content":"every month."}\n\n',
        'data: {"type":"citations","citations":[{"documentTitle":"User Manual","pageNumbers":[3],"text":"Clean the filter monthly."}]}\n\n',
        'data: {"type":"done"}\n\n',
      ].join('');

      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: {
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
        body: sseBody,
      });
    });

    // Type and send a message
    const input = page.getByLabel('Type your message');
    await input.click();
    await input.fill('How do I clean the filter?');
    await expect(input).toHaveValue('How do I clean the filter?');
    await page.getByLabel('Send message').click();

    // User message should appear
    await expect(page.getByText('How do I clean the filter?')).toBeVisible({ timeout: 10000 });

    // Assistant response should stream in
    await expect(page.getByText('The filter should be cleaned every month.')).toBeVisible({ timeout: 10000 });

    // Citation should appear
    await expect(page.getByText('User Manual')).toBeVisible();

    // Input should be cleared and re-enabled for the next message
    await expect(input).toHaveValue('');
    await expect(input).toBeEnabled();
  });

  test('shows user and assistant messages with correct styling', async ({ page }) => {
    const { slug } = await setupAuthAndProject(page, {
      name: 'Chat Styling Test',
      slug: `chat-style-${Date.now()}`,
    });

    await page.goto(`/c/${slug}`);

    // Dismiss the disclaimer banner if present
    const dismissBtn = page.getByLabel('Dismiss disclaimer');
    if (await dismissBtn.isVisible().catch(() => false)) {
      await dismissBtn.click();
    }

    // Mock the chat endpoint
    await page.route(/\/api\/chat\//, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: [
          'data: {"type":"start","messageId":"mock-msg-2"}\n\n',
          'data: {"type":"text","content":"I can help with that!"}\n\n',
          'data: {"type":"done"}\n\n',
        ].join(''),
      });
    });

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
    await expect(assistantBubble).toBeVisible({ timeout: 10000 });
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

    await page.goto(`/c/${slug}`);
    await expect(page.getByText('Ask me anything.')).toBeVisible();

    // Dismiss the disclaimer banner if present
    const dismissBtn = page.getByLabel('Dismiss disclaimer');
    if (await dismissBtn.isVisible().catch(() => false)) {
      await dismissBtn.click();
    }

    // Mock chat endpoint
    await page.route(/\/api\/chat\//, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: [
          'data: {"type":"start","messageId":"mock-msg-3"}\n\n',
          'data: {"type":"text","content":"Hello!"}\n\n',
          'data: {"type":"done"}\n\n',
        ].join(''),
      });
    });

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
