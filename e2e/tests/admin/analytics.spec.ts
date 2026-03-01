import { test, expect } from '@playwright/test';
import { setupAuthAndProject } from '../../fixtures/project-helpers';

test.describe('Analytics', () => {
  test('analytics page renders for a real project', async ({ page }) => {
    const { projectId } = await setupAuthAndProject(page, {
      name: 'Analytics Test Project',
      slug: `analytics-test-${Date.now()}`,
    });

    await page.goto(`/projects/${projectId}/analytics`);

    // Page heading
    await expect(page.locator('h1')).toContainText('Analytics');

    // Stat cards rendered by analytics-charts
    await expect(page.getByText('Messages Today')).toBeVisible();
    await expect(page.getByText('Total Sessions')).toBeVisible();
  });

  test('analytics page shows chart placeholder when no data', async ({ page }) => {
    const { projectId } = await setupAuthAndProject(page, {
      name: 'Analytics Empty Project',
      slug: `analytics-empty-${Date.now()}`,
    });

    await page.goto(`/projects/${projectId}/analytics`);
    // The chart area shows a placeholder when there's no data
    await expect(page.getByText(/chart will appear when data is available/i)).toBeVisible();
  });
});
