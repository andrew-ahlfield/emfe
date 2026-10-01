import { test, expect, type Page } from '@playwright/test';

/**
 * Live smoke test: exercises the *deployed* app (see playwright.smoke.config.ts for the target).
 * The bar is "loads clean and core functionality works", not exhaustive coverage; the unit + local
 * e2e suites own that. Assertions here stick to behaviour that's stable across versions, so this
 * passes against whatever is currently on `dev` and keeps passing after a promotion.
 */

/** Attach console-error / uncaught-error collectors before navigating. */
function collectErrors(page: Page): string[] {
	const errors: string[] = [];
	page.on('console', (msg) => {
		if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
	});
	page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
	return errors;
}

test('loads clean and renders the spectrum', async ({ page }) => {
	const errors = collectErrors(page);

	const resp = await page.goto('/');
	expect(resp?.ok(), `document response was ${resp?.status()}`).toBeTruthy();
	await expect(page).toHaveTitle(/Electromagnetic Spectrum/i);

	// The plot shell is always present (the skip-link target); its contents fill in once the width
	// is measured. A visible axis/label <text> proves the client hydrated and actually drew the plot
	// (the SVG's first child is a non-rendering <defs>, so assert on rendered text instead).
	const explorer = page.locator('#explorer');
	await expect(explorer).toBeVisible();
	await expect(explorer.locator('text').first()).toBeVisible();

	expect(errors, `unexpected runtime errors:\n${errors.join('\n')}`).toEqual([]);
});

test('a shared deep-link reproduces the view (zoom + open card)', async ({ page }) => {
	const errors = collectErrors(page);

	// Only version-stable params: z/c (zoom+centre), layers, and the legacy `sel=` marker selector,
	// which every version honours (the unified `card=` token maps back onto it).
	await page.goto('/?z=5.37&c=13.51&layers=consumer,science&sel=wifi');

	// Zoomed in → the reset affordance is present.
	await expect(page.getByRole('button', { name: 'reset zoom' })).toBeVisible();

	// The marker's details card is open and shows the selected allocation.
	const card = page.getByRole('dialog', { name: 'Allocation details' });
	await expect(card).toBeVisible();
	await expect(card.getByText(/Wi-?Fi/i).first()).toBeVisible();

	expect(errors, `unexpected runtime errors:\n${errors.join('\n')}`).toEqual([]);
});

test('core controls respond: a content-layer toggle flips', async ({ page }) => {
	await page.goto('/');

	// Gov / satellite is off in the first-open view; clicking it turns it on.
	const gov = page.getByRole('switch', { name: /Gov \/ satellite/ });
	await expect(gov).toHaveAttribute('aria-checked', 'false');
	await gov.click();
	await expect(gov).toHaveAttribute('aria-checked', 'true');
});
