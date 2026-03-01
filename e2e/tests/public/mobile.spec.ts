import { test, expect } from '@playwright/test';
import { setupAuthAndProject } from '../../fixtures/project-helpers';

test.describe('Mobile Chat', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('chat renders on mobile viewport', async ({ page }) => {
    const { slug } = await setupAuthAndProject(page, {
      name: 'Mobile Chat Project',
      slug: `mobile-chat-${Date.now()}`,
    });

    await page.goto(`/c/${slug}`);

    // Input should be visible on mobile
    await expect(page.getByLabel('Type your message')).toBeVisible();
  });

  test('chat input is sticky at bottom on mobile', async ({ page }) => {
    const { slug } = await setupAuthAndProject(page, {
      name: 'Mobile Sticky Project',
      slug: `mobile-sticky-${Date.now()}`,
    });

    await page.goto(`/c/${slug}`);

    const input = page.getByLabel('Type your message');
    const box = await input.boundingBox();
    expect(box).not.toBeNull();

    // Input should be in the lower half of the 667px viewport
    expect(box!.y).toBeGreaterThan(300);
  });

  test('personality name is visible in mobile header', async ({ page }) => {
    const { slug } = await setupAuthAndProject(page, {
      name: 'Mobile Header Project',
      slug: `mobile-header-${Date.now()}`,
    });

    await page.goto(`/c/${slug}`);

    // The header shows the default personality name
    await expect(page.getByText('Default Assistant')).toBeVisible();
  });
});
