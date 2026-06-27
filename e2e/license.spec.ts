import { test, expect } from '@playwright/test';

test('operator-licence selector switches the held class', async ({ page }) => {
	await page.goto('/');

	const group = page.getByRole('radiogroup', { name: 'Operator licence' });
	await expect(group).toBeVisible();

	// Defaults to General (the class that opens most HF bands).
	const general = group.getByRole('radio', { name: /General/ });
	const extra = group.getByRole('radio', { name: /Amateur Extra/ });
	await expect(general).toBeChecked();
	await expect(extra).not.toBeChecked();

	// Selecting another class moves the checked state.
	await extra.click();
	await expect(extra).toBeChecked();
	await expect(general).not.toBeChecked();
});
