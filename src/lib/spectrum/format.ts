/**
 * Frequency + wavelength formatting, ported from the prototype's `fmtFreq` / `fmtLambda`
 * and extended across the full spectrum (Hz → YHz, km → fm).
 *
 * Pure module: no DOM, no Svelte, no app state.
 */

import { freqToWavelength } from './scale';

/** Frequency unit ladder, largest first. */
const FREQ_UNITS: ReadonlyArray<readonly [string, number]> = [
	['YHz', 1e24],
	['ZHz', 1e21],
	['EHz', 1e18],
	['PHz', 1e15],
	['THz', 1e12],
	['GHz', 1e9],
	['MHz', 1e6],
	['kHz', 1e3],
	['Hz', 1]
];

/** Wavelength unit ladder, largest first. */
const LAMBDA_UNITS: ReadonlyArray<readonly [string, number]> = [
	['km', 1e3],
	['m', 1],
	['cm', 1e-2],
	['mm', 1e-3],
	['µm', 1e-6],
	['nm', 1e-9],
	['pm', 1e-12],
	['fm', 1e-15]
];

/** Round to a tidy precision: integers ≥ 10, two decimals below. */
function tidy(value: number): number {
	return value >= 10 ? Math.round(value) : Number(value.toFixed(2));
}

/**
 * Format a frequency (Hz) with an SI-prefixed unit, e.g. `2.45 GHz`, `98 MHz`, `1 YHz`.
 * Values below 1 Hz degrade gracefully to plain hertz.
 */
export function fmtFreq(hz: number): string {
	for (const [name, scale] of FREQ_UNITS) {
		if (hz >= scale) return `${tidy(hz / scale)} ${name}`;
	}
	return `${tidy(hz)} Hz`;
}

/**
 * Format a list of axis-tick frequencies in one shared SI unit, with just enough decimal places
 * to tell neighbours `step` Hz apart. Plain {@link fmtFreq} rounds 26.9/27.0/27.1 MHz all to
 * "27 MHz"; deep in a zoom that hides the band's width, so the adaptive ruler uses this instead.
 */
export function fmtFreqTicks(values: number[], step: number): string[] {
	if (values.length === 0) return [];
	const peak = Math.max(...values.map((v) => Math.abs(v)));
	const [name, scale] = FREQ_UNITS.find(([, s]) => peak >= s) ?? ['Hz', 1];
	const decimals = Math.min(6, Math.max(0, -Math.floor(Math.log10(step / scale) + 1e-9)));
	return values.map((v) => `${(v / scale).toFixed(decimals)} ${name}`);
}

/**
 * Format a wavelength (metres) with an SI-prefixed unit, e.g. `12 cm`, `550 nm`.
 * Returns `—` for non-finite or non-positive input.
 */
export function fmtLambda(metres: number): string {
	if (!Number.isFinite(metres) || metres <= 0) return '—';
	for (const [name, scale] of LAMBDA_UNITS) {
		if (metres >= scale) return `${tidy(metres / scale)} ${name}`;
	}
	return '—';
}

/** Format the wavelength of a frequency (Hz), e.g. `fmtWavelengthOf(98e6) → "3.06 m"`. */
export function fmtWavelengthOf(hz: number): string {
	return fmtLambda(freqToWavelength(hz));
}

const SUPERSCRIPTS: Record<string, string> = {
	'0': '⁰',
	'1': '¹',
	'2': '²',
	'3': '³',
	'4': '⁴',
	'5': '⁵',
	'6': '⁶',
	'7': '⁷',
	'8': '⁸',
	'9': '⁹',
	'-': '⁻'
};

/** Render a number as Unicode superscript digits (e.g. `-12 → "⁻¹²"`). */
export function toSuperscript(n: number | string): string {
	return String(n)
		.split('')
		.map((c) => SUPERSCRIPTS[c] ?? c)
		.join('');
}

/** Scientific-notation power-of-ten label, e.g. `fmtExp(9) → "10⁹"`. */
export function fmtExp(exp: number): string {
	return `10${toSuperscript(exp)}`;
}
