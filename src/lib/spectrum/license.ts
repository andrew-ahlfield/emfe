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
 * Per-band privilege plans, keyed by allocation id. Only bands with a documented sub-band
 * structure appear here; the Inspector draws the strip when an entry exists. Fractions are
 * offsets within the allocation's `band` span, so the strip stays correct under any width.
 *
 * 20 m (14.000–14.350 MHz) — US amateur band plan, FCC 47 CFR §97.301/.305.
 */
export const HAM_SUBBANDS: Record<string, PrivilegeSegment[]> = {
	ham20: [
		{ from: 0, to: 0.0714, minLicense: 'extra', mode: 'cw' }, //      14.000–14.025 Extra CW
		{ from: 0.0714, to: 0.4286, minLicense: 'general', mode: 'data' }, // 14.025–14.150 Gen CW/data
		{ from: 0.4286, to: 0.6429, minLicense: 'extra', mode: 'phone' }, //  14.150–14.225 Extra phone
		{ from: 0.6429, to: 1, minLicense: 'general', mode: 'phone' } //      14.225–14.350 Gen phone
	]
};

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
			return 'Technician: no 20 m HF voice';
		default:
			return 'No amateur privileges';
	}
}
