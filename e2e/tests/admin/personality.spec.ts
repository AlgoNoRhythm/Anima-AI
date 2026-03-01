import { test, expect } from '@playwright/test';
import { setupAuthAndProject } from '../../fixtures/project-helpers';

test.describe('Personality', () => {
  test('personality page renders for a real project', async ({ page }) => {
    const { projectId } = await setupAuthAndProject(page, {
      name: 'Personality Test Project',
      slug: `personality-test-${Date.now()}`,
    });

    await page.goto(`/projects/${projectId}/personality`);

    await expect(page.locator('h1')).toContainText('Personality');
  });

  test('personality page has system prompt textarea', async ({ page }) => {
    const { projectId } = await setupAuthAndProject(page, {
      name: 'Personality Form Project',
      slug: `personality-form-${Date.now()}`,
    });

    await page.goto(`/projects/${projectId}/personality`);

    // The system prompt textarea
    await expect(page.locator('#system-prompt')).toBeVisible();
  });

  test('personality page has Save Personality button', async ({ page }) => {
    const { projectId } = await setupAuthAndProject(page, {
      name: 'Personality Save Project',
      slug: `personality-save-${Date.now()}`,
    });

    await page.goto(`/projects/${projectId}/personality`);

    await expect(page.getByRole('button', { name: /save personality/i })).toBeVisible();
  });

  test('personality page has model configuration section', async ({ page }) => {
    const { projectId } = await setupAuthAndProject(page, {
      name: 'Personality Model Project',
      slug: `personality-model-${Date.now()}`,
    });

    await page.goto(`/projects/${projectId}/personality`);

    await expect(page.getByText('Model Configuration')).toBeVisible();
  });
});
