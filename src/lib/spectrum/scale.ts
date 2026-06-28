/**
 * Log-frequency scale math — the heart of the explorer.
 *
 * We work entirely in *log10 space* (domain ≈ 0–24), so the ~24-orders-of-magnitude
 * range is never a precision problem. A `FreqDomain` is just the visible exponent window;
 * `logPos` maps a frequency to its normalized [0,1] position within that window.
 *
 * Pure module: no DOM, no Svelte, no app state (SPEC §Boundaries).
 */

/** Speed of light in vacuum, m/s — for frequency ↔ wavelength conversion. */
export const SPEED_OF_LIGHT = 299_792_458;

/** A visible window of the spectrum, expressed as log10(Hz) bounds. */
export interface FreqDomain {
	/** log10 of the lowest visible frequency, in Hz. */
	minExp: number;
	/** log10 of the highest visible frequency, in Hz. */
	maxExp: number;
}

/**
 * The full spectrum: 1 Hz (10⁰) → 10²⁴ Hz (1 YHz).
 * Covers below-ELF (Schumann ≈ 7.83 Hz sits just above the floor) through gamma.
 */
export const FULL_DOMAIN: FreqDomain = { minExp: 0, maxExp: 24 };

/** Width of a domain in decades (orders of magnitude). */
export function decades(d: FreqDomain): number {
	return d.maxExp - d.minExp;
}

/** Normalized [0,1] position of a frequency on the log axis (unclamped). */
export function logPos(hz: number, d: FreqDomain): number {
	return (Math.log10(hz) - d.minExp) / (d.maxExp - d.minExp);
}

/** Inverse of {@link logPos}: the frequency (Hz) at a normalized position. */
export function posToHz(pos: number, d: FreqDomain): number {
	return 10 ** (d.minExp + pos * (d.maxExp - d.minExp));
}

/** Clamp a value to the [0,1] range (handy for off-screen positions). */
export function clamp01(v: number): number {
	return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * The visible window for a given center + zoom over a full domain.
 *
 * `zoom` is the linear magnification: `1` shows the whole `full` domain; `2` shows half the
 * decades centered on `centerExp`, etc. The window is clamped (panned back in) so it never
 * extends past `full`. This is the seam the d3-zoom integration plugs into (Task 7).
 */
export function windowDomain(full: FreqDomain, centerExp: number, zoom: number): FreqDomain {
	const span = decades(full) / Math.max(zoom, 1);
	const half = span / 2;
	let minExp = centerExp - half;
	let maxExp = centerExp + half;
	if (minExp < full.minExp) {
		minExp = full.minExp;
		maxExp = minExp + span;
	}
	if (maxExp > full.maxExp) {
		maxExp = full.maxExp;
		minExp = maxExp - span;
	}
	return { minExp: Math.max(minExp, full.minExp), maxExp: Math.min(maxExp, full.maxExp) };
}

/**
 * "Nice" 1-2-5 tick frequencies spanning the linear range [lo, hi], for the zoomed-in axis.
 *
 * The decade ruler (ticks at powers of ten) goes blank once you zoom inside a single decade —
 * e.g. framing the CB band at ~27 MHz, there's no 10ⁿ tick in view to read a width against. Here
 * we fall back to evenly-spaced round numbers (…, 2, 5, 10, 20, 50, …) so the scale stays legible
 * at any magnification. Returns ~`target` ticks; empty when the range is degenerate.
 */
export function niceTicks(lo: number, hi: number, target = 7): number[] {
	if (!(hi > lo) || !Number.isFinite(lo) || !Number.isFinite(hi)) return [];
	const rawStep = (hi - lo) / target;
	const mag = 10 ** Math.floor(Math.log10(rawStep));
	const norm = rawStep / mag;
	const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
	const out: number[] = [];
	for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(v);
	return out;
}

/** Wavelength (metres) of an electromagnetic wave at the given frequency (Hz). */
export function freqToWavelength(hz: number): number {
	return SPEED_OF_LIGHT / hz;
}

/** Frequency (Hz) of an electromagnetic wave at the given wavelength (metres). */
export function wavelengthToFreq(metres: number): number {
	return SPEED_OF_LIGHT / metres;
}
