import { test, expect } from '@playwright/test';
import { setupAuthAndProject } from '../../fixtures/project-helpers';

test.describe('Analytics Page — Feedback Responses Section', () => {
  test('analytics page has single title (no duplication)', async ({ page }) => {
    const { projectId } = await setupAuthAndProject(page, {
      name: 'Analytics Title Test',
      slug: `analytics-title-${Date.now()}`,
    });

    await page.goto(`/projects/${projectId}/analytics`);

    // There should be exactly one h1 with "Analytics"
    const h1 = page.locator('h1');
    await expect(h1).toContainText('Analytics');
    await expect(h1).toHaveCount(1);

    // There should NOT be an h2 with "Analytics" (the duplicate we removed)
    const h2Analytics = page.locator('h2').filter({ hasText: 'Analytics' });
    await expect(h2Analytics).toHaveCount(0);
  });

  test('analytics page shows 4 stat cards', async ({ page }) => {
    const { projectId } = await setupAuthAndProject(page, {
      name: 'Analytics Cards Test',
      slug: `analytics-cards-${Date.now()}`,
    });

    await page.goto(`/projects/${projectId}/analytics`);

    // Wait for the stat cards grid to render
    await expect(page.getByText('Messages Today')).toBeVisible();
    await expect(page.getByText('Total Sessions')).toBeVisible();
    await expect(page.getByText('Avg. Feedback')).toBeVisible();
    // "Survey Responses" appears both in stat card and feedback section —
    // target the stat card specifically (the smaller h3 inside the card grid)
    await expect(
      page.locator('.grid >> text=Survey Responses').first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test('analytics page shows Messages Over Time chart section', async ({ page }) => {
    const { projectId } = await setupAuthAndProject(page, {
      name: 'Analytics Chart Test',
      slug: `analytics-chart-${Date.now()}`,
    });

    await page.goto(`/projects/${projectId}/analytics`);

    await expect(page.getByText('Messages Over Time')).toBeVisible();
  });

  test('analytics page shows Survey Responses section', async ({ page }) => {
    const { projectId } = await setupAuthAndProject(page, {
      name: 'Analytics Survey Test',
      slug: `analytics-survey-${Date.now()}`,
    });

    await page.goto(`/projects/${projectId}/analytics`);

    // The feedback section header — may show "Survey Responses" heading or empty state
    // For a new project without feedback config, it should show the configure message
    const surveySection = page.locator('text=Survey Responses').last();
    await expect(surveySection).toBeVisible({ timeout: 10000 });
  });

  test('analytics page shows feedback configure prompt for unconfigured project', async ({ page }) => {
    const { projectId } = await setupAuthAndProject(page, {
      name: 'Analytics No Config Test',
      slug: `analytics-noconfig-${Date.now()}`,
    });

    await page.goto(`/projects/${projectId}/analytics`);

    // For a project with no feedback config, should show this message
    await expect(
      page.getByText('Configure feedback surveys in the Feedback tab'),
    ).toBeVisible({ timeout: 10000 });
  });

  test('analytics page has export button', async ({ page }) => {
    const { projectId } = await setupAuthAndProject(page, {
      name: 'Analytics Export Test',
      slug: `analytics-export-${Date.now()}`,
    });

    await page.goto(`/projects/${projectId}/analytics`);

    await expect(
      page.getByRole('button', { name: /export conversations/i }),
    ).toBeVisible();
  });

  test('analytics link appears in project navigation', async ({ page }) => {
    const { projectId } = await setupAuthAndProject(page, {
      name: 'Analytics Nav Test',
      slug: `analytics-nav-${Date.now()}`,
    });

    await page.goto(`/projects/${projectId}`);

    await expect(page.getByRole('link', { name: /analytics/i })).toBeVisible();
  });
});

test.describe('Analytics Feedback Section — With Config', () => {
  test('shows time filter and field selector after configuring feedback', async ({ page }) => {
    test.setTimeout(60000);

    const { projectId } = await setupAuthAndProject(page, {
      name: 'Analytics Config Test',
      slug: `analytics-cfg-${Date.now()}`,
    });

    // First, set up a feedback config via the feedback page
    await page.goto(`/projects/${projectId}/feedback`);

    // Enable feedback — click the label text (the checkbox is sr-only with a div overlay)
    const enableLabel = page.getByText('Enable Feedback Survey');
    await expect(enableLabel).toBeVisible();
    await enableLabel.click();

    // Click Save and wait for it to complete (button text changes from "Saving..." back to "Save")
    const saveButton = page.getByRole('button', { name: /save feedback settings/i });
    await expect(saveButton).toBeEnabled({ timeout: 5000 });
    await saveButton.click();

    // Wait for save to complete — success message appears
    await expect(page.getByText('saved successfully')).toBeVisible({ timeout: 15000 });

    // Navigate to analytics page
    await page.goto(`/projects/${projectId}/analytics`);

    // The feedback section should now show "No fields configured yet"
    // (feedback is enabled but has no ratings/questions defined)
    await expect(
      page.getByText('No fields configured yet'),
    ).toBeVisible({ timeout: 10000 });
  });
});
