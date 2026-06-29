import { test, expect } from '@playwright/test';

// The allocation/assignment/application tiers (SPEC §The three tiers). The dock is open by
// default on the desktop viewport, so the controls are directly clickable.

test('allocation substrate renders and its filters drive the ribbon', async ({ page }) => {
	await page.goto('/');
	await page.waitForSelector('#explorer');

	const tiles = page.locator('.substrate rect.fill');
	const base = await tiles.count();
	expect(base).toBeGreaterThan(40); // a gap-free ribbon across the radio/microwave span

	// Hiding a service category drops its tiles.
	await page.locator('.allocation-col .chip', { hasText: 'Broadcasting' }).click();
	await expect.poll(() => tiles.count()).toBeLessThan(base);

	// Federal-only shows strictly fewer than "All" (most US spectrum here is non-federal).
	const afterCat = await tiles.count();
	await page.locator('.allocation-col .seg-btn', { hasText: 'Federal' }).click();
	await expect.poll(() => tiles.count()).toBeLessThan(afterCat);

	// The master switch hides the whole tier.
	await page.locator('.allocation-col .master').click();
	await expect(tiles).toHaveCount(0);
});

test('assignment lane shows designated frequencies and toggles off', async ({ page }) => {
	await page.goto('/');
	await page.waitForSelector('#explorer');

	const pins = page.locator('.assignments .pin');
	await expect.poll(() => pins.count()).toBeGreaterThan(0);

	await page.locator('.assignment-col .master').click();
	await expect(pins).toHaveCount(0);
});
