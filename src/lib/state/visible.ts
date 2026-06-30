/**
 * Visible-light sub-filter state. The optical region got busy (lasers, LEDs, gas glows, fireworks),
 * so each group toggles independently. All on by default.
 */

import { writable } from 'svelte/store';
import { OPTICAL_GROUPS, type OpticalGroup, type LayerId } from '$lib/data/types';
import { allocations } from '$lib/data/loader';
import { enableLayer, layers } from './layers';

export type GroupVisibility = Record<OpticalGroup, boolean>;

const all = (on: boolean): GroupVisibility =>
	Object.fromEntries(OPTICAL_GROUPS.map((g) => [g, on])) as GroupVisibility;

export const visibleGroups = writable<GroupVisibility>(all(true));

export const GROUP_LABELS: Record<OpticalGroup, string> = {
	laser: 'Lasers',
	led: 'LEDs',
	gas: 'Gas & flame',
	fireworks: 'Fireworks'
};

/**
 * Every content layer a visible-light entry can be shown under (its primary *or* alt layer). Most
 * are physical-science, but the everyday ones (LEDs, neon, fireworks…) are also dual-licensed into
 * consumer — so the filter still has content to show in an everyday-only view.
 */
const OPTICAL_LAYERS = [
	...new Set(allocations.flatMap((a) => (a.optical ? [a.layer, a.altLayer] : [])).filter(Boolean))
] as LayerId[];

// Auto-collapse + graceful restore. When *no* optical layer is enabled the filter has nothing to
// display, so it remembers what was showing and blanks the groups (the master then reads off, one
// click from re-enabling). When an optical layer comes back on it restores exactly that snapshot —
// unless the user has since acted explicitly (which clears the memory, so a deliberate "all off"
// stays off). This generalises the old "tied to the science layer" rule so a dual-licensed light is
// never hidden just because science is off while consumer is on.
let restore: GroupVisibility | null = null;
layers.subscribe(($l) => {
	const canShow = OPTICAL_LAYERS.some((l) => $l[l]);
	if (!canShow) {
		visibleGroups.update((g) => {
			if (restore === null && OPTICAL_GROUPS.some((x) => g[x])) restore = g;
			return all(false);
		});
	} else if (restore !== null) {
		visibleGroups.set(restore);
		restore = null;
	}
});

// Turning a light source on is pointless if no layer it lives in is shown — so enabling any group
// also switches the science layer on. An explicit toggle clears the auto-restore memory.
export function toggleGroup(g: OpticalGroup): void {
	restore = null;
	let turnedOn = false;
	visibleGroups.update((s) => {
		turnedOn = !s[g];
		return { ...s, [g]: turnedOn };
	});
	if (turnedOn) enableLayer('science');
}

export function setAllGroups(on: boolean): void {
	restore = null;
	if (on) enableLayer('science');
	visibleGroups.set(all(on));
}
