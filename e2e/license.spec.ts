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
	// The amateur layer is off in the curated first-open default, so the licence selector starts
	// dimmed (it has nothing to act on).
	await page.goto('/');
	const amateur = page.getByRole('switch', { name: /Amateur \+ unlicensed/ });
	const group = page.getByRole('radiogroup', { name: 'Operator licence' });

	await expect(amateur).toHaveAttribute('aria-checked', 'false');
	await expect(group).toHaveClass(/dimmed/);

	// Clicking a class while dimmed switches the amateur layer on and selects the class.
	await group.getByRole('radio', { name: /General/ }).click();
	await expect(amateur).toHaveAttribute('aria-checked', 'true');
	await expect(group).not.toHaveClass(/dimmed/);
	await expect(group.getByRole('radio', { name: /General/ })).toBeChecked();

	// Hiding the layer again re-dims the selector.
	await amateur.click();
	await expect(amateur).toHaveAttribute('aria-checked', 'false');
	await expect(group).toHaveClass(/dimmed/);
});

test('lowering the licence class mutes amateur bands you can no longer transmit on', async ({
	page
}) => {
	await page.goto('/?layers=consumer,amateur'); // the amateur layer is off by default
	await page.waitForSelector('#explorer'); // the SVG mounts only once it has a measured width
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
	await expect(fortyM).toBeVisible();
	// Default Extra → a solid, transmittable bar (no translucent envelope).
	await expect(fortyM.locator('.leaf-bar')).toHaveCount(1);
	await expect(fortyM.locator('.priv-envelope')).toHaveCount(0);

	// Unlicensed can't transmit on 40 m → the band stays on the line (you may still listen) but
	// goes translucent: the solid bar becomes a see-through envelope. (Licence never *removes* a
	// band — see spectrum/filter.ts.)
	await page.getByRole('radio', { name: /Unlicensed/ }).click();
	await expect(fortyM).toBeVisible();
	await expect(fortyM.locator('.leaf-bar')).toHaveCount(0);
	await expect(fortyM.locator('.priv-envelope')).toHaveCount(1);

	// Back to Extra → the solid transmittable bar returns.
	await page.getByRole('radio', { name: /Amateur Extra/ }).click();
	await expect(fortyM.locator('.leaf-bar')).toHaveCount(1);
});
