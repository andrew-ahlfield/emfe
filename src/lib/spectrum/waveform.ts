/**
 * Oscilloscope geometry for a non-quantized multi-mode signal — the maths behind the little scope
 * the inspector draws for a {@link Allocation.modes} entry (the Schumann resonance). We sum the
 * modes as sinusoids (a fundamental + overtones, amplitudes rolling off) and sample the result into
 * an SVG trace, so the reader *sees* a continuous, beating waveform rather than a row of sharp lines
 * — the whole point being that a cavity resonance is a wave, not a quantum.
 *
 * Deterministic (fixed phases): same input → same path, so SSR and hydration agree and it's testable.
 *
 * Pure module: no DOM, no Svelte, no app state (SPEC §Boundaries).
 */

/** One resonance mode: centre frequency, bandwidth, and relative amplitude (peak at the fundamental). */
export interface ResonanceMode {
	hz: number;
	bw: number;
	amp: number;
}

export interface ScopeGeometry {
	/** SVG path `d` for the waveform trace, within a [0,w] × [0,h] box. */
	trace: string;
	/** y of the centre (zero) line. */
	midline: number;
	/** x positions of the interior vertical graticule lines. */
	vGrid: number[];
	/** y positions of the interior horizontal graticule lines. */
	hGrid: number[];
	/** Time window shown across the full width, in seconds — for the x-axis unit label. */
	durationS: number;
}

export interface ScopeOptions {
	/** Sample count along the trace (resolution). */
	samples?: number;
	/** Fundamental cycles to show across the width. */
	cycles?: number;
	/** Vertical graticule divisions. */
	cols?: number;
	/** Horizontal graticule divisions. */
	rows?: number;
}

/**
 * Build the scope geometry for a set of resonance `modes` within a `w`×`h` screen. The trace is the
 * normalized sum Σ ampₖ·sin(2π fₖ t + φₖ) over a window of `cycles` of the fundamental, using each
 * mode's *real* relative amplitude — so the fundamental dominates and the waveform "bells down" the
 * series, as the cavity actually does. Fixed phases keep it deterministic while the harmonics beat.
 */
export function resonanceScope(
	modes: ResonanceMode[],
	w: number,
	h: number,
	opts: ScopeOptions = {}
): ScopeGeometry {
	const { samples = 260, cycles = 3.5, cols = 8, rows = 4 } = opts;
	const midline = h / 2;
	const vGrid = Array.from({ length: cols - 1 }, (_, i) => ((i + 1) * w) / cols);
	const hGrid = Array.from({ length: rows - 1 }, (_, i) => ((i + 1) * h) / rows);

	if (modes.length === 0) return { trace: '', midline, vGrid, hGrid, durationS: 0 };

	const f0 = Math.min(...modes.map((m) => m.hz));
	const dur = cycles / f0;
	const phases = modes.map((_, i) => (i * 1.9) % (2 * Math.PI));
	const norm = modes.reduce((s, m) => s + m.amp, 0);
	const amplitudePx = h * 0.42;

	const pts: string[] = [];
	for (let s = 0; s <= samples; s++) {
		const t = (s / samples) * dur;
		let y = 0;
		for (let k = 0; k < modes.length; k++) {
			y += modes[k].amp * Math.sin(2 * Math.PI * modes[k].hz * t + phases[k]);
		}
		const x = ((s / samples) * w).toFixed(1);
		const yp = (midline - (y / norm) * amplitudePx).toFixed(1);
		pts.push(`${x},${yp}`);
	}
	return { trace: `M ${pts.join(' L ')}`, midline, vGrid, hGrid, durationS: dur };
}
