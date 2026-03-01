import { test, expect } from '@playwright/test';
import { setupAuthAndProject } from '../../fixtures/project-helpers';

test.describe('Documents', () => {
  test('documents page renders for a real project', async ({ page }) => {
    const { projectId } = await setupAuthAndProject(page, {
      name: 'Documents Test Project',
      slug: `docs-test-${Date.now()}`,
    });

    await page.goto(`/projects/${projectId}/documents`);

    await expect(page.locator('h1')).toContainText('Documents');
  });

  test('documents page shows upload zone', async ({ page }) => {
    const { projectId } = await setupAuthAndProject(page, {
      name: 'Documents Upload Project',
      slug: `docs-upload-${Date.now()}`,
    });

    await page.goto(`/projects/${projectId}/documents`);

    // The upload zone label contains this text
    await expect(page.getByText('Click or drag to upload PDFs')).toBeVisible();
  });

  test('documents page shows empty state when no documents', async ({ page }) => {
    const { projectId } = await setupAuthAndProject(page, {
      name: 'Documents Empty Project',
      slug: `docs-empty-${Date.now()}`,
    });

    await page.goto(`/projects/${projectId}/documents`);

    // The empty state message
    await expect(page.getByText('No documents yet')).toBeVisible();
  });
});
