import { test, expect } from '@playwright/test';

test('operator-licence selector switches the held class', async ({ page }) => {
	await page.goto('/');

	const group = page.getByRole('radiogroup', { name: 'Operator licence' });
	await expect(group).toBeVisible();

	// Defaults to Amateur Extra (full privileges).
	const general = group.getByRole('radio', { name: /General/ });
	const extra = group.getByRole('radio', { name: /Amateur Extra/ });
	await expect(extra).toBeChecked();
	await expect(general).not.toBeChecked();

	// Selecting another class moves the checked state.
	await general.click();
	await expect(general).toBeChecked();
	await expect(extra).not.toBeChecked();
});

test('licence selector dims when the amateur layer is off; a click turns the layer back on', async ({
	page
}) => {
	await page.goto('/');
	const amateur = page.getByRole('switch', { name: /Amateur \+ unlicensed/ });
	const group = page.getByRole('radiogroup', { name: 'Operator licence' });

	// Hide the amateur layer → the licence selector dims (it has nothing to act on).
	await amateur.click();
	await expect(amateur).toHaveAttribute('aria-checked', 'false');
	await expect(group).toHaveClass(/dimmed/);

	// Clicking a class while dimmed switches the amateur layer back on and selects the class.
	await group.getByRole('radio', { name: /General/ }).click();
	await expect(amateur).toHaveAttribute('aria-checked', 'true');
	await expect(group).not.toHaveClass(/dimmed/);
	await expect(group.getByRole('radio', { name: /General/ })).toBeChecked();
});
