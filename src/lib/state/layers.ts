/**
 * Content-layer visibility store. All five layers on by default (SPEC §Layers).
 */

import { writable } from 'svelte/store';
import { LAYERS, type LayerId } from '$lib/data/types';

export type LayerVisibility = Record<LayerId, boolean>;

/** Human-readable labels for each content layer. */
export const LAYER_LABELS: Record<LayerId, string> = {
	consumer: 'Consumer / everyday',
	amateur: 'Amateur + unlicensed',
	navigation: 'Navigation / aviation',
	gov: 'Gov / satellite',
	science: 'Physical science'
};

const allOn = (): LayerVisibility =>
	Object.fromEntries(LAYERS.map((l) => [l, true])) as LayerVisibility;

export const layers = writable<LayerVisibility>(allOn());

/** Toggle one content layer. */
export function toggleLayer(id: LayerId): void {
	layers.update((s) => ({ ...s, [id]: !s[id] }));
}

/** Force a content layer on (used when interacting with a control that depends on it). */
export function enableLayer(id: LayerId): void {
	layers.update((s) => ({ ...s, [id]: true }));
}
