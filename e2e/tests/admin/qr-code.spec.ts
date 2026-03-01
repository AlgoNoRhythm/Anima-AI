import { test, expect } from '@playwright/test';
import { setupAuthAndProject } from '../../fixtures/project-helpers';

test.describe('QR Code', () => {
  test('QR page renders for a real project', async ({ page }) => {
    const { projectId } = await setupAuthAndProject(page, {
      name: 'QR Test Project',
      slug: `qr-test-${Date.now()}`,
    });

    await page.goto(`/projects/${projectId}/qr`);

    await expect(page.locator('h1')).toContainText('QR Code');
  });

  test('QR page has Save Config button', async ({ page }) => {
    const { projectId } = await setupAuthAndProject(page, {
      name: 'QR Generate Project',
      slug: `qr-generate-${Date.now()}`,
    });

    await page.goto(`/projects/${projectId}/qr`);

    await expect(page.getByRole('button', { name: /save config/i })).toBeVisible();
  });

  test('QR page has Download SVG button', async ({ page }) => {
    const { projectId } = await setupAuthAndProject(page, {
      name: 'QR Download SVG Project',
      slug: `qr-svg-${Date.now()}`,
    });

    await page.goto(`/projects/${projectId}/qr`);

    await expect(page.getByRole('button', { name: /download svg/i })).toBeVisible();
  });

  test('QR page has Download PNG button', async ({ page }) => {
    const { projectId } = await setupAuthAndProject(page, {
      name: 'QR Download PNG Project',
      slug: `qr-png-${Date.now()}`,
    });

    await page.goto(`/projects/${projectId}/qr`);

    await expect(page.getByRole('button', { name: /download png/i })).toBeVisible();
  });

  test('QR page has style customization options', async ({ page }) => {
    const { projectId } = await setupAuthAndProject(page, {
      name: 'QR Style Project',
      slug: `qr-style-${Date.now()}`,
    });

    await page.goto(`/projects/${projectId}/qr`);

    // Style section header and Dot Pattern selector
    await expect(page.getByRole('heading', { name: 'Style' })).toBeVisible();
    await expect(page.getByText('Dot Pattern')).toBeVisible();
  });
});
