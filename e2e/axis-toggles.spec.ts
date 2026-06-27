import { test, expect } from '@playwright/test';

test('scientific-notation toggle adds 10ⁿ labels to the axis', async ({ page }) => {
	await page.goto('/');

	// Baseline: ticks read as named decades, no power-of-ten suffix.
	await expect(page.locator('text.tick-label', { hasText: '1 MHz' })).toBeVisible();
	await expect(page.locator('text.tick-label', { hasText: '· 10' })).toHaveCount(0);

	await page.getByRole('switch', { name: /Scientific notation/ }).click();

	// Majors gain a sci-notation suffix; minors gain bare 10ⁿ labels.
	await expect(page.locator('text.tick-label', { hasText: '1 MHz · 10⁶' })).toBeVisible();
	await expect(page.locator('text.tick-label.minor')).not.toHaveCount(0);
});

test('wavelength toggle adds a λ row to the axis', async ({ page }) => {
	await page.goto('/');

	await expect(page.locator('text.lambda-label')).toHaveCount(0);

	await page.getByRole('switch', { name: /Wavelength/ }).click();

	await expect(page.locator('text.lambda-axis', { hasText: 'λ →' })).toBeVisible();
	await expect(page.locator('text.lambda-label')).not.toHaveCount(0);
});

test('theme toggle flips the document data-theme attribute', async ({ page }) => {
	await page.goto('/');

	const html = page.locator('html');
	await expect(html).toHaveAttribute('data-theme', 'dark');

	await page.getByRole('button', { name: /Toggle light \/ dark/ }).click();
	await expect(html).toHaveAttribute('data-theme', 'light');

	await page.getByRole('button', { name: /Toggle light \/ dark/ }).click();
	await expect(html).toHaveAttribute('data-theme', 'dark');
});
