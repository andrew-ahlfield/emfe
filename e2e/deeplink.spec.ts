import { test, expect, type Page } from '@playwright/test';

async function zoomIn(page: Page, steps = 8) {
	await page.evaluate((steps) => {
		const svg = document.querySelector('svg.zoomable')!;
		const r = svg.getBoundingClientRect();
		for (let i = 0; i < steps; i++) {
			svg.dispatchEvent(
				new WheelEvent('wheel', {
					deltaY: -120,
					clientX: r.left + r.width * 0.41,
					clientY: r.top + r.height / 2,
					bubbles: true,
					cancelable: true
				})
			);
		}
	}, steps);
}

test('view state round-trips through the URL on reload', async ({ page }) => {
	await page.goto('/');

	await page.getByRole('button', { name: /Switch to (light|dark) theme/ }).click(); // → light
	await page.getByRole('switch', { name: /Gov \/ satellite/ }).click(); // gov layer on (off by default)
	await page.getByRole('radio', { name: /Technician/ }).click(); // license → technician (non-default)
	await zoomIn(page);

	// The URL now encodes every changed dimension.
	await expect.poll(() => new URL(page.url()).searchParams.get('z')).not.toBeNull();
	const url = page.url();
	const params = new URL(url).searchParams;
	expect(params.get('t')).toBe('light');
	expect(params.get('layers')).toContain('gov');
	expect(params.get('lic')).toBe('technician');

	// Reload restores the identical view.
	await page.reload();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	await expect(page.getByRole('switch', { name: /Gov \/ satellite/ })).toHaveAttribute(
		'aria-checked',
		'true'
	);
	await expect(page.getByRole('radio', { name: /Technician/ })).toBeChecked();
	await expect(page.getByRole('button', { name: 'reset zoom' })).toBeVisible();
	expect(page.url()).toBe(url);
});

test('a malformed query degrades to the default view', async ({ page }) => {
	await page.goto('/?z=abc&c=NaN&layers=bogus&lic=admiral&t=neon');

	await expect(page.getByRole('button', { name: 'reset zoom' })).toHaveCount(0); // full view
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await expect(page.getByRole('radio', { name: /Amateur Extra/ })).toBeChecked();
	// The default view: just the everyday layer on.
	await expect(page.getByRole('switch', { name: /Consumer/ })).toHaveAttribute(
		'aria-checked',
		'true'
	);
	await expect(page.getByRole('switch', { name: /Gov \/ satellite/ })).toHaveAttribute(
		'aria-checked',
		'false'
	);
});

test('a legacy off-list link still decodes (relative to all layers on)', async ({ page }) => {
	await page.goto('/?off=gov');

	await expect(page.getByRole('switch', { name: /Gov \/ satellite/ })).toHaveAttribute(
		'aria-checked',
		'false'
	);
	await expect(page.getByRole('switch', { name: /Physical science/ })).toHaveAttribute(
		'aria-checked',
		'true'
	);
});
