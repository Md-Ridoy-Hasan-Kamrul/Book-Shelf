import { expect, test } from '@playwright/test';

test.describe('Home page', () => {
	test('shows the navbar, hero, sections, and footer', async ({ page }) => {
		await page.goto('/');

		await expect(page).toHaveTitle(/BookVerse/);
		await expect(page.getByRole('banner')).toBeVisible();
		await expect(page.getByRole('heading', { name: /বইয়ের পাতা/i })).toBeVisible();
		await expect(page.locator('#features')).toBeVisible();
		await expect(page.locator('#how')).toBeVisible();
		await expect(page.getByRole('contentinfo')).toBeVisible();
	});

	test('hydrates the buy button', async ({ page }) => {
		await page.goto('/');
		const button = page.getByRole('button', { name: /Buy · starter-kit/i });
		await expect(button).toBeVisible();
		await button.click();
		await expect(page.getByRole('button', { name: /Added · starter-kit/i })).toBeVisible();
	});

	test('navbar links to design', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Design' }).click();
		await expect(page).toHaveURL(/\/design$/);
		await expect(page.getByRole('heading', { name: /Fresh & Human/i })).toBeVisible();
	});
});
