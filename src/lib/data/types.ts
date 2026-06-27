/**
 * Allocation data model (SPEC §Code Style).
 *
 * On disk we store `RawAllocation` (compact: `source` is a source-id string). The loader
 * resolves it into a fully-typed `Allocation` whose `source` is the full {@link SourceRef},
 * matching the spec. Pure module: no DOM, no Svelte, no app state.
 */

import type { Lod } from '$lib/spectrum/lod';

/** Content-layer toggles (SPEC §Layers). */
export const LAYERS = ['consumer', 'amateur', 'navigation', 'gov', 'science'] as const;
export type LayerId = (typeof LAYERS)[number];

/** The seven great spectrum regions, low → high frequency. */
export const REGIONS = [
	'radio',
	'microwave',
	'infrared',
	'visible',
	'uv',
	'xray',
	'gamma'
] as const;
export type RegionId = (typeof REGIONS)[number];

/** Amateur operator privilege ladder, ascending (index = rank). */
export const LICENSE_RANKS = ['unlicensed', 'technician', 'general', 'extra'] as const;
export type LicenseRank = (typeof LICENSE_RANKS)[number];

/** Numeric rank of a license class, for `have >= required` comparisons. */
export function licenseRank(r: LicenseRank): number {
	return LICENSE_RANKS.indexOf(r);
}

/** A provenance reference, surfaced in the Sources & provenance modal. */
export interface SourceRef {
	/** Short stable key referenced by allocations, e.g. `fcc-tofa`. */
	id: string;
	/** Human-readable title, e.g. "FCC Table of Frequency Allocations". */
	title: string;
	/** Canonical URL, when one exists. */
	url?: string;
	/** ISO-8601 date the source was last consulted. */
	retrieved?: string;
}

/** An allocation as authored on disk (`source` is a {@link SourceRef} id). */
export interface RawAllocation {
	id: string;
	name: string;
	/** Representative frequency, Hz. */
	hz: number;
	/** Inclusive [low, high] frequency span, Hz — when the entry is a range. */
	band?: [number, number];
	layer: LayerId;
	region: RegionId;
	/** Detail tier at which this first appears. */
	minLod: Lod;
	/** Amateur license required to transmit, when applicable. */
	reqLicense?: LicenseRank;
	note: string;
	/** Source id (resolved to a {@link SourceRef} by the loader). */
	source: string;
}

/** A resolved, in-memory allocation (`source` is the full {@link SourceRef}). */
export interface Allocation extends Omit<RawAllocation, 'source'> {
	source: SourceRef;
}
