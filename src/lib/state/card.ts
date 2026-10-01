/**
 * The right-hand details drawer shows one of three mutually-exclusive things: a marker's
 * allocation ("sig"), a spectrum neighbourhood ("grp"), or an allocation-substrate band ("band").
 * This module maps that open card to/from a single opaque URL token (`card=<kind>:<id>`), so a
 * shared link reopens whichever card the sharer had up.
 *
 * Resolution is total: an unknown or malformed token yields `null` (the drawer stays closed),
 * mirroring the rest of the deep-link's degrade-don't-throw contract. This is the one place that
 * couples card tokens to concrete data, keeping `state/url.ts` a pure string module.
 */

import { allocations } from '$lib/data/loader';
import { substrate } from '$lib/data/substrate';
import { FAMILIES, REGION_GROUPS, type Neighbourhood } from '$lib/spectrum/grouping';
import type { ServiceAllocation } from '$lib/data/types';

export type CardTarget =
	| { kind: 'sig'; id: string }
	| { kind: 'grp'; group: Neighbourhood }
	| { kind: 'band'; band: ServiceAllocation };

/** Every selectable neighbourhood, by id: the families plus the radio/microwave umbrellas. */
const NEIGH_BY_ID = new Map<string, Neighbourhood>([
	...FAMILIES.map((f) => [f.id, f] as const),
	...Object.values(REGION_GROUPS).map((g) => [g.id, g] as const)
]);

/** A substrate band has no id of its own; it's pinned by administration + exact edges. */
const bandId = (b: ServiceAllocation): string => `${b.federal ? 'f' : 'n'}:${b.lo}-${b.hi}`;

/** The opaque URL token for an open card, or `null` when nothing is open. */
export function cardToken(t: CardTarget | null): string | null {
	if (!t) return null;
	if (t.kind === 'sig') return `sig:${t.id}`;
	if (t.kind === 'grp') return `grp:${t.group.id}`;
	return `band:${bandId(t.band)}`;
}

/** Resolve a URL token back to a concrete target, or `null` if unknown/malformed. */
export function resolveCard(token: string | null): CardTarget | null {
	if (!token) return null;
	const i = token.indexOf(':');
	const kind = i < 0 ? token : token.slice(0, i);
	const rest = i < 0 ? '' : token.slice(i + 1);
	if (kind === 'sig')
		return allocations.some((a) => a.id === rest) ? { kind: 'sig', id: rest } : null;
	if (kind === 'grp') {
		const group = NEIGH_BY_ID.get(rest);
		return group ? { kind: 'grp', group } : null;
	}
	if (kind === 'band') {
		const band = substrate.find((b) => bandId(b) === rest);
		return band ? { kind: 'band', band } : null;
	}
	return null;
}
