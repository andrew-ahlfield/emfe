import { test, expect } from '@playwright/test';

test('sources modal opens, lists origins, and closes via Esc with focus returned', async ({
	page
}) => {
	await page.goto('/');

	const trigger = page.getByRole('button', { name: 'Sources' });
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeHidden();

	await trigger.click();
	await expect(dialog).toBeVisible();
	await expect(dialog.getByRole('heading', { name: /Sources & credits/ })).toBeVisible();
	// Credits section carries the app version.
	await expect(dialog).toContainText(/EM Frequency Explorer · v\d+\.\d+\.\d+/);

	// Lists the distinct referenced sources (FCC ToFA, Part 97, NASA EMS at minimum).
	await expect(
		dialog.getByRole('link', { name: /FCC Table of Frequency Allocations/ })
	).toBeVisible();
	await expect(dialog.getByRole('link', { name: /NASA Science/ })).toBeVisible();

	// Esc closes the dialog and returns focus to the trigger.
	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
	await expect(trigger).toBeFocused();
});

test('sources modal closes via the close button and the backdrop', async ({ page }) => {
	await page.goto('/');
	const trigger = page.getByRole('button', { name: 'Sources' });
	const dialog = page.getByRole('dialog');

	await trigger.click();
	await expect(dialog).toBeVisible();
	await dialog.getByRole('button', { name: 'Close' }).click();
	await expect(dialog).toBeHidden();

	// Re-open and dismiss by clicking the backdrop (top-left corner, outside the panel).
	await trigger.click();
	await expect(dialog).toBeVisible();
	await page.mouse.click(5, 5);
	await expect(dialog).toBeHidden();
});
