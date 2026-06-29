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

test('assignment tier rides the band: carrier bars always, designated ticks on zoom', async ({
	page
}) => {
	await page.goto('/');
	await page.waitForSelector('#explorer');

	// Carrier/operator holdings show as bars over the band at any zoom.
	const bars = page.locator('.assignments .op');
	await expect.poll(() => bars.count()).toBeGreaterThan(0);

	// Designated single frequencies are a deep-zoom landmark — zoom onto 146.52 MHz (the 2 m
	// calling frequency, log10 ≈ 8.166) and its tick appears.
	await page.goto('/?z=1500&c=8.166');
	await page.waitForSelector('#explorer');
	const ticks = page.locator('.assignments .pin');
	await expect.poll(() => ticks.count()).toBeGreaterThan(0);

	// The master switch hides the whole tier.
	await page.locator('.assignment-col .master').click();
	await expect(page.locator('.assignments .op')).toHaveCount(0);
});

test('clicking an allocation band opens an info card explaining the service', async ({ page }) => {
	// Zoom into VHF/UHF so bands are wide enough to be clickable.
	await page.goto('/?z=22&c=8.12');
	await page.waitForSelector('#explorer');

	await page.locator('.substrate .tile.interactive').first().click();
	const card = page.getByRole('dialog', { name: 'Allocation details' });
	await expect(card).toBeVisible();
	await expect(card.getByText('Allocated to')).toBeVisible();
	await expect(card.getByText('What this means')).toBeVisible();

	// Esc closes it.
	await page.keyboard.press('Escape');
	await expect(card).toBeHidden();
});
