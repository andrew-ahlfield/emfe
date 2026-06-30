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

	it('shows the hero markers on the real seed at the Regions tier', () => {
		const hero = allocationsAtLod(allocations, 0);
		expect(hero).toHaveLength(5);
		expect(hero.map((a) => a.id).sort()).toEqual(['am', 'fm', 'gps', 'wifi', 'xray']);
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
	it('is the LOD set intersected with the enabled content layers (either layer of a dual entry)', () => {
		const atLod = allocationsAtLod(allocations, 2);
		expect(visibleAllocations(allocations, 2, allLayersOn)).toHaveLength(atLod.length);

		const noScience = { ...allLayersOn, science: false };
		// An entry shows if its primary OR alt layer is enabled — so a dual science+consumer entry
		// (medical X-ray) stays when science is off but consumer is on.
		const shows = (a: Allocation) =>
			noScience[a.layer] || (a.altLayer != null && noScience[a.altLayer]);
		const got = visibleAllocations(allocations, 2, noScience);
		expect(got).toHaveLength(atLod.filter(shows).length);
		expect(got.every(shows)).toBe(true);
		expect(got.some((a) => a.layer === 'science' && a.altLayer === 'consumer')).toBe(true);
		expect(got.some((a) => a.layer === 'science' && a.altLayer == null)).toBe(false);
	});

	it('never removes amateur bands — the held licence only mutes them in the markers', () => {
		// The licence is no longer a filter input at all: hiding an amateur item you can't transmit
		// on would lose the "you may still listen here" story, so muting is left to rendering.
		const onlyAmateur = {
			consumer: false,
			amateur: true,
			navigation: false,
			gov: false,
			science: false
		};
		const got = visibleAllocations(allocations, 3, onlyAmateur);
		const amateurAtLod = allocationsAtLod(allocations, 3).filter(
			(a) => a.layer === 'amateur' || a.altLayer === 'amateur'
		);
		// Every amateur band at this LOD is present regardless of any licence class.
		expect(got.filter((a) => a.layer === 'amateur').length).toBe(
			amateurAtLod.filter((a) => a.layer === 'amateur').length
		);
		expect(got.some((a) => a.id === 'ham20')).toBe(true); // sub-banded
		expect(got.some((a) => a.id === 'ham17m')).toBe(true); // plain, General-only
	});
});

describe('layerCounts', () => {
	it('tallies allocations per layer at a LOD, counting both layers of a dual entry', () => {
		const counts = layerCounts(allocations, 2);
		const atLod = allocationsAtLod(allocations, 2);
		const dualCount = atLod.filter((a) => a.altLayer != null).length;
		const total = Object.values(counts).reduce((a, b) => a + b, 0);
		expect(total).toBe(atLod.length + dualCount);
		for (const l of LAYERS) {
			expect(counts[l]).toBe(atLod.filter((a) => a.layer === l || a.altLayer === l).length);
		}
	});
});
