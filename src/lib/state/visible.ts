/**
 * Visible-light sub-filter state. The optical region got busy (lasers, LEDs, gas glows,
 * fireworks), so each group toggles independently. All on by default.
 */

import { writable } from 'svelte/store';
import { OPTICAL_GROUPS, type OpticalGroup } from '$lib/data/types';

export type GroupVisibility = Record<OpticalGroup, boolean>;

const allOn = (): GroupVisibility =>
	Object.fromEntries(OPTICAL_GROUPS.map((g) => [g, true])) as GroupVisibility;

export const visibleGroups = writable<GroupVisibility>(allOn());

export const GROUP_LABELS: Record<OpticalGroup, string> = {
	laser: 'Lasers',
	led: 'LEDs',
	gas: 'Gas & flame',
	fireworks: 'Fireworks'
};

export function toggleGroup(g: OpticalGroup): void {
	visibleGroups.update((s) => ({ ...s, [g]: !s[g] }));
}

export function setAllGroups(on: boolean): void {
	visibleGroups.set(Object.fromEntries(OPTICAL_GROUPS.map((g) => [g, on])) as GroupVisibility);
}
