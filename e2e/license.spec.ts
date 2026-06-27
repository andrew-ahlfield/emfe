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

test('lowering the licence class hides amateur bands on the line', async ({ page }) => {
	await page.goto('/');
	// Zoom into the HF amateur region.
	await page.evaluate(() => {
		const svg = document.querySelector('svg.zoomable')!;
		const r = svg.getBoundingClientRect();
		for (let i = 0; i < 13; i++) {
			svg.dispatchEvent(
				new WheelEvent('wheel', {
					deltaY: -120,
					clientX: r.left + r.width * (6.9 / 24),
					clientY: r.top + r.height / 2,
					bubbles: true,
					cancelable: true
				})
			);
		}
	});

	const fortyM = page.locator('svg g.marker', { hasText: '40 m' });
	await expect(fortyM).toBeVisible(); // default Extra → 40 m (a General/Tech band) shows

	// Unlicensed can't transmit on 40 m → it disappears from the line.
	await page.getByRole('radio', { name: /Unlicensed/ }).click();
	await expect(fortyM).toHaveCount(0);

	// Back to Extra → it returns.
	await page.getByRole('radio', { name: /Amateur Extra/ }).click();
	await expect(fortyM).toBeVisible();
});
