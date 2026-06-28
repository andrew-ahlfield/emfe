/**
 * Spectrum reference tables: the seven great regions and the twelve ITU radio bands,
 * plus gradient-stop generation for the continuous band. Frequencies in Hz.
 *
 * Pure module: no DOM, no Svelte, no app state. Colors are referenced as CSS-variable
 * strings (e.g. `var(--region-radio)`) — never literal hex — so theming stays centralized.
 */

import { clamp01, logPos, type FreqDomain } from './scale';
import type { RegionId } from '$lib/data/types';

export interface Region {
	id: RegionId;
	label: string;
	/** Inclusive frequency extent [low, high], Hz. Regions tile the whole spectrum. */
	lo: number;
	hi: number;
	/** CSS custom property holding this region's color. */
	colorVar: string;
}

/** The seven regions, low → high frequency, tiling 1 Hz … 10²⁴ Hz contiguously. */
export const REGIONS: Region[] = [
	{ id: 'radio', label: 'Radio', lo: 1, hi: 3e8, colorVar: 'var(--region-radio)' },
	{ id: 'microwave', label: 'Microwave', lo: 3e8, hi: 3e11, colorVar: 'var(--region-microwave)' },
	{ id: 'infrared', label: 'Infrared', lo: 3e11, hi: 4e14, colorVar: 'var(--region-infrared)' },
	{ id: 'visible', label: 'Visible', lo: 4e14, hi: 7.9e14, colorVar: 'var(--region-visible)' },
	{ id: 'uv', label: 'UV', lo: 7.9e14, hi: 3e16, colorVar: 'var(--region-uv)' },
	{ id: 'xray', label: 'X-ray', lo: 3e16, hi: 3e19, colorVar: 'var(--region-xray)' },
	{ id: 'gamma', label: 'Gamma', lo: 3e19, hi: 1e24, colorVar: 'var(--region-gamma)' }
];

export interface ItuBand {
	abbr: string;
	name: string;
	lo: number;
	hi: number;
}

/** The twelve ITU bands, ELF → THF (3 Hz … 3 THz) — the radio portion only. */
export const ITU_BANDS: ItuBand[] = [
	{ abbr: 'ELF', name: 'Extremely low frequency', lo: 3, hi: 30 },
	{ abbr: 'SLF', name: 'Super low frequency', lo: 30, hi: 300 },
	{ abbr: 'ULF', name: 'Ultra low frequency', lo: 300, hi: 3e3 },
	{ abbr: 'VLF', name: 'Very low frequency', lo: 3e3, hi: 3e4 },
	{ abbr: 'LF', name: 'Low frequency', lo: 3e4, hi: 3e5 },
	{ abbr: 'MF', name: 'Medium frequency', lo: 3e5, hi: 3e6 },
	{ abbr: 'HF', name: 'High frequency', lo: 3e6, hi: 3e7 },
	{ abbr: 'VHF', name: 'Very high frequency', lo: 3e7, hi: 3e8 },
	{ abbr: 'UHF', name: 'Ultra high frequency', lo: 3e8, hi: 3e9 },
	{ abbr: 'SHF', name: 'Super high frequency', lo: 3e9, hi: 3e10 },
	{ abbr: 'EHF', name: 'Extremely high frequency', lo: 3e10, hi: 3e11 },
	{ abbr: 'THF', name: 'Tremendously high frequency', lo: 3e11, hi: 3e12 }
];

/** Physical spectral colors for the visible band (red → violet), as CSS variables. */
const SPECTRAL = [
	'var(--spectral-red)',
	'var(--spectral-orange)',
	'var(--spectral-yellow)',
	'var(--spectral-green)',
	'var(--spectral-cyan)',
	'var(--spectral-blue)',
	'var(--spectral-violet)'
];

export interface GradientStop {
	/** Position along the band, 0–1. */
	offset: number;
	/** CSS color (a `var(--…)` string). */
	color: string;
	/** Stop opacity, 0–1. */
	opacity: number;
}

/**
 * Build the continuous band's gradient stops for a visible domain.
 *
 * Each region keeps a **solid colour core** but its boundaries **crossfade** into the
 * neighbouring region rather than meeting at a hard edge — the spectrum is a continuum, not a
 * set of quantised buckets, and the gradient should read that way. The band also fades to
 * transparent at **both** ends (below ELF and above gamma), since asymptotically there is
 * always a lower and a higher frequency. The visible region renders as a true-colour rainbow
 * whose red/violet ends blend into infrared and ultraviolet — always at its physically accurate
 * width (zoom in to see it; nothing here is exaggerated).
 */
export function bandGradientStops(domain: FreqDomain): GradientStop[] {
	/** Fraction of each region's width handed to the boundary crossfade on each side. */
	const BLEND = 0.3;
	const stops: GradientStop[] = [];
	const push = (offset: number, color: string, opacity: number) =>
		stops.push({ offset: clamp01(offset), color, opacity });

	push(0, 'var(--region-radio)', 0); // transparent low-frequency end
	REGIONS.forEach((r) => {
		const lo = logPos(r.lo, domain);
		const hi = logPos(r.hi, domain);
		const w = hi - lo;
		if (r.id === 'visible') {
			SPECTRAL.forEach((c, i) => push(lo + (w * i) / (SPECTRAL.length - 1), c, 1));
			return;
		}
		// Solid core; the gaps to the neighbours' cores are where the gradient blends.
		push(lo + BLEND * w, r.colorVar, 1);
		push(hi - BLEND * w, r.colorVar, 1);
	});
	push(1, 'var(--region-gamma)', 0); // transparent high-frequency end

	return stops;
}
