/**
 * Selection store — the id of the currently inspected allocation (or null).
 * The Inspector (Task 6) reads it; markers (Task 5) write it on click.
 */

import { derived, writable } from 'svelte/store';
import { allocations } from '$lib/data/loader';

export const selection = writable<string | null>(null);

/**
 * Whether a selected gas/discharge is *isolating* its spectrum (dimming the other discharges'
 * emission lines). Selecting a gas turns it on; clicking the empty background turns it off again
 * — bringing every spectrum back while keeping the selected gas's info card open.
 */
export const gasIsolated = writable<boolean>(true);

/** Sensible default shown before the user picks anything. */
const DEFAULT_ID = 'wifi';

/**
 * The resolved allocation to inspect: the selection if set, otherwise a sensible default
 * so the Inspector always has something to show.
 */
export const selectedAllocation = derived(selection, ($id) => {
	return (
		allocations.find((a) => a.id === $id) ??
		allocations.find((a) => a.id === DEFAULT_ID) ??
		allocations[0]
	);
});

/** Select an allocation by id. */
export function select(id: string): void {
	selection.set(id);
}

/** Clear the current selection. */
export function clearSelection(): void {
	selection.set(null);
}
