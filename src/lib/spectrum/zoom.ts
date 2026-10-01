/**
 * Zoom / pan math for the log-frequency view: pure, in log10(Hz) space.
 *
 * The app's source of truth is `{ centerExp, zoom }` (see `state/view.ts`); these helpers
 * map a user gesture (wheel-zoom about the cursor, shift-wheel pan) to the next view state.
 * `zoom` is linear magnification: 1 shows the whole `full` domain, 2 shows half the decades.
 *
 * Pure module: no DOM, no Svelte, no app state (SPEC §Boundaries). The DOM event wiring
 * lives in `src/lib/actions/zoom.ts`.
 */

import { decades, windowDomain, type FreqDomain } from './scale';

/** The view state these helpers read and produce (structurally `ViewState`). */
export interface ZoomView {
	centerExp: number;
	zoom: number;
}

/**
 * Magnification bounds: 1 = whole spectrum. Max is deep enough (~0.0007-decade window, well under
 * 1 MHz around 460 MHz) to resolve the *individual numbered channels* of the tightest plans:
 * walkie-talkie and MURS channels sit only 12.5 kHz apart and must spread out enough to label.
 */
export const ZOOM_RANGE = { min: 1, max: 32768 } as const;

/** Clamp a magnification into {@link ZOOM_RANGE}. */
export function clampZoom(zoom: number): number {
	return Math.min(Math.max(zoom, ZOOM_RANGE.min), ZOOM_RANGE.max);
}

/** Clamp a center exponent so the resulting window never extends past `full`. */
export function clampCenter(centerExp: number, full: FreqDomain, zoom: number): number {
	const half = decades(full) / clampZoom(zoom) / 2;
	const lo = full.minExp + half;
	const hi = full.maxExp - half;
	// When fully zoomed out the window spans `full` exactly: lo === hi.
	if (lo >= hi) return (full.minExp + full.maxExp) / 2;
	return Math.min(Math.max(centerExp, lo), hi);
}

/**
 * Zoom by `factor` (>1 in, <1 out) while keeping the frequency under the cursor fixed.
 * `anchor01` is the cursor's normalized position across the *visible* window (0 = left edge).
 */
export function zoomAbout(
	view: ZoomView,
	full: FreqDomain,
	anchor01: number,
	factor: number
): ZoomView {
	const dom = windowDomain(full, view.centerExp, view.zoom);
	const anchorExp = dom.minExp + anchor01 * (dom.maxExp - dom.minExp);

	const zoom = clampZoom(view.zoom * factor);
	const span = decades(full) / zoom;
	// Solve for the center that leaves anchorExp at anchor01 in the new window.
	const center = anchorExp - anchor01 * span + span / 2;
	return { centerExp: clampCenter(center, full, zoom), zoom };
}

/**
 * Pan the view horizontally by a `fraction` of the visible span (positive → higher frequency).
 * Magnification is unchanged.
 */
export function panByFraction(view: ZoomView, full: FreqDomain, fraction: number): ZoomView {
	const zoom = clampZoom(view.zoom);
	const span = decades(full) / zoom;
	return { centerExp: clampCenter(view.centerExp + fraction * span, full, zoom), zoom };
}
