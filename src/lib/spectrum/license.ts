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

/** Short labels for the held / required class, used in the eligibility copy. */
const RANK_LABELS: Record<LicenseRank, string> = {
	unlicensed: 'Unlicensed',
	technician: 'Technician',
	general: 'General',
	extra: 'Extra'
};

/**
 * A small glyph designating each operator-license class — shown in the licence filter and as
 * a badge on amateur markers. Chosen as an escalating set of simple white-on-purple shapes.
 */
export const LICENSE_ICON: Record<LicenseRank, string> = {
	unlicensed: '○',
	technician: '▲',
	general: '◆',
	extra: '★'
};

export interface Eligibility {
	/** True when the allocation carries an amateur license requirement at all. */
	amateur: boolean;
	/** True when the held license may transmit here (always true for license-free bands). */
	granted: boolean;
	/** Pill copy, e.g. "✓ General licence covers this band" / "✗ Requires Extra …". */
	text: string;
}

/**
 * Eligibility of a held license for an allocation's `reqLicense`. Returns `amateur: false`
 * (empty pill) for allocations that carry no license requirement.
 */
export function eligibility(reqLicense: LicenseRank | undefined, held: LicenseRank): Eligibility {
	if (reqLicense === undefined) return { amateur: false, granted: false, text: '' };

	const need = licenseRank(reqLicense);
	const have = licenseRank(held);

	if (need === 0) {
		return { amateur: true, granted: true, text: '✓ License-free — anyone may transmit' };
	}
	if (have >= need) {
		return {
			amateur: true,
			granted: true,
			text: `✓ ${RANK_LABELS[held]} licence covers this band`
		};
	}
	return {
		amateur: true,
		granted: false,
		text: `✗ Requires ${RANK_LABELS[reqLicense]} (you have ${RANK_LABELS[held]})`
	};
}

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
	ham80: {
		band: [3.5, 4.0],
		segs: [
			[3.5, 3.525, 'extra', 'cw'],
			[3.525, 3.6, 'technician', 'cw'],
			[3.6, 3.8, 'extra', 'phone'],
			[3.8, 4.0, 'general', 'phone']
		]
	},
	ham40: {
		band: [7.0, 7.3],
		segs: [
			[7.0, 7.025, 'extra', 'cw'],
			[7.025, 7.125, 'technician', 'cw'],
			[7.125, 7.175, 'extra', 'phone'],
			[7.175, 7.3, 'general', 'phone']
		]
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
	ham15: {
		band: [21.0, 21.45],
		segs: [
			[21.0, 21.025, 'extra', 'cw'],
			[21.025, 21.2, 'technician', 'cw'],
			[21.2, 21.275, 'extra', 'phone'],
			[21.275, 21.45, 'general', 'phone']
		]
	},
	ham10: {
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
