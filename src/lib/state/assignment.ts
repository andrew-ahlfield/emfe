/**
 * Assignment-lane view state (the middle tier — SPEC §The three tiers). Shown by default.
 */

import { writable } from 'svelte/store';

export const assignmentView = writable<{ show: boolean }>({ show: true });

/** Show/hide the designated-frequency lane. */
export function toggleAssignment(): void {
	assignmentView.update((s) => ({ show: !s.show }));
}
