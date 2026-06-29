/**
 * Axis tick generation — pure and testable (the rendering lives in Axis.svelte).
 *
 * Two regimes, chosen by how many decades are on screen:
 *  - **Sub-decade** (< ~1.2 decades): round 1-2-5 frequencies, so you can read a single band's
 *    width to the kHz (e.g. the CB channels). Linear ticks are fine here because the window is
 *    narrow enough that they don't bunch up on the log axis.
 *  - **Multi-decade**: powers of ten, with the *label* interval and the 2–9 minor ticks both
 *    chosen from the on-screen width so the ruler is never sparse (one label roughly every
 *    ~110 px) and never an unreadable thicket. Labels are anchored to the left edge so an
 *    arbitrary 3-decade window can't collapse to a single "1 GHz".
 */

import { logPos, niceTicks, type FreqDomain } from './scale';
import {
	fmtEvTicks,
	fmtFreq,
	fmtFreqTicks,
	fmtLambdaTicks,
	fmtPhotonEv,
	fmtWavelengthOf,
	sciParts
} from './format';

export interface AxisTick {
	id: string;
	x: number;
	/** Emphasised (taller) tick — the labelled ones. */
	major: boolean;
	/** Whether this tick carries a label. */
	labeled: boolean;
	/** SI-prefixed label, e.g. "10 MHz" / "27.0 MHz" (shown when sci-notation is off). */
	plain: string;
	/** Scientific-notation mantissa + exponent, e.g. 5 ×10⁶ (shown when sci-notation is on). */
	mant: string;
	sexp: number;
	lambda: string;
	/** Photon energy E = hν label, e.g. "2 eV" / "12.4 keV" (shown when the eV row is on). */
	ev: string;
}

/** Below this many visible decades, use the 1-2-5 sub-decade ruler. */
const SUBDECADE_MAX = 1.2;
/** Target spacing between labels (px) — drives the decade label interval when zoomed far out. */
const LABEL_TARGET_PX = 90;
/** A decade at least this wide (px) gets 1·2·5 labels; otherwise just its power-of-ten. */
const LABEL_125_DECADE_PX = 175;
/** Power-of-ten labels show on every decade while each is at least this wide (px). */
const LABEL_EACH_DECADE_PX = 110;
/** Show 2–9 minor ticks per decade only while each decade is at least this wide (px). */
const MINOR_MIN_DECADE_PX = 55;

/** Build the axis ticks for a view. Pure: positions are in px for the given plot `width`. */
export function axisTicks(domain: FreqDomain, width: number): AxisTick[] {
	const span = domain.maxExp - domain.minExp;
	const xOf = (hz: number) => logPos(hz, domain) * width;

	// ── Sub-decade: round 1-2-5 ticks (+ minors at a fifth of the step) ──────────────────────
	if (span < SUBDECADE_MAX) {
		const lo = 10 ** domain.minExp;
		const hi = 10 ** domain.maxExp;
		const values = niceTicks(lo, hi);
		const step = values.length > 1 ? values[1] - values[0] : values[0] || 1;
		const labels = fmtFreqTicks(values, step);
		// Wavelength and energy gain a digit too at this zoom: plain per-value formatting would round
		// every tick to the same "11 m" / "2 eV"; these share a unit and add just enough decimals.
		const lambdas = fmtLambdaTicks(values);
		const evs = fmtEvTicks(values);
		const out: AxisTick[] = values
			.map((hz, i): AxisTick => {
				const sci = sciParts(hz, step);
				return {
					id: `n${hz}`,
					x: xOf(hz),
					major: true,
					labeled: true,
					plain: labels[i],
					mant: sci.mant,
					sexp: sci.exp,
					lambda: lambdas[i],
					ev: evs[i]
				};
			})
			.filter((t) => t.x >= 0 && t.x <= width);

		const minorStep = step / 5;
		for (let v = Math.ceil(lo / minorStep) * minorStep; v <= hi; v += minorStep) {
			if (Math.abs(v / step - Math.round(v / step)) < 1e-6) continue; // sits on a major
			const x = xOf(v);
			if (x < 0 || x > width) continue;
			out.push({
				id: `m${v}`,
				x,
				major: false,
				labeled: false,
				plain: '',
				mant: '',
				sexp: 0,
				lambda: '',
				ev: ''
			});
		}
		return out;
	}

	// ── Multi-decade: log-axis ruler with a width-aware label density ─────────────────────────
	// Per decade, how wide it is on screen decides what we *label*: a roomy decade gets 1·2·5
	// (three labels), a tighter one just its power-of-ten, and when even that's too dense we thin
	// to every Nth power (anchored to the left edge so an offset window can't go near-blank).
	const decadePx = width / span;
	const label125 = decadePx >= LABEL_125_DECADE_PX;
	const labelEachPower = decadePx >= LABEL_EACH_DECADE_PX;
	const labelStep = Math.max(1, Math.ceil(span / Math.max(width / LABEL_TARGET_PX, 1)));
	const showMinors = decadePx >= MINOR_MIN_DECADE_PX;
	const firstExp = Math.ceil(domain.minExp);

	const out: AxisTick[] = [];
	for (let exp = Math.floor(domain.minExp); exp <= Math.ceil(domain.maxExp); exp++) {
		const powerLabeled = labelEachPower
			? true
			: (((exp - firstExp) % labelStep) + labelStep) % labelStep === 0;
		for (let m = 1; m <= 9; m++) {
			const labeled = m === 1 ? powerLabeled : label125 && (m === 2 || m === 5);
			// Only emit a tick that's a labelled value or (when shown) a minor; skip the rest.
			if (!(m === 1 || labeled || showMinors)) continue;
			const v = m * 10 ** exp;
			const x = xOf(v);
			if (x < -1 || x > width + 1) continue;
			const sci = sciParts(v, v);
			out.push({
				id: `t${exp}_${m}`,
				x,
				major: labeled,
				labeled,
				plain: labeled ? fmtFreq(v) : '',
				mant: sci.mant,
				sexp: sci.exp,
				lambda: labeled ? fmtWavelengthOf(v) : '',
				ev: labeled ? fmtPhotonEv(v) : ''
			});
		}
	}
	return out;
}

/**
 * The largest gap (px) between adjacent labelled ticks, including the gaps from each edge — a
 * direct measure of how sparse the ruler is. Used by the axis-density test.
 */
export function maxLabelGap(ticks: AxisTick[], width: number): number {
	const xs = ticks
		.filter((t) => t.labeled)
		.map((t) => t.x)
		.sort((a, b) => a - b);
	if (xs.length === 0) return width;
	let gap = xs[0]; // left edge → first label
	for (let i = 1; i < xs.length; i++) gap = Math.max(gap, xs[i] - xs[i - 1]);
	gap = Math.max(gap, width - xs[xs.length - 1]); // last label → right edge
	return gap;
}
