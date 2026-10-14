import { expect, test } from '@playwright/test';

test.describe('Home page', () => {
  test('shows shell, hero, sections, footer', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/BookVerse/);
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('search')).toBeVisible();
    await expect(page.getByRole('heading', { name: /বইয়ের পাতা/i })).toBeVisible();
    await expect(page.locator('#features')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });

  test('hydrates the buy button', async ({ page }) => {
    await page.goto('/');
    const button = page.getByRole('button', { name: /Buy · starter-kit/i });
    await expect(button).toBeVisible();
    await button.click();
    await expect(page.getByRole('button', { name: /Added · starter-kit/i })).toBeVisible();
  });

  test('design guide in dev', async ({ page }) => {
    await page.goto('/design');
    await expect(page.getByRole('heading', { name: /Fresh & Human shell/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /WCAG AA contrast/i })).toBeVisible();
  });
});
