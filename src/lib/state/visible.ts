/**
 * Visible-light sub-filter state. The optical region got busy (lasers, LEDs, gas glows, fireworks),
 * so each group toggles independently. First open shows just the LEDs — enough to make the visible
 * band read as populated without burying it; the master switch brings every source on at once.
 */

import { get, writable } from 'svelte/store';
import { OPTICAL_GROUPS, type OpticalGroup, type LayerId } from '$lib/data/types';
import { allocations } from '$lib/data/loader';
import { enableLayer, layers } from './layers';

export type GroupVisibility = Record<OpticalGroup, boolean>;

const all = (on: boolean): GroupVisibility =>
	Object.fromEntries(OPTICAL_GROUPS.map((g) => [g, on])) as GroupVisibility;

/** The first-open visibility: LEDs only (they're dual-licensed into consumer, the default layer). */
export const defaultGroups = (): GroupVisibility =>
	Object.fromEntries(OPTICAL_GROUPS.map((g) => [g, g === 'led'])) as GroupVisibility;

export const visibleGroups = writable<GroupVisibility>(defaultGroups());

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

/** Per group: the layers its entries can show under, and the primary layer to fall back to. */
const GROUP_LAYERS = Object.fromEntries(
	OPTICAL_GROUPS.map((g) => {
		const members = allocations.filter((a) => a.optical === g);
		const shown = [...new Set(members.flatMap((a) => [a.layer, a.altLayer]).filter(Boolean))];
		return [g, { shown: shown as LayerId[], home: members[0]?.layer ?? 'science' }];
	})
) as Record<OpticalGroup, { shown: LayerId[]; home: LayerId }>;

/** Whether any layer that can show group `g` is currently on. */
const groupCovered = (g: OpticalGroup, $l: Record<LayerId, boolean>): boolean =>
	GROUP_LAYERS[g].shown.some((l) => $l[l]);

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

/**
 * Turning a source group on must actually show something, but with the *least* side effect: a
 * layer is pulled on only when none of the layers that group lives in is visible — and then it's
 * the group's own primary layer, not a blanket "science on". So flipping LEDs (dual-licensed into
 * consumer) in an everyday-only view touches nothing else, while flipping Lasers there enables
 * physical science because lasers exist nowhere else. An explicit toggle clears the auto-restore
 * memory.
 */
export function toggleGroup(g: OpticalGroup): void {
	restore = null;
	let turnedOn = false;
	visibleGroups.update((s) => {
		turnedOn = !s[g];
		return { ...s, [g]: turnedOn };
	});
	if (turnedOn && !groupCovered(g, get(layers))) enableLayer(GROUP_LAYERS[g].home);
}

/** The master switch: same minimal-cover rule as a single toggle, applied to every group. */
export function setAllGroups(on: boolean): void {
	restore = null;
	visibleGroups.set(all(on));
	if (on) {
		const $l = get(layers);
		for (const g of OPTICAL_GROUPS) {
			if (!groupCovered(g, $l)) enableLayer(GROUP_LAYERS[g].home);
		}
	}
}
