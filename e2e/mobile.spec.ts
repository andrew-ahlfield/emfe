import { test, expect, type Page } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

/** Drive synthetic touch pointers over the plot (Playwright's touchscreen only taps). */
async function touch(
	page: Page,
	gesture: { kind: 'pinch-out' } | { kind: 'drag'; from: number; to: number }
) {
	await page.evaluate((g) => {
		const svg = document.querySelector('svg.zoomable')!;
		const r = svg.getBoundingClientRect();
		const cy = r.top + r.height / 2;
		const pe = (type: string, id: number, x: number) =>
			svg.dispatchEvent(
				new PointerEvent(type, {
					pointerId: id,
					pointerType: 'touch',
					clientX: x,
					clientY: cy,
					bubbles: true,
					cancelable: true
				})
			);
		if (g.kind === 'pinch-out') {
			pe('pointerdown', 1, 150);
			pe('pointerdown', 2, 200);
			for (let i = 1; i <= 8; i++) {
				pe('pointermove', 1, 150 - i * 10);
				pe('pointermove', 2, 200 + i * 10);
			}
			pe('pointerup', 1, 70);
			pe('pointerup', 2, 280);
		} else {
			pe('pointerdown', 5, g.from);
			const step = g.from > g.to ? -20 : 20;
			for (let x = g.from; step < 0 ? x >= g.to : x <= g.to; x += step) pe('pointermove', 5, x);
			pe('pointerup', 5, g.to);
		}
	}, gesture);
}

test('mobile layout reflows without horizontal overflow and collapses the dock', async ({
	page
}) => {
	await page.goto('/');

	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth > document.documentElement.clientWidth
	);
	expect(overflow).toBe(false);

	// Dock starts collapsed on phones: the handle shows, the panel contents do not.
	await expect(page.getByRole('button', { name: 'Controls', exact: true })).toBeVisible();
	await expect(page.getByText('Content layers')).toBeHidden();
});

test('pinch zooms and one-finger drag pans on touch', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('.readout')).toContainText(/regions/i);

	await touch(page, { kind: 'pinch-out' });
	await expect(page.getByRole('button', { name: 'reset zoom' })).toBeVisible();
	await expect(page.locator('.readout')).not.toContainText(/regions/i);

	const ticksBefore = (await page.locator('svg text.tick-label').allTextContents()).join('|');
	await touch(page, { kind: 'drag', from: 300, to: 80 });
	await expect
		.poll(async () => (await page.locator('svg text.tick-label').allTextContents()).join('|'))
		.not.toBe(ticksBefore);
});
