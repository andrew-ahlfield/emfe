/**
 * Content-layer visibility store. First open shows just the everyday layer (SPEC §Layers) —
 * a gentle default; the master switch brings the full stack on in one click.
 */

import { writable } from 'svelte/store';
import { LAYERS, DEFAULT_ON_LAYERS, type LayerId } from '$lib/data/types';

export type LayerVisibility = Record<LayerId, boolean>;

/** Human-readable labels for each content layer. */
export const LAYER_LABELS: Record<LayerId, string> = {
	consumer: 'Consumer / everyday',
	amateur: 'Amateur + unlicensed',
	navigation: 'Navigation / aviation',
	gov: 'Gov / satellite',
	science: 'Physical science'
};

/** The first-open visibility: only the layers in {@link DEFAULT_ON_LAYERS} are shown. */
export const defaultLayers = (): LayerVisibility =>
	Object.fromEntries(LAYERS.map((l) => [l, DEFAULT_ON_LAYERS.includes(l)])) as LayerVisibility;

export const layers = writable<LayerVisibility>(defaultLayers());

/** Toggle one content layer. */
export function toggleLayer(id: LayerId): void {
	layers.update((s) => ({ ...s, [id]: !s[id] }));
}

/** Force a content layer on (used when interacting with a control that depends on it). */
export function enableLayer(id: LayerId): void {
	layers.update((s) => ({ ...s, [id]: true }));
}

/** Set every content layer at once — the master on/off switch. */
export function setAllLayers(on: boolean): void {
	layers.set(Object.fromEntries(LAYERS.map((l) => [l, on])) as LayerVisibility);
}
