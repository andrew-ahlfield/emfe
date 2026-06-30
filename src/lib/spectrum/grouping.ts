/**
 * Semantic-zoom **group-up** layout — the "500 apartments → 6 neighbourhoods → addresses"
 * mechanic for the spectrum.
 *
 * Allocations are partitioned into contiguous-frequency **families** ("neighbourhoods" on the
 * number line). For a given view, each family either:
 *   - **expands** into its individual allocations (leaves), when there's room on screen, or
 *   - **collapses** into one labelled group chip spanning its members' real extent, or
 *   - shows nothing but its dots, when it's too small to be worth a label (the always-on
 *     region labels + ITU row carry the context at that scale).
 *
 * The expand/collapse decision is driven purely by **on-screen pixel size**, so detail
 * emerges smoothly as you zoom — and a final greedy lane-assignment pass guarantees that no
 * two labels overlap (any label that can't be placed degrades to a bare dot).
 *
 * Pure module: no DOM, no Svelte, no app state (SPEC §Boundaries). Text widths are estimated
 * from glyph-count heuristics; the rendered result is verified by scripts/overlap-check.mjs.
 */

import { logPos, type FreqDomain } from './scale';
import type { Allocation, LayerId } from '$lib/data/types';

/** A contiguous-frequency "neighbourhood" of the spectrum. `hi` is exclusive. */
export interface Family {
	id: string;
	/** Full, descriptive label (used in the chip's accessible name / inspector). */
	label: string;
	/** Compact label for the on-axis chip. */
	short: string;
	lo: number;
	hi: number;
}

/**
 * The families, low → high frequency, tiling the spectrum so every allocation lands in
 * exactly one. Radio/microwave (where the data is dense) get fine neighbourhoods; the sparse
 * optical/ionising regions map one family per region.
 */
export const FAMILIES: readonly Family[] = [
	{ id: 'elf', label: 'ELF & power-frequency', short: 'ELF', lo: 1, hi: 1e4 },
	{ id: 'vlf-lf', label: 'VLF/LF: time & navigation', short: 'VLF/LF', lo: 1e4, hi: 9e5 },
	{ id: 'mf-hf', label: 'MF/HF: AM, shortwave & ham', short: 'MF/HF', lo: 9e5, hi: 3e7 },
	{ id: 'vhf', label: 'VHF: FM, TV, air & marine', short: 'VHF', lo: 3e7, hi: 3e8 },
	{ id: 'uhf', label: 'UHF: TV, cellular & ISM', short: 'UHF', lo: 3e8, hi: 1e9 },
	{ id: 'lband', label: 'L-band: GNSS & aeronautical', short: 'L-band', lo: 1e9, hi: 1.7e9 },
	{
		id: 'sband-low',
		label: 'S-band: cellular & 2.4 GHz ISM',
		short: 'S-band',
		lo: 1.7e9,
		hi: 2.7e9
	},
	{
		id: 'sc-band',
		label: 'S/C-band: radar, Wi-Fi & satellite',
		short: 'C-band',
		lo: 2.7e9,
		hi: 7e9
	},
	{ id: 'xku-band', label: 'X/Ku-band: radar & satellite TV', short: 'X/Ku', lo: 7e9, hi: 1.8e10 },
	{ id: 'k-band', label: 'K-band: mmWave & satellite', short: 'K-band', lo: 1.8e10, hi: 4e10 },
	{ id: 'ehf', label: 'EHF: WiGig & automotive radar', short: 'EHF', lo: 4e10, hi: 3e11 },
	{ id: 'ir', label: 'Infrared', short: 'Infrared', lo: 3e11, hi: 4e14 },
	{ id: 'visible', label: 'Visible light', short: 'Visible', lo: 4e14, hi: 7.9e14 },
	{ id: 'uv', label: 'Ultraviolet', short: 'Ultraviolet', lo: 7.9e14, hi: 3e16 },
	{ id: 'xray', label: 'X-ray', short: 'X-ray', lo: 3e16, hi: 3e19 },
	{ id: 'gamma', label: 'Gamma rays', short: 'Gamma', lo: 3e19, hi: 1e24 }
] as const;

/** The family containing a frequency (Hz), or `undefined` if outside every family. */
export function familyOf(hz: number): Family | undefined {
	return FAMILIES.find((f) => hz >= f.lo && hz < f.hi);
}

// ── Layout ───────────────────────────────────────────────────────────────────────────────

/** A positioned thing to draw above the band: an expanded leaf or a collapsed group chip. */
export interface PlacedItem {
	kind: 'leaf' | 'group';
	id: string;
	/** Primary label (allocation name, or family short label). */
	label: string;
	/** Secondary line (formatted frequency for a leaf, "N signals" for a group). */
	sublabel: string;
	/** Accessible name. */
	aria: string;
	/** px x of the label anchor (centre). */
	x: number;
	/** px extent of the underlying span (leaf: its dot; group: its members' real bandwidth). */
	loX: number;
	hiX: number;
	/** Vertical lane index (0 = topmost). */
	lane: number;
	/** Members represented (1 for a leaf). */
	count: number;
	/** Content layer, for colour (groups use their dominant layer). */
	layer: LayerId;
	/** The single allocation, when this is a leaf. */
	alloc: Allocation | null;
	/** The member allocations, when this is a group. */
	members: readonly Allocation[];
}

/** A dot drawn on the band for every visible allocation, independent of label grouping. */
export interface Dot {
	id: string;
	x: number;
	layer: LayerId;
	region: Allocation['region'];
	alloc: Allocation;
}

export interface LayoutResult {
	dots: Dot[];
	items: PlacedItem[];
}

export interface LayoutOptions {
	/** Number of stacked label lanes available. */
	lanes?: number;
	/** A family narrower than this (px) shows no chip — only its dots. */
	minFamilyPx?: number;
	/** Approx px a single leaf label needs. */
	leafSlotPx?: number;
	/**
	 * Fraction of a family's members that must fit before it expands from a chip into leaves.
	 * Below 1 gives *progressive* disclosure: a neighbourhood opens up partway in and reveals
	 * more addresses as you keep zooming (overflow labels degrade to bare dots).
	 */
	expandFill?: number;
	/** Horizontal gap (px) required between adjacent labels in a lane. */
	padPx?: number;
	/** Fixed label boxes (e.g. region labels) that placement must avoid. */
	obstacles?: readonly LabelBox[];
}

/** A horizontal label extent on a given lane, for collision tests. */
export interface LabelBox {
	x0: number;
	x1: number;
	lane: number;
}

const DEFAULTS: Required<Omit<LayoutOptions, 'obstacles'>> = {
	lanes: 3,
	minFamilyPx: 44,
	leafSlotPx: 74,
	expandFill: 0.5,
	padPx: 10
};

/** Rough rendered width (px) of an allocation's two-line label. */
function leafLabelWidth(a: Allocation, freq: string): number {
	const namePx = a.name.length * 7.1; // 13.5px sans, ~0.52em avg advance
	const freqPx = freq.length * 6.7; // 11px mono, ~0.6em advance
	return Math.max(namePx, freqPx, 26);
}

/** Rough rendered width (px) of a group chip's label. */
function groupLabelWidth(short: string, count: number): number {
	return Math.max(`${short} · ${count}`.length * 7.1, 34);
}

/**
 * Lay out the visible allocations for a view: which dots to draw, and which labels (expanded
 * leaves vs. collapsed group chips) to place without overlap.
 *
 * `visible` should already be filtered by content layer + licence. `fmtFreq` is injected so
 * this module stays free of the formatting module's unit ladder (and trivially testable).
 */
export function layoutSpectrum(
	visible: readonly Allocation[],
	domain: FreqDomain,
	width: number,
	fmtFreq: (hz: number) => string,
	options: LayoutOptions = {}
): LayoutResult {
	const opt = { ...DEFAULTS, ...options };
	const obstacles = options.obstacles ?? [];
	const xOf = (hz: number) => logPos(hz, domain) * width;

	// On-screen test, anchored to the *band* (not just the centre frequency) so a wide allocation
	// keeps its bar while any part of its range is visible — even when its centre scrolls off.
	const onScreen = (a: Allocation): boolean => {
		if (a.band) return xOf(a.band[1]) >= -40 && xOf(a.band[0]) <= width + 40;
		const x = xOf(a.hz);
		return x >= -40 && x <= width + 40;
	};

	// Dots: every visible allocation whose band (or point) overlaps the plot, positioned on the band.
	const dots: Dot[] = visible
		.map((a) => ({ id: a.id, x: xOf(a.hz), layer: a.layer, region: a.region, alloc: a }))
		.filter((d) => onScreen(d.alloc));

	// Bucket the visible allocations into families, preserving frequency order.
	const byFamily = new Map<string, Allocation[]>();
	for (const a of [...visible].sort((p, q) => p.hz - q.hz)) {
		const f = familyOf(a.hz);
		if (!f) continue;
		const arr = byFamily.get(f.id);
		if (arr) arr.push(a);
		else byFamily.set(f.id, [a]);
	}

	// Pass A — decide each family's representation, producing label candidates (x-ordered).
	interface Candidate extends Omit<PlacedItem, 'lane'> {
		width: number;
	}
	const candidates: Candidate[] = [];

	const dominantLayer = (members: Allocation[]): LayerId => {
		const tally = new Map<LayerId, number>();
		for (const m of members) tally.set(m.layer, (tally.get(m.layer) ?? 0) + 1);
		return [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
	};

	const pushLeaf = (a: Allocation) => {
		const freq = fmtFreq(a.hz);
		const labelW = leafLabelWidth(a, freq);
		const centerX = xOf(a.hz);
		let x = centerX;
		let loX = centerX;
		let hiX = centerX;
		if (a.band) {
			loX = xOf(a.band[0]);
			hiX = xOf(a.band[1]);
			// Anchor the label over its on-screen slice ONLY when that slice is wide enough to host
			// the label — so a genuinely wide band keeps its label as its centre scrolls off. A narrow
			// band keeps its centre x and lets the label drop near an edge; pinning a point-wide band's
			// label to the edge made it appear to "slide" while the bar panned underneath it.
			const onScreenW = Math.min(hiX, width) - Math.max(loX, 0);
			if (hiX > 0 && loX < width && onScreenW >= labelW) {
				const half = labelW / 2;
				const sliceCenter = (Math.max(loX, 0) + Math.min(hiX, width)) / 2;
				x = Math.min(Math.max(sliceCenter, half + 2), width - half - 2);
			}
		}
		candidates.push({
			kind: 'leaf',
			id: a.id,
			label: a.name,
			sublabel: freq,
			aria: `${a.name}, ${freq}`,
			x,
			loX,
			hiX,
			count: 1,
			layer: a.layer,
			alloc: a,
			members: [a],
			width: labelW
		});
	};

	for (const fam of FAMILIES) {
		const members = byFamily.get(fam.id);
		if (!members || members.length === 0) continue;

		if (members.length === 1) {
			pushLeaf(members[0]);
			continue;
		}

		// Member extent drives the *expand* decision (do the members have room?);
		// the family's true extent drives the chip + span bar (neighbourhoods tile honestly).
		const memLoX = xOf(members[0].hz);
		const memHiX = xOf(members[members.length - 1].hz);
		const memSpanPx = memHiX - memLoX;
		const loX = xOf(fam.lo);
		const hiX = xOf(fam.hi);
		const famSpanPx = hiX - loX;

		// Enough room for a fraction of the members' labels → expand to leaves (lane-packing
		// shows as many as fit; the rest stay as bare dots and emerge on further zoom).
		if (memSpanPx >= members.length * opt.leafSlotPx * opt.expandFill) {
			for (const m of members) pushLeaf(m);
			continue;
		}

		// A visible-but-tight neighbourhood → one group chip over the family's real bandwidth.
		if (famSpanPx >= opt.minFamilyPx) {
			const layer = dominantLayer(members);
			candidates.push({
				kind: 'group',
				id: `grp-${fam.id}`,
				label: fam.short,
				sublabel: `${members.length} signals`,
				aria: `${fam.label}, ${members.length} signals`,
				// Centre the chip over the *visible* slice so a wide, half-off-screen
				// neighbourhood still labels itself where you can see it.
				x: (Math.max(loX, 0) + Math.min(hiX, width)) / 2,
				loX,
				hiX,
				count: members.length,
				layer,
				alloc: null,
				members,
				width: groupLabelWidth(fam.short, members.length)
			});
			continue;
		}
		// else: too small for a label — its dots still render via `dots`.
	}

	// Pass B — greedy lane assignment, left → right. Each candidate takes the lowest lane whose
	// last occupant (plus any fixed obstacle) clears it; otherwise its label is dropped.
	candidates.sort((a, b) => a.x - b.x);
	const laneEnds: number[] = Array.from({ length: opt.lanes }, () => -Infinity);
	// Seed lanes with fixed obstacles so labels never collide with e.g. region labels.
	const laneObstacles: number[][] = Array.from({ length: opt.lanes }, () => []);
	for (const o of obstacles) {
		if (o.lane >= 0 && o.lane < opt.lanes) laneObstacles[o.lane].push(o.x0, o.x1);
	}

	const items: PlacedItem[] = [];
	for (const c of candidates) {
		const x0 = c.x - c.width / 2;
		const x1 = c.x + c.width / 2;
		// Would clip off the left/right edge → drop the label (its dot still renders).
		if (x0 < 2 || x1 > width - 2) continue;
		let placed = -1;
		for (let lane = 0; lane < opt.lanes; lane++) {
			if (x0 < laneEnds[lane] + opt.padPx) continue;
			// Check fixed obstacles in this lane.
			const obs = laneObstacles[lane];
			let hitsObstacle = false;
			for (let i = 0; i < obs.length; i += 2) {
				if (x0 < obs[i + 1] + opt.padPx && x1 > obs[i] - opt.padPx) {
					hitsObstacle = true;
					break;
				}
			}
			if (hitsObstacle) continue;
			placed = lane;
			break;
		}
		if (placed === -1) continue; // no room — degrade to a bare dot (label dropped)
		laneEnds[placed] = x1;
		const { width: labelWidth, ...item } = c;
		void labelWidth; // width was only needed for placement
		items.push({ ...item, lane: placed });
	}

	return { dots, items };
}
