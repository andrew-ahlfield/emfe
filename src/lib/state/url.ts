/**
 * Deep-link (de)serialization: a compact, lossless mapping between the explorer's view state
 * and the URL query string. Only **non-default** dimensions are written, so a pristine view
 * yields an empty query and shared links stay short. Decoding is total — every missing or
 * malformed parameter degrades to its safe default.
 *
 * Pure module: no DOM, no stores. The component owns reading/writing `window.location`.
 */

import { LAYERS, LICENSE_RANKS, type LayerId, type LicenseRank } from '$lib/data/types';
import { FULL_DOMAIN, type FreqDomain } from '$lib/spectrum/scale';
import { clampZoom, clampCenter } from '$lib/spectrum/zoom';
import type { Theme } from './theme';

/** A complete snapshot of the deep-linkable view state. */
export interface DeepLinkSnapshot {
	centerExp: number;
	zoom: number;
	layers: Record<LayerId, boolean>;
	license: LicenseRank;
	theme: Theme;
	selected: string | null;
}

const DEFAULT_LICENSE: LicenseRank = 'extra';
const DEFAULT_THEME: Theme = 'dark';
const midExp = (full: FreqDomain) => (full.minExp + full.maxExp) / 2;

const allLayersOn = (): Record<LayerId, boolean> =>
	Object.fromEntries(LAYERS.map((l) => [l, true])) as Record<LayerId, boolean>;

/** Drop trailing zeros from a fixed-precision number string (e.g. "2.50" → "2.5"). */
function trim(n: number, places: number): string {
	return String(Number(n.toFixed(places)));
}

/** Serialize a snapshot to a query string (without the leading "?"). Defaults are omitted. */
export function encodeState(s: DeepLinkSnapshot): string {
	const params = new URLSearchParams();

	// Center only matters once zoomed in (at zoom 1 the window is the whole spectrum).
	if (s.zoom > 1) {
		params.set('z', trim(s.zoom, 2));
		params.set('c', trim(s.centerExp, 2));
	}
	const off = LAYERS.filter((l) => !s.layers[l]);
	if (off.length > 0) params.set('off', off.join(','));
	if (s.license !== DEFAULT_LICENSE) params.set('lic', s.license);
	if (s.theme !== DEFAULT_THEME) params.set('t', s.theme);
	if (s.selected) params.set('sel', s.selected);

	return params.toString();
}

function parseLayers(raw: string | null): Record<LayerId, boolean> {
	const layers = allLayersOn();
	if (!raw) return layers;
	for (const id of raw.split(',')) {
		if ((LAYERS as readonly string[]).includes(id)) layers[id as LayerId] = false;
	}
	return layers;
}

/**
 * Decode a query string into a complete snapshot. Every field falls back to its default when
 * the parameter is absent or malformed, so partial/garbage URLs never throw.
 *
 * The `selected` id is returned as-is (or null); the caller validates it against the dataset.
 */
export function decodeState(
	params: URLSearchParams,
	full: FreqDomain = FULL_DOMAIN
): DeepLinkSnapshot {
	const rawZoom = Number(params.get('z'));
	const zoom = Number.isFinite(rawZoom) && rawZoom > 0 ? clampZoom(rawZoom) : 1;

	const rawCenter = Number(params.get('c'));
	const centerExp = clampCenter(Number.isFinite(rawCenter) ? rawCenter : midExp(full), full, zoom);

	const rawLic = params.get('lic');
	const license: LicenseRank = (LICENSE_RANKS as readonly string[]).includes(rawLic ?? '')
		? (rawLic as LicenseRank)
		: DEFAULT_LICENSE;

	const theme: Theme = params.get('t') === 'light' ? 'light' : 'dark';

	const sel = params.get('sel');
	const selected = sel && sel.length > 0 ? sel : null;

	return { centerExp, zoom, layers: parseLayers(params.get('off')), license, theme, selected };
}

/** Whether two snapshots differ in a *discrete* dimension (anything other than zoom/pan). */
export function discreteChanged(a: DeepLinkSnapshot, b: DeepLinkSnapshot): boolean {
	if (a.license !== b.license || a.theme !== b.theme || a.selected !== b.selected) return true;
	return LAYERS.some((l) => a.layers[l] !== b.layers[l]);
}
