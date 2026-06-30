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

/**
 * The three governance tiers (SPEC §The three tiers). `application` = a recognizable use
 * (Wi-Fi, GPS); `assignment` = a specifically designated frequency/channel (Marine Ch 16,
 * 121.5 MHz emergency). The `allocation` substrate is a separate data kind ({@link ServiceAllocation}),
 * not a marker, so markers are only ever `application` or `assignment`.
 */
export const TIERS = ['allocation', 'assignment', 'application'] as const;
export type Tier = (typeof TIERS)[number];

/** Visible-light sub-groups for the dedicated visible-light filter. */
export const OPTICAL_GROUPS = ['laser', 'led', 'gas', 'fireworks'] as const;
export type OpticalGroup = (typeof OPTICAL_GROUPS)[number];

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
	/**
	 * Occupied sub-ranges within `band`, for a service whose allocation is split across separate
	 * groups (e.g. the 462 + 467 MHz walkie-talkie channels). When present, the bar renders as
	 * these pieces instead of one solid span — so the empty gap between them isn't drawn as used.
	 */
	segments?: [number, number][];
	/**
	 * Discrete spectral emission lines (Hz) — for a gas/discharge whose light is a set of sharp lines
	 * rather than a continuous band (sodium 589 nm, the hydrogen Balmer series, a neon sign). Rendered
	 * as one spectrally-coloured tick per line; `band` should span their extent and `hz` sits on the
	 * dominant line. (A non-optical multi-mode signal — the Schumann resonances — instead lives in the
	 * channel system as a resonance plan with real per-mode widths.)
	 */
	lines?: number[];
	layer: LayerId;
	/**
	 * Optional second content layer this allocation also belongs to. It shows when *either* layer
	 * is on; the primary `layer` wins for colour when its toggle is on (see `effectiveLayer`).
	 */
	altLayer?: LayerId;
	region: RegionId;
	/**
	 * Governance tier (SPEC §The three tiers). Omitted ⇒ `application` (the historical default —
	 * the original 134 entries are all recognizable uses). `assignment` marks a specifically
	 * designated frequency/channel. Determines which vertical lane the marker rides in.
	 */
	tier?: Tier;
	/** Detail tier at which this first appears. */
	minLod: Lod;
	/** Amateur license required to transmit, when applicable. */
	reqLicense?: LicenseRank;
	note: string;
	/**
	 * How an optical entry is coloured. `spectral` = sampled from the physical colour of the light
	 * (lasers, LEDs); `white` = a white broadband bar (white LED). Absent ⇒ the entry uses its
	 * content-layer colour (so non-laser physical-science phenomena stay green). Gas/discharge
	 * entries colour each {@link lines} tick spectrally regardless.
	 */
	emission?: 'spectral' | 'white';
	/**
	 * Visible-light sub-group, for the dedicated visible-light filter (laser / LED / gas glow /
	 * firework). Entries without it aren't governed by that filter.
	 */
	optical?: OpticalGroup;
	/** Source id (resolved to a {@link SourceRef} by the loader). */
	source: string;
	/** An extra, allocation-specific source surfaced only in the detail card (not the main list). */
	extraSource?: { title: string; url?: string };
}

/** A resolved, in-memory allocation (`source` is the full {@link SourceRef}). */
export interface Allocation extends Omit<RawAllocation, 'source'> {
	source: SourceRef;
}

// ── Allocation substrate (the bottom tier) ───────────────────────────────────────────────────

/**
 * One band of the US Table of Frequency Allocations (47 CFR §2.106) — the `allocation` tier.
 * Unlike a marker (a point/use), this is a contiguous span tagged with the **radio services**
 * it's allocated to. `primary` services are ALL-CAPS in the table (protected); `secondary` are
 * sentence-case (must not interfere with primary). `federal` distinguishes the Federal Table
 * (government) from the Non-Federal Table (FCC / civilian) — a first-class filter axis.
 *
 * These tile the spectrum without gaps, which is the whole point: there is no "empty" radio
 * spectrum, only spectrum whose allocation a layperson wouldn't recognize.
 */
export interface ServiceAllocation {
	/** Inclusive low / exclusive high edge, Hz. */
	lo: number;
	hi: number;
	/** Federal Table (true) vs Non-Federal / FCC Table (false). */
	federal: boolean;
	/** Primary (protected) services — ALL-CAPS in §2.106, e.g. `FIXED`, `BROADCASTING`. */
	primary: string[];
	/** Secondary services — sentence-case in §2.106. */
	secondary?: string[];
	/** §2.106 footnote refs that bear on this band (e.g. `US340`, `5.150`, `NG2`). */
	footnotes?: string[];
	/** Optional editorial gloss surfaced in the inspector. */
	note?: string;
}

/** The curated substrate file (`data/allocation-table/us-table.json`). */
export interface SubstrateData {
	/** Source id, resolved against the registry (always `fcc-tofa`). */
	source: string;
	/** §2.106 revision the bands were curated from (ISO date). */
	revision: string;
	bands: ServiceAllocation[];
}
