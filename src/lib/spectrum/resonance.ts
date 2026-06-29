/**
 * Frequency-spectrum geometry for a non-quantized multi-mode signal — the little chart the inspector
 * draws for the Schumann resonance. We sum each mode as a broad Lorentzian peak (amplitude rolling
 * off up the series, width set by a low Q) and sample the envelope into an SVG curve, so the reader
 * sees the modes "bell down" from the fundamental as *broad bumps* — the visual opposite of the
 * sharp, fixed lines of a quantized emitter. A spectrum (not a time trace) reads at a glance: peaks
 * sit at labelled frequencies, with no risk of being mistaken for a single transient.
 *
 * Deterministic and pure: no DOM, no Svelte, no app state (SPEC §Boundaries).
 */

export interface SpectrumGeometry {
	/** SVG path `d` for the spectrum envelope (a line across the top of the peaks). */
	curve: string;
	/** SVG path `d` for the filled area under the curve. */
	area: string;
	/** y of the baseline (zero level). */
	baseline: number;
	/** Each mode's x position and frequency (Hz) — for the x-axis labels / drop-lines. */
	peaks: { x: number; hz: number }[];
	/** y positions of the interior horizontal graticule lines. */
	hGrid: number[];
	/** Frequency range shown across the full width. */
	fMin: number;
	fMax: number;
}

export interface SpectrumOptions {
	/** Sample count along the curve. */
	samples?: number;
	/** Quality factor → peak width (HWHM = f / 2Q). Schumann is low-Q (≈4–6). */
	q?: number;
	/** Amplitude roll-off per mode: ampₖ = e^(−falloff·k). Tuned to the measured belling-down. */
	falloff?: number;
	/** Horizontal graticule divisions. */
	rows?: number;
}

/**
 * Build the spectrum geometry for resonance modes at `freqs` (Hz) within a `w`×`h` screen. The
 * envelope is Σ ampₖ · Lorentzian(f; fₖ, HWHMₖ), normalized so the tallest peak (the fundamental)
 * nearly fills the height.
 */
export function resonanceSpectrum(
	freqs: number[],
	w: number,
	h: number,
	opts: SpectrumOptions = {}
): SpectrumGeometry {
	const { samples = 240, q = 5, falloff = 0.3, rows = 4 } = opts;
	const baseline = h - 1;
	const hGrid = Array.from({ length: rows - 1 }, (_, i) => ((i + 1) * h) / rows);

	const sorted = [...freqs].sort((a, b) => a - b);
	if (sorted.length === 0) {
		return { curve: '', area: '', baseline, peaks: [], hGrid, fMin: 0, fMax: 1 };
	}

	const f0 = sorted[0];
	const fN = sorted[sorted.length - 1];
	const spacing = sorted.length > 1 ? (fN - f0) / (sorted.length - 1) : f0;
	const fMin = Math.max(0, f0 - spacing * 0.7);
	const fMax = fN + spacing * 0.7;
	const span = fMax - fMin;

	const amps = sorted.map((_, i) => Math.exp(-falloff * i));
	const hwhm = sorted.map((f) => f / (2 * q));
	const xOf = (f: number) => ((f - fMin) / span) * w;

	const envelope = (f: number): number => {
		let v = 0;
		for (let k = 0; k < sorted.length; k++) {
			const d = (f - sorted[k]) / hwhm[k];
			v += amps[k] / (1 + d * d);
		}
		return v;
	};

	// Two passes: sample, then normalize so the tallest peak nearly fills the height.
	const ys: number[] = [];
	let peakV = 0;
	for (let s = 0; s <= samples; s++) {
		const v = envelope(fMin + (s / samples) * span);
		ys.push(v);
		if (v > peakV) peakV = v;
	}
	const scale = (0.86 * h) / (peakV || 1);

	const pts = ys.map((v, s) => {
		const x = ((s / samples) * w).toFixed(1);
		const y = (baseline - v * scale).toFixed(1);
		return `${x},${y}`;
	});
	const curve = `M ${pts.join(' L ')}`;
	const area = `M 0,${baseline.toFixed(1)} L ${pts.join(' L ')} L ${w.toFixed(1)},${baseline.toFixed(1)} Z`;

	const peaks = sorted.map((hz) => ({ x: xOf(hz), hz }));
	return { curve, area, baseline, peaks, hGrid, fMin, fMax };
}
