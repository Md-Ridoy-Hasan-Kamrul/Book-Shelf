import { expect, test } from '@playwright/test';

test.describe('Home page', () => {
  test('shows shell, hero, sections, footer', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/BookVerse/);
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('search')).toBeVisible();
    await expect(page.getByRole('heading', { name: /বাংলাদেশের বইয়ের ঘর/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /অনলাইনে পড়ুন/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Mood discovery/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /নতুন বই/i })).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });

  test('hydrates the mood picker', async ({ page }) => {
    await page.goto('/');
    const happy = page.getByRole('button', { name: /খুশি \(Happy\)/i });
    await expect(happy).toBeVisible();
    await happy.click();
    await expect(page).toHaveURL(/\/mood/);
  });

  test('design guide in dev', async ({ page }) => {
    await page.goto('/design');
    await expect(page.getByRole('heading', { name: /Fresh & Human shell/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /WCAG AA contrast/i })).toBeVisible();
  });
});
