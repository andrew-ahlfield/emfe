/**
 * Inspector drawer presentation state. The drawer is non-modal: it never blocks or dims the
 * spectrum. `pinned` upgrades it from a transient right-hand overlay to a docked panel — the page
 * content shifts left so the drawer and the number line stay visible side by side without overlap.
 */

import { writable } from 'svelte/store';

export const inspectorPinned = writable(false);

/** Toggle the pinned (docked, non-overlapping) presentation. */
export function togglePinned(): void {
	inspectorPinned.update((p) => !p);
}
