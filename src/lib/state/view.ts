/**
 * The view store — the single source of truth for what's on screen.
 *
 * State is `{ centerExp, zoom }` (log10-Hz center + linear magnification). The visible
 * domain and the LOD tier are *derived* from it, so rendering, semantic zoom (Task 7), and
 * deep-linking (Task 12) all read one shape and can't drift.
 */

import { derived, writable } from 'svelte/store';
import { FULL_DOMAIN, decades, windowDomain } from '$lib/spectrum/scale';
import { lodForDomain } from '$lib/spectrum/lod';

export interface ViewState {
	/** log10 of the center frequency, in Hz. */
	centerExp: number;
	/** Linear magnification; 1 = whole spectrum. */
	zoom: number;
}

/** Initial view: the entire spectrum, centered. */
export const INITIAL_VIEW: ViewState = {
	centerExp: (FULL_DOMAIN.minExp + FULL_DOMAIN.maxExp) / 2,
	zoom: 1
};

export const view = writable<ViewState>({ ...INITIAL_VIEW });

/**
 * Undo stack for discrete view *jumps* (clicking a neighbourhood to frame it, resetting). Smooth
 * wheel/drag zoom is deliberately not recorded — only the big snaps you'd want Ctrl+Z to reverse.
 */
const jumpHistory: ViewState[] = [];

/** Get the current view synchronously (without subscribing). */
function readView(): ViewState {
	let v!: ViewState;
	view.subscribe((s) => (v = s))();
	return v;
}

/** Jump the view to a new framing, recording the prior one so {@link undoView} can return. */
export function jumpTo(next: ViewState): void {
	jumpHistory.push(readView());
	view.set(next);
}

/** Reverse the most recent {@link jumpTo}. Returns false when there's nothing to undo. */
export function undoView(): boolean {
	const prev = jumpHistory.pop();
	if (!prev) return false;
	view.set(prev);
	return true;
}

/** The currently visible frequency window (clamped to the full spectrum). */
export const visibleDomain = derived(view, ($v) =>
	windowDomain(FULL_DOMAIN, $v.centerExp, $v.zoom)
);

/** The semantic-zoom detail tier for the current view. */
export const lod = derived(visibleDomain, ($d) => lodForDomain($d));

/** How many decades are currently visible (handy for readouts/labels). */
export const visibleDecades = derived(visibleDomain, ($d) => decades($d));

/** Reset the view to the full spectrum (recorded, so Ctrl+Z returns to the prior framing). */
export function resetView(): void {
	jumpTo({ ...INITIAL_VIEW });
}
