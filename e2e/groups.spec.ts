import { test, expect } from '@playwright/test';

// Collapsed neighbourhoods (families) render as a flat bracket + chip above the band. Clicking one
// opens an explainer card (what the band name means + typical uses) — it does not zoom.

test('clicking a group chip opens its explainer card; Esc closes it', async ({ page }) => {
	// All layers on: the ELF family's members live outside the default (consumer-only) view.
	await page.goto('/?layers=consumer,amateur,navigation,gov,science');
	await page.waitForSelector('#explorer');

	// The full-spectrum view collapses the dense radio bands into family chips (ELF, VLF/LF, …).
	await page.locator('.marker.group', { hasText: 'ELF' }).click();

	const card = page.getByRole('dialog', { name: 'Spectrum band details' });
	await expect(card).toBeVisible();
	await expect(card.getByText('Spectrum neighbourhood')).toBeVisible();
	await expect(card.getByText('Extremely low frequency')).toBeVisible();

	// Opening the card does not change the view (no zoom applied to the URL).
	await expect(page).not.toHaveURL(/z=/);

	// Esc closes the card.
	await page.keyboard.press('Escape');
	await expect(card).toBeHidden();
});
