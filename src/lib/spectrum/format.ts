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

/**
 * Photon-energy unit ladder, largest first (E = hν). Radio photons land in neV–feV; visible light
 * near 2 eV; X-rays in keV; nuclear γ-rays in MeV and up.
 */
const ENERGY_UNITS: ReadonlyArray<readonly [string, number]> = [
	['TeV', 1e12],
	['GeV', 1e9],
	['MeV', 1e6],
	['keV', 1e3],
	['eV', 1],
	['meV', 1e-3],
	['µeV', 1e-6],
	['neV', 1e-9],
	['peV', 1e-12],
	['feV', 1e-15]
];

/** Planck's constant in eV·s, for converting a frequency to its photon energy. */
const PLANCK_EV = 4.135667696e-15;

/** Round to a tidy precision: integers ≥ 10, two decimals below. */
function tidy(value: number): number {
	return value >= 10 ? Math.round(value) : Number(value.toFixed(2));
}

/**
 * Format a frequency (Hz) as its photon energy E = hν, e.g. `fmtPhotonEv(4.8e14) → "2 eV"`,
 * `fmtPhotonEv(3e18) → "12.4 keV"`. Energies below a femto-eV degrade to scientific notation.
 */
export function fmtPhotonEv(hz: number): string {
	const eV = PLANCK_EV * hz;
	for (const [name, scale] of ENERGY_UNITS) {
		if (eV >= scale) return `${tidy(eV / scale)} ${name}`;
	}
	return `${eV.toExponential(1)} eV`;
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
 * Format a frequency to its exact value in the natural SI unit, keeping up to three decimals and
 * trimming trailing zeros — for a precise designation label like `146.52 MHz` or `121.5 MHz` that
 * {@link fmtFreq}'s "round ≥10 to an integer" tidying would otherwise mangle to `147 MHz`.
 */
export function fmtFreqShort(hz: number): string {
	for (const [name, scale] of FREQ_UNITS) {
		if (hz >= scale) {
			const s = (hz / scale).toFixed(3).replace(/\.?0+$/, '');
			return `${s} ${name}`;
		}
	}
	return `${hz} Hz`;
}

/**
 * Mantissa + exponent for scientific-notation tick labels, e.g. `5×10⁶ Hz`. `step` (the spacing
 * to the next tick) sets how many mantissa decimals are needed to keep neighbours distinct, so
 * 2.6/2.7/2.8 ×10⁷ don't all collapse to 3×10⁷.
 */
export function sciParts(value: number, step: number): { mant: string; exp: number } {
	if (!(value > 0)) return { mant: '0', exp: 0 };
	const exp = Math.floor(Math.log10(value) + 1e-9);
	const mantissa = value / 10 ** exp;
	const mantStep = step / 10 ** exp;
	const decimals = Math.min(3, Math.max(0, -Math.floor(Math.log10(mantStep) + 1e-9)));
	return { mant: mantissa.toFixed(decimals), exp };
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
 * Format a list of values onto one shared unit from `units`, with just enough decimals that no two
 * neighbours collapse to the same printed number. The deciding step is the smallest gap between
 * adjacent values (the array need not be sorted); the shared `maxDecimals` cap keeps things sane.
 */
function fmtLadderTicks(
	values: number[],
	units: ReadonlyArray<readonly [string, number]>,
	maxDecimals = 4
): string[] {
	if (values.length === 0) return [];
	const peak = Math.max(...values.map((v) => Math.abs(v)));
	const [name, scale] = units.find(([, s]) => peak >= s) ?? ['', 1];
	const sorted = [...values].sort((a, b) => a - b);
	let step = Infinity;
	for (let i = 1; i < sorted.length; i++) {
		const d = sorted[i] - sorted[i - 1];
		if (d > 0) step = Math.min(step, d);
	}
	if (!Number.isFinite(step) || step <= 0) step = peak;
	const decimals = Math.min(maxDecimals, Math.max(0, -Math.floor(Math.log10(step / scale) + 1e-9)));
	return values.map((v) => `${(v / scale).toFixed(decimals)} ${name}`);
}

/**
 * Wavelength labels for a set of axis-tick frequencies, sharing one unit and carrying enough
 * decimals to stay distinct. Deep in a zoom, plain {@link fmtWavelengthOf} rounds every tick to the
 * same "11 m" / "12 cm"; this gains the digit needed to read the window's true span.
 */
export function fmtLambdaTicks(values: number[]): string[] {
	return fmtLadderTicks(values.map(freqToWavelength), LAMBDA_UNITS);
}

/**
 * Photon-energy (E = hν) labels for a set of axis-tick frequencies, with adaptive decimals — the
 * eV counterpart to {@link fmtLambdaTicks}, so a zoomed-in ruler doesn't print "2 eV" on every tick.
 */
export function fmtEvTicks(values: number[]): string[] {
	return fmtLadderTicks(
		values.map((hz) => PLANCK_EV * hz),
		ENERGY_UNITS
	);
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
