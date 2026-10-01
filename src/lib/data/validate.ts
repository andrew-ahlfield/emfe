/**
 * Pure invariant checks for allocation data (SPEC §Testing Strategy):
 *   - valid layer / region / license / minLod enums
 *   - well-formed bands (low < high) containing the representative frequency
 *   - monotonic, positive representative frequencies
 *   - every `source` resolves to a known SourceRef
 *
 * Note: bands are *allowed* to overlap (even within a layer). Real spectrum genuinely shares
 * ranges: Wi-Fi, Bluetooth, Zigbee and microwave ovens all live in the 2.4 GHz ISM band,
 * so the earlier "no overlap within a layer" rule was counterfactual and has been dropped.
 *
 * No fs, no schema engine; those live in scripts/data-validate.ts. This module is the
 * testable core, exercised with both valid and deliberately-broken fixtures.
 */

import { LAYERS, LICENSE_RANKS, REGIONS, type RawAllocation } from './types.ts';

export interface ValidationIssue {
	id: string;
	message: string;
}

const LAYER_SET: ReadonlySet<string> = new Set(LAYERS);
const REGION_SET: ReadonlySet<string> = new Set(REGIONS);
const LICENSE_SET: ReadonlySet<string> = new Set(LICENSE_RANKS);

/** Validate a list of raw allocations against all invariants. Empty result = valid. */
export function validateAllocations(
	allocs: readonly RawAllocation[],
	knownSourceIds: ReadonlySet<string>
): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	const add = (id: string, message: string) => issues.push({ id, message });

	const seenIds = new Set<string>();
	for (const a of allocs) {
		if (seenIds.has(a.id)) add(a.id, `duplicate id "${a.id}"`);
		seenIds.add(a.id);

		if (!LAYER_SET.has(a.layer)) add(a.id, `invalid layer "${a.layer}"`);
		if (!REGION_SET.has(a.region)) add(a.id, `invalid region "${a.region}"`);
		if (a.reqLicense !== undefined && !LICENSE_SET.has(a.reqLicense)) {
			add(a.id, `invalid reqLicense "${a.reqLicense}"`);
		}
		if (![0, 1, 2, 3].includes(a.minLod)) add(a.id, `invalid minLod "${a.minLod}"`);

		if (!(a.hz > 0) || !Number.isFinite(a.hz)) add(a.id, `non-positive hz ${a.hz}`);

		if (a.band) {
			const [lo, hi] = a.band;
			if (!(lo < hi)) add(a.id, `band low ${lo} not below high ${hi}`);
			if (a.hz < lo || a.hz > hi) add(a.id, `hz ${a.hz} outside band [${lo}, ${hi}]`);
		}

		if (!knownSourceIds.has(a.source)) add(a.id, `unknown source "${a.source}"`);
	}

	// Monotonic representative frequencies across the dataset (sorted, strictly ascending).
	const byHz = [...allocs].sort((x, y) => x.hz - y.hz);
	for (let i = 1; i < byHz.length; i++) {
		if (byHz[i].hz <= byHz[i - 1].hz) {
			add(byHz[i].id, `frequency not strictly increasing at ${byHz[i].hz} Hz`);
		}
	}

	return issues;
}
