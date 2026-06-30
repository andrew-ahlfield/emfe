import { describe, it, expect } from 'vitest';
import { CHANNEL_PLANS, planFor, placeChannels } from '$lib/spectrum/channels';
import { FULL_DOMAIN } from '$lib/spectrum/scale';
import rawAllocations from '../../data/allocations/seed.json';

const byId = new Map(rawAllocations.map((a) => [a.id, a]));

describe('CHANNEL_PLANS', () => {
	it('every plan references a real allocation that has a band', () => {
		for (const plan of CHANNEL_PLANS) {
			const a = byId.get(plan.id);
			expect(a, `allocation ${plan.id}`).toBeDefined();
			expect(a!.band, `${plan.id} band`).toBeDefined();
		}
	});

	it('every channel sits within its allocation’s band', () => {
		for (const plan of CHANNEL_PLANS) {
			const [lo, hi] = byId.get(plan.id)!.band as [number, number];
			for (const ch of plan.channels) {
				expect(ch.hz, `${plan.service} ch ${ch.n}`).toBeGreaterThanOrEqual(lo);
				expect(ch.hz, `${plan.service} ch ${ch.n}`).toBeLessThanOrEqual(hi);
			}
		}
	});

	it('CB has 40 channels; walkie-talkie has 22 FRS + 8 GMRS repeater inputs', () => {
		expect(planFor('cb')!.channels.length).toBe(40);
		const wt = planFor('frs')!.channels;
		expect(wt.length).toBe(30);
		expect(wt.filter((c) => c.tag === 'gmrs')).toHaveLength(8);
	});

	it('segmented allocations (walkie-talkie, MURS) keep their segments inside the band', () => {
		for (const id of ['frs', 'murs']) {
			const a = byId.get(id)!;
			const [lo, hi] = a.band as [number, number];
			expect(a.segments, `${id} segments`).toBeDefined();
			for (const [s0, s1] of a.segments as [number, number][]) {
				expect(s0).toBeLessThan(s1);
				expect(s0).toBeGreaterThanOrEqual(lo);
				expect(s1).toBeLessThanOrEqual(hi);
			}
		}
	});
});

describe('placeChannels', () => {
	const cb = planFor('cb')!;
	const cbBand = byId.get('cb')!.band as [number, number];

	it('hides channels at full-spectrum zoom and shows them when zoomed in', () => {
		const full = placeChannels(cb, cbBand, FULL_DOMAIN, 1000);
		expect(full.show).toBe(false);
		expect(full.channels.every((c) => !c.revealed)).toBe(true);
		// A window tightly around the CB band makes its band span most of the width.
		const tight = { minExp: Math.log10(26.9e6), maxExp: Math.log10(27.5e6) };
		const placed = placeChannels(cb, cbBand, tight, 1000);
		expect(placed.show).toBe(true);
		expect(placed.channels).toHaveLength(40);
		expect(placed.channels.every((c) => c.revealed)).toBe(true);
	});

	it('promotes the emergency channel: its red tick reveals before the full grid does', () => {
		// A mid zoom where the CB band spans ~50px — past the landmark threshold (16) but well
		// short of the full-grid one (160), so only channel 9 should be revealed.
		const mid = { minExp: 7.398, maxExp: 7.538 };
		const placed = placeChannels(cb, cbBand, mid, 1000);
		expect(placed.show).toBe(false);
		const revealed = placed.channels.filter((c) => c.revealed);
		expect(revealed).toHaveLength(1);
		expect(revealed[0].n).toBe('9');
		expect(revealed[0].tag).toBe('distress');
	});

	it('reveals a single-tick guard plan by its band width (not its zero channel-extent)', () => {
		const airband = planFor('airband')!;
		const band = byId.get('airband')!.band as [number, number];
		// Zoom so the airband (118–137 MHz) is a comfortable bar — the lone 121.5 guard tick reveals.
		const tight = { minExp: Math.log10(110e6), maxExp: Math.log10(145e6) };
		const placed = placeChannels(airband, band, tight, 1000);
		expect(placed.channels).toHaveLength(1);
		expect(placed.channels[0].revealed).toBe(true);
		expect(placed.channels[0].tag).toBe('distress');
	});
});
