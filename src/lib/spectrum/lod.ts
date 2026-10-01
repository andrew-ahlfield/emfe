/**
 * Level-of-detail (LOD): semantic zoom tiers.
 *
 * The LOD is *derived* from how many decades are currently visible: zoom out to see the
 * seven great regions; zoom in and detail emerges. Thresholds are intentionally easy to
 * tune (we iterate on feel during Phase 3).
 *
 * Pure module: no DOM, no Svelte, no app state.
 */

import { decades, type FreqDomain } from './scale';

/** Detail tiers, ascending. Numeric so `lod >= allocation.minLod` reads naturally. */
export type Lod = 0 | 1 | 2 | 3;

export const LOD: Record<'REGIONS' | 'ITU' | 'ALLOCATIONS' | 'CHANNELS', Lod> = {
	REGIONS: 0,
	ITU: 1,
	ALLOCATIONS: 2,
	CHANNELS: 3
};

/** Human-readable label per tier (matches the prototype's dock + LOD readout). */
export const LOD_LABELS: Record<Lod, string> = {
	0: 'Regions',
	1: 'ITU bands',
	2: 'Allocations',
	3: 'Channels'
};

/**
 * Decade-span boundaries between tiers. A domain wider than `regions` decades shows only
 * regions; narrower than `channels` decades shows channels. Tunable.
 */
export const LOD_SPAN_THRESHOLDS = {
	/** ≥ this many decades visible → Regions. */
	regions: 12,
	/** ≥ this many decades visible → ITU bands. */
	itu: 4,
	/** ≥ this many decades visible → Allocations (below → Channels). */
	allocations: 1.2
} as const;

/** Derive the LOD tier from how many decades a domain spans. */
export function lodForSpan(decadesVisible: number): Lod {
	const t = LOD_SPAN_THRESHOLDS;
	if (decadesVisible >= t.regions) return LOD.REGIONS;
	if (decadesVisible >= t.itu) return LOD.ITU;
	if (decadesVisible >= t.allocations) return LOD.ALLOCATIONS;
	return LOD.CHANNELS;
}

/** Derive the LOD tier from the currently visible frequency domain. */
export function lodForDomain(d: FreqDomain): Lod {
	return lodForSpan(decades(d));
}

/** Whether an item with the given `minLod` should be visible at the current `lod`. */
export function isVisibleAtLod(minLod: Lod, lod: Lod): boolean {
	return lod >= minLod;
}
