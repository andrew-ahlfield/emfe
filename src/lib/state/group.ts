/**
 * Group-selection store — the spectrum "neighbourhood" (family) whose info card is open, or null.
 *
 * Clicking a collapsed group's curly brace/chip opens a short explainer (what the band name means
 * and what it's generally used for) rather than zooming — the same right-hand sheet pattern as the
 * marker inspector and the substrate band card; only one of the three shows at a time (coordinated
 * in +page.svelte).
 */

import { writable } from 'svelte/store';
import type { Neighbourhood } from '$lib/spectrum/grouping';

export const groupSelection = writable<Neighbourhood | null>(null);

export function selectGroup(n: Neighbourhood): void {
	groupSelection.set(n);
}
export function clearGroup(): void {
	groupSelection.set(null);
}
