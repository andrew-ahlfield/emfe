import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Inspector from './Inspector.svelte';
import type { Allocation, LicenseRank } from '$lib/data/types';

/** 20 m ham — an amateur band with both a license requirement and a sub-band plan. */
const ham20: Allocation = {
	id: 'ham20',
	name: '20 m ham',
	hz: 14e6,
	band: [14e6, 14.35e6],
	layer: 'amateur',
	region: 'radio',
	minLod: 2,
	reqLicense: 'general',
	note: 'Premier HF DX band.',
	source: { id: 'fcc-tofa', title: 'FCC Table of Frequency Allocations' }
};

/** Wi-Fi — a consumer band with no license requirement (no eligibility pill). */
const wifi: Allocation = {
	id: 'wifi',
	name: 'Wi-Fi 2.4 GHz',
	hz: 2.4e9,
	layer: 'consumer',
	region: 'microwave',
	minLod: 1,
	note: 'Unlicensed ISM band.',
	source: { id: 'fcc-tofa', title: 'FCC Table of Frequency Allocations' }
};

const mount = (allocation: Allocation, license: LicenseRank) =>
	render(Inspector, { props: { allocation, license } });

describe('Inspector eligibility pill', () => {
	it('grants a band the held licence covers', async () => {
		const screen = mount(ham20, 'general');
		await expect.element(screen.getByText('✓ General licence covers this band')).toBeInTheDocument();
	});

	it('denies a band above the held class, naming what is required', async () => {
		const screen = mount(ham20, 'technician');
		await expect
			.element(screen.getByText('✗ Requires General (you have Technician)'))
			.toBeInTheDocument();
	});

	it('shows no eligibility pill for a band with no licence requirement', async () => {
		const screen = mount(wifi, 'general');
		await expect.element(screen.getByText('Wi-Fi 2.4 GHz')).toBeInTheDocument();
		expect(screen.container.querySelector('.pill')).toBeNull();
	});
});

describe('Inspector privilege strip', () => {
	it('renders a sub-band strip for bands with a documented plan', async () => {
		const screen = mount(ham20, 'extra');
		await expect.element(screen.getByText('full band')).toBeInTheDocument();
		expect(screen.container.querySelectorAll('.strip .seg')).toHaveLength(4);
	});

	it('greys out the segments the held licence cannot use', async () => {
		const screen = mount(ham20, 'general');
		await expect.element(screen.getByText('General privileges')).toBeInTheDocument();
		// 20 m has two Extra-only segments → two greyed out for a General holder.
		expect(screen.container.querySelectorAll('.strip .seg.off')).toHaveLength(2);
	});

	it('omits the strip for bands without a sub-band plan', async () => {
		const screen = mount(wifi, 'general');
		await expect.element(screen.getByText('Wi-Fi 2.4 GHz')).toBeInTheDocument();
		expect(screen.container.querySelector('.strip')).toBeNull();
	});
});
