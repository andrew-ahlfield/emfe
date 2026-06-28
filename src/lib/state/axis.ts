/**
 * Axis & scale display options. Both off by default — the bare frequency axis is the
 * baseline; sci-notation (10ⁿ) and the wavelength (λ) row are opt-in overlays.
 */

import { writable } from 'svelte/store';

export interface AxisOptions {
	/** Append scientific-notation (10ⁿ) labels to the axis ticks. */
	showExp: boolean;
	/** Show a wavelength (λ, metres) row beneath the frequency ticks. */
	showLambda: boolean;
	/**
	 * Render the visible-light rainbow at its true (sub-pixel-when-zoomed-out) width instead of
	 * the legibility-exaggerated default. Off by default: the rainbow is gently widened when
	 * zoomed out so it's visible, and converges to accurate as you zoom in.
	 */
	accurateVisible: boolean;
}

export const axisOptions = writable<AxisOptions>({
	showExp: false,
	showLambda: false,
	accurateVisible: false
});

/** Toggle scientific-notation labels. */
export function toggleExp(): void {
	axisOptions.update((o) => ({ ...o, showExp: !o.showExp }));
}

/** Toggle the wavelength row. */
export function toggleLambda(): void {
	axisOptions.update((o) => ({ ...o, showLambda: !o.showLambda }));
}

/** Toggle physically-accurate (un-exaggerated) visible-band rendering. */
export function toggleAccurateVisible(): void {
	axisOptions.update((o) => ({ ...o, accurateVisible: !o.accurateVisible }));
}
