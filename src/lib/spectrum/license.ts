/**
 * Operator-license logic (SPEC §Amateur). Pure: no DOM, no Svelte, no app state.
 *
 * Two concerns:
 *  - {@link eligibility}: can the held license transmit on a given allocation, and the
 *    ✓/✗ copy the Inspector pill shows.
 *  - {@link privilegeStrip}: for bands with a documented sub-band plan ({@link HAM_SUBBANDS}),
 *    which segments the held license unlocks — drives the Inspector's privilege strip.
 */

import { licenseRank, type LicenseRank } from '$lib/data/types';

/** Full class labels, shown in the licence badge, the licence filter, and the sub-band key. */
export const RANK_LABELS: Record<LicenseRank, string> = {
	unlicensed: 'Unlicensed',
	technician: 'Technician',
	general: 'General',
	extra: 'Extra'
};

/**
 * A single-letter glyph per operator-licence class — U / T / G / E — shown in the licence filter,
 * as a badge on amateur markers, and on each sub-band of the Inspector privilege strip. The class
 * initial reads more clearly than the abstract shapes it replaced.
 */
export const LICENSE_ICON: Record<LicenseRank, string> = {
	unlicensed: 'U',
	technician: 'T',
	general: 'G',
	extra: 'E'
};

/** Operating mode of a sub-band segment; keyed to a colour by the Inspector. */
export type PrivilegeMode = 'cw' | 'data' | 'phone';

/** A privilege segment, expressed as a fraction of its band's [low, high] span. */
export interface PrivilegeSegment {
	/** Fractional start within the band, 0–1. */
	from: number;
	/** Fractional end within the band, 0–1. */
	to: number;
	/** Lowest license class that may transmit in this segment. */
	minLicense: LicenseRank;
	/** Operating mode of the segment. */
	mode: PrivilegeMode;
}

/**
 * US amateur sub-band privilege plans, in MHz, sourced from the ARRL US band chart
 * (FCC 47 CFR §97.301/.305). Each row is `[fromMHz, toMHz, lowest class, mode]`, where the
 * class is the lowest that may transmit in that segment. Only the classic HF bands whose
 * privileges vary by class are detailed; simpler bands just show the eligibility pill.
 *
 * The app models the four live US classes (unlicensed/technician/general/extra); the closed
 * Novice/Advanced classes are folded into the nearest live class.
 */
const SUBBAND_PLANS_MHZ: Record<
	string,
	{ band: [number, number]; segs: [number, number, LicenseRank, PrivilegeMode][] }
> = {
	// 160 m — no Technician access; General and Extra share the whole band with no
	// exclusive sub-band, and phone/image is authorised edge to edge (CW and data too).
	ham160m: {
		band: [1.8, 2.0],
		segs: [[1.8, 2.0, 'general', 'phone']]
	},
	ham80m: {
		band: [3.5, 4.0],
		segs: [
			[3.5, 3.525, 'extra', 'cw'],
			[3.525, 3.6, 'technician', 'cw'],
			[3.6, 3.8, 'extra', 'phone'],
			[3.8, 4.0, 'general', 'phone']
		]
	},
	// 60 m — five fixed USB channels (General and up); voice, CW and data all allowed,
	// so the strip reads as a single General phone span across the channel group.
	ham60m: {
		band: [5.3305, 5.4065],
		segs: [[5.3305, 5.4065, 'general', 'phone']]
	},
	ham40m: {
		band: [7.0, 7.3],
		segs: [
			[7.0, 7.025, 'extra', 'cw'],
			[7.025, 7.125, 'technician', 'cw'],
			[7.125, 7.175, 'extra', 'phone'],
			[7.175, 7.3, 'general', 'phone']
		]
	},
	// 30 m WARC — General and up, CW and data only: no phone anywhere on the band.
	ham30m: {
		band: [10.1, 10.15],
		segs: [[10.1, 10.15, 'general', 'data']]
	},
	ham20: {
		band: [14.0, 14.35],
		segs: [
			[14.0, 14.025, 'extra', 'cw'],
			[14.025, 14.15, 'general', 'data'],
			[14.15, 14.225, 'extra', 'phone'],
			[14.225, 14.35, 'general', 'phone']
		]
	},
	// 17 m WARC — General and up; CW/data below 18.110 MHz, phone above it. No class split.
	ham17m: {
		band: [18.068, 18.168],
		segs: [
			[18.068, 18.11, 'general', 'data'],
			[18.11, 18.168, 'general', 'phone']
		]
	},
	ham15m: {
		band: [21.0, 21.45],
		segs: [
			[21.0, 21.025, 'extra', 'cw'],
			[21.025, 21.2, 'technician', 'cw'],
			[21.2, 21.275, 'extra', 'phone'],
			[21.275, 21.45, 'general', 'phone']
		]
	},
	// 12 m WARC — General and up; CW/data below 24.930 MHz, phone above it. No class split.
	ham12m: {
		band: [24.89, 24.99],
		segs: [
			[24.89, 24.93, 'general', 'data'],
			[24.93, 24.99, 'general', 'phone']
		]
	},
	ham10m: {
		band: [28.0, 29.7],
		segs: [
			[28.0, 28.3, 'technician', 'data'],
			[28.3, 28.5, 'technician', 'phone'],
			[28.5, 29.7, 'general', 'phone']
		]
	}
};

/**
 * Per-band privilege plans, keyed by allocation id, as fractional offsets within each band's
 * span (so the Inspector strip stays correct at any width). Derived from
 * {@link SUBBAND_PLANS_MHZ}; the Inspector draws the strip when an entry exists.
 */
export const HAM_SUBBANDS: Record<string, PrivilegeSegment[]> = Object.fromEntries(
	Object.entries(SUBBAND_PLANS_MHZ).map(
		([
			id,
			{
				band: [lo, hi],
				segs
			}
		]) => {
			const span = hi - lo;
			return [
				id,
				segs.map(([fromMHz, toMHz, minLicense, mode]) => ({
					from: (fromMHz - lo) / span,
					to: (toMHz - lo) / span,
					minLicense,
					mode
				}))
			];
		}
	)
);

/** True when an allocation has a documented sub-band privilege plan — drives the chart's
 *  licence-aware expand/contract rendering and keeps the band visible at every class. */
export function hasPrivilegePlan(id: string): boolean {
	return id in SUBBAND_PLANS_MHZ;
}

/** A privilege sub-band resolved to absolute Hz against a held licence. */
export interface PrivilegeBand {
	loHz: number;
	hiHz: number;
	minLicense: LicenseRank;
	mode: PrivilegeMode;
	/** True when the held class may transmit in this sub-band. */
	enabled: boolean;
}

/**
 * A band's privilege sub-bands in absolute Hz, each flagged for the held licence — the data the
 * main chart draws as the band at true width: a transparent envelope with the held class's
 * accessible sub-bands filled in. Empty for bands without a documented plan.
 */
export function privilegeBands(id: string, held: LicenseRank): PrivilegeBand[] {
	const plan = SUBBAND_PLANS_MHZ[id];
	if (!plan) return [];
	const have = licenseRank(held);
	return plan.segs.map(([fromMHz, toMHz, minLicense, mode]) => ({
		loHz: fromMHz * 1e6,
		hiHz: toMHz * 1e6,
		minLicense,
		mode,
		enabled: have >= licenseRank(minLicense)
	}));
}

/** A privilege segment resolved against a held license. */
export interface RenderedSegment extends PrivilegeSegment {
	/** True when the held license may transmit in this segment. */
	enabled: boolean;
}

/**
 * The privilege strip for an allocation given a held license: each documented segment marked
 * enabled/disabled. Empty for bands without a sub-band plan.
 */
export function privilegeStrip(allocationId: string, held: LicenseRank): RenderedSegment[] {
	const segments = HAM_SUBBANDS[allocationId];
	if (!segments) return [];

	const have = licenseRank(held);
	return segments.map((s) => ({ ...s, enabled: have >= licenseRank(s.minLicense) }));
}

/**
 * Transmitter-power ceilings (47 CFR §97.313). Every amateur band allows the 1500 W PEP legal
 * limit unless a stricter figure applies, so only the exceptions are tabulated. The EIRP/ERP
 * bands quote effective radiated power (what leaves the antenna), not raw transmitter output.
 */
const LEGAL_MAX_POWER = '1500 W PEP';

/** Bands whose ceiling is lower than the legal limit for *every* class, keyed by allocation id. */
const HAM_POWER_EXCEPTIONS: Record<string, string> = {
	ham2200m: '1 W EIRP', // 135.7–137.8 kHz
	ham630m: '5 W EIRP', // 472–479 kHz
	ham60m: '100 W ERP', // per channel, referenced to a half-wave dipole
	ham30m: '200 W PEP' // 10.100–10.150 MHz, all classes
};

/**
 * Bands where a Technician (folding in the closed Novice class) is held to 200 W PEP on the
 * Novice/Technician HF segment, even though General/Extra may run the legal limit there
 * (§97.313(c)): the bottom of 80, 40, 15 and 10 m.
 */
const TECH_200W_BANDS = new Set(['ham80m', 'ham40m', 'ham15m', 'ham10m']);

/** An amateur (Part 97) band — the ids are `ham*` plus the one-off `2m`. Part 95 personal-radio
 *  services (CB, FRS/GMRS, MURS) are *not* amateur and carry their own power rules. */
function isAmateurBand(id: string): boolean {
	return id.startsWith('ham') || id === '2m';
}

/**
 * Transmitter-power ceilings for the Part 95 personal-radio services, by allocation id. Fixed per
 * service and independent of any operator class (these are licence-by-rule / licence-free bands):
 * CB (47 CFR §95.967), FRS & GMRS (§95.567/.1767), MURS (§95.2567).
 */
const PART95_POWER: Record<string, string> = {
	cb: '4 W AM · 12 W PEP SSB',
	frs: 'FRS 2 W · GMRS up to 50 W',
	murs: '2 W'
};

/**
 * The maximum transmitter power to show for a band and held class. For amateur bands it's the
 * §97.313 ceiling (1500 W PEP, less on the exception bands and for a Technician on their HF
 * segment); for the Part 95 personal-radio bands it's the fixed per-service limit. Empty string
 * for everything else (broadcast, cellular, radar, … — power isn't the operator-facing fact there).
 */
export function powerLimit(id: string, held: LicenseRank): string {
	if (isAmateurBand(id)) {
		if (held === 'technician' && TECH_200W_BANDS.has(id)) return '200 W PEP';
		return HAM_POWER_EXCEPTIONS[id] ?? LEGAL_MAX_POWER;
	}
	return PART95_POWER[id] ?? '';
}

/** The universal §97.313(a) reminder — a Part 97 amateur rule, so it accompanies only ham bands'
 *  power ceilings (Part 95 services have no equivalent "minimum necessary power" mandate). */
export const MIN_POWER_NOTE = 'Use the minimum power needed to make contact (§97.313)';

/** The minimum-power reminder for a band, or '' when it doesn't apply (non-amateur). */
export function powerMinNote(id: string): string {
	return isAmateurBand(id) ? MIN_POWER_NOTE : '';
}

/** A contiguous run of the privilege strip sharing one key (licence class, or operating mode),
 *  as a fraction of the band span. Used to collapse the strip so it doesn't read as split where
 *  it isn't: the glyph row merges by class, a caption row merges by mode. */
export interface StripRun<K> {
	from: number;
	to: number;
	key: K;
	/** True when the held class can transmit across the run (every merged segment was enabled). */
	enabled: boolean;
}

/** Merge adjacent segments that share `keyOf` into runs — so a band split only by operating mode
 *  (17 m: General CW/data then phone) collapses to a single General run, not two "G" segments. */
function mergeRuns<K>(
	segs: RenderedSegment[],
	keyOf: (s: RenderedSegment) => K
): StripRun<K>[] {
	const runs: StripRun<K>[] = [];
	for (const s of segs) {
		const key = keyOf(s);
		const last = runs[runs.length - 1];
		if (last && last.key === key && Math.abs(last.to - s.from) < 1e-6) {
			last.to = s.to;
			last.enabled = last.enabled && s.enabled;
		} else {
			runs.push({ from: s.from, to: s.to, key, enabled: s.enabled });
		}
	}
	return runs;
}

/** The strip's licence-class runs (one glyph each) — adjacent same-class segments merged. */
export function classRuns(segs: RenderedSegment[]): StripRun<LicenseRank>[] {
	return mergeRuns(segs, (s) => s.minLicense);
}

/** The strip's operating-mode runs (one caption each) — adjacent same-mode segments merged. */
export function modeRuns(segs: RenderedSegment[]): StripRun<PrivilegeMode>[] {
	return mergeRuns(segs, (s) => s.mode);
}

/** Summary note shown beneath the privilege strip, keyed to the held license. */
export function privilegeNote(held: LicenseRank): string {
	switch (held) {
		case 'extra':
			return 'full band';
		case 'general':
			return 'General privileges';
		case 'technician':
			return 'Technician privileges';
		default:
			return 'No amateur privileges';
	}
}
