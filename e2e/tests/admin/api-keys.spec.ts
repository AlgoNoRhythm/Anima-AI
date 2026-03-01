import { test, expect } from '@playwright/test';
import { registerAndLogin } from '../../fixtures/auth';

test.describe('API Keys / Settings', () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page);
  });

  test('settings page renders', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('h1')).toContainText('Settings');
  });

  test('settings page has API Keys section', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /api keys/i })).toBeVisible();
  });

  test('settings page has OpenAI API Key field', async ({ page }) => {
    await page.goto('/settings');
    // Use the label element, not a general text match (avoids strict-mode violation)
    await expect(page.locator('label').filter({ hasText: 'OpenAI API Key' }).first()).toBeVisible();
  });

  test('settings page has Anthropic API Key field', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('label').filter({ hasText: 'Anthropic API Key' })).toBeVisible();
  });

  test('settings page has Profile section', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible();
  });
});
