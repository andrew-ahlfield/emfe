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
}

export const axisOptions = writable<AxisOptions>({ showExp: false, showLambda: false });

/** Toggle scientific-notation labels. */
export function toggleExp(): void {
	axisOptions.update((o) => ({ ...o, showExp: !o.showExp }));
}

/** Toggle the wavelength row. */
export function toggleLambda(): void {
	axisOptions.update((o) => ({ ...o, showLambda: !o.showLambda }));
}
