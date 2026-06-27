import { describe, it, expect } from 'vitest';
import { allocationsAtLod, layerCounts, visibleAllocations } from '$lib/spectrum/filter';
import type { Lod } from '$lib/spectrum/lod';
import { LAYERS, type Allocation, type LayerId } from '$lib/data/types';
import { allocations } from '$lib/data/loader';

const allLayersOn: Record<LayerId, boolean> = Object.fromEntries(
	LAYERS.map((l) => [l, true])
) as Record<LayerId, boolean>;

function at(minLod: Lod): Allocation {
	return {
		id: `a${minLod}-${Math.random()}`,
		name: 'A',
		hz: 1e6,
		layer: 'consumer',
		region: 'radio',
		minLod,
		note: 'n',
		source: { id: 's', title: 'S' }
	};
}

describe('allocationsAtLod', () => {
	const fixture = [at(0), at(1), at(2), at(3)];

	it('reveals items as the LOD descends', () => {
		expect(allocationsAtLod(fixture, 0)).toHaveLength(1); // only minLod 0
		expect(allocationsAtLod(fixture, 1)).toHaveLength(2);
		expect(allocationsAtLod(fixture, 2)).toHaveLength(3);
		expect(allocationsAtLod(fixture, 3)).toHaveLength(4); // all
	});

	it('shows the six hero markers on the real seed at the Regions tier', () => {
		const hero = allocationsAtLod(allocations, 0);
		expect(hero).toHaveLength(6);
		expect(hero.map((a) => a.id).sort()).toEqual(['am', 'fm', 'gps', 'vis', 'wifi', 'xray']);
	});

	it('reveals more (never fewer) entries as the LOD deepens, up to the whole set', () => {
		const counts = ([0, 1, 2, 3] as Lod[]).map((l) => allocationsAtLod(allocations, l).length);
		for (let i = 1; i < counts.length; i++) {
			expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
		}
		expect(counts[3]).toBe(allocations.length);
	});
});

describe('visibleAllocations', () => {
	it('is the LOD set intersected with the enabled content layers', () => {
		const atLod = allocationsAtLod(allocations, 2);
		expect(visibleAllocations(allocations, 2, allLayersOn)).toHaveLength(atLod.length);

		const noScience = { ...allLayersOn, science: false };
		const got = visibleAllocations(allocations, 2, noScience);
		expect(got).toHaveLength(atLod.filter((a) => a.layer !== 'science').length);
		expect(got.every((a) => a.layer !== 'science')).toBe(true);
	});

	it('hides amateur bands the held licence class cannot transmit on', () => {
		const all = visibleAllocations(allocations, 3, allLayersOn); // no licence filter
		const extra = visibleAllocations(allocations, 3, allLayersOn, 'extra');
		const unlicensed = visibleAllocations(allocations, 3, allLayersOn, 'unlicensed');

		// Extra holds every privilege → no amateur band is hidden.
		expect(extra).toHaveLength(all.length);

		// Unlicensed keeps only the licence-free amateur entries; the rest are hidden.
		expect(unlicensed.length).toBeLessThan(all.length);
		expect(unlicensed.every((a) => a.layer !== 'amateur' || a.reqLicense === 'unlicensed')).toBe(
			true
		);

		// Non-amateur allocations are never affected by the licence.
		const nonAmateur = all.filter((a) => a.layer !== 'amateur').length;
		expect(unlicensed.filter((a) => a.layer !== 'amateur')).toHaveLength(nonAmateur);
	});
});

describe('layerCounts', () => {
	it('tallies allocations per layer at a LOD, ignoring toggles', () => {
		const counts = layerCounts(allocations, 2);
		const atLod = allocationsAtLod(allocations, 2);
		const total = Object.values(counts).reduce((a, b) => a + b, 0);
		expect(total).toBe(atLod.length);
		for (const l of LAYERS) {
			expect(counts[l]).toBe(atLod.filter((a) => a.layer === l).length);
		}
	});
});
