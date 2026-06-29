/**
 * Allocation-substrate view state (the bottom tier — SPEC §The three tiers).
 *
 * Defaults: both administrations, every service category on. `off` holds the *hidden* categories
 * so a pristine state is the empty set. The control panel's master switch is a quick
 * select-all/none over the categories (turn the whole ribbon on or off, resetting any picks).
 */

import { writable } from 'svelte/store';
import { SERVICE_CATEGORIES, type ServiceCategory } from '$lib/spectrum/services';
import type { ServiceAllocation } from '$lib/data/types';

/** Which side of the §2.106 table to show: both, civilian (Non-Federal), or government (Federal). */
export type Admin = 'all' | 'non-federal' | 'federal';

export interface SubstrateView {
	admin: Admin;
	/** Hidden service categories (empty = all shown; full = ribbon hidden). */
	off: Set<ServiceCategory>;
}

export const substrateView = writable<SubstrateView>({ admin: 'all', off: new Set() });

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

/** Master reset: turn every category on (empty `off`) or off (all hidden). */
export function setAllCategories(on: boolean): void {
	substrateView.update((s) => ({
		...s,
		off: on ? new Set() : new Set<ServiceCategory>(SERVICE_CATEGORIES)
	}));
}

/** The substrate band whose info card is open (null = closed). */
export const substrateSelection = writable<ServiceAllocation | null>(null);

export function selectBand(b: ServiceAllocation): void {
	substrateSelection.set(b);
}
export function clearBand(): void {
	substrateSelection.set(null);
}
