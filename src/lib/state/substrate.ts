/**
 * Allocation-substrate view state (the bottom tier — SPEC §The three tiers).
 *
 * Defaults: shown, both administrations, every service category on. `off` holds the *hidden*
 * categories so a pristine state is the empty set (and deep-links stay short if wired later).
 */

import { writable } from 'svelte/store';
import type { ServiceCategory } from '$lib/spectrum/services';

/** Which side of the §2.106 table to show: both, civilian (Non-Federal), or government (Federal). */
export type Admin = 'all' | 'non-federal' | 'federal';

export interface SubstrateView {
	/** Whether the substrate ribbon is drawn at all. */
	show: boolean;
	admin: Admin;
	/** Hidden service categories (empty = all shown). */
	off: Set<ServiceCategory>;
}

export const substrateView = writable<SubstrateView>({ show: true, admin: 'all', off: new Set() });

/** Show/hide the whole substrate tier. */
export function toggleSubstrate(): void {
	substrateView.update((s) => ({ ...s, show: !s.show }));
}

/** Pick the administration filter. */
export function setAdmin(admin: Admin): void {
	substrateView.update((s) => ({ ...s, admin }));
}

/** Toggle one service category's visibility. */
export function toggleCategory(c: ServiceCategory): void {
	substrateView.update((s) => {
		const off = new Set(s.off);
		if (off.has(c)) off.delete(c);
		else off.add(c);
		return { ...s, off };
	});
}
