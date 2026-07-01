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
import { REGIONS } from './bands';
import type { Allocation, LayerId } from '$lib/data/types';

/** A contiguous-frequency "neighbourhood" of the spectrum. `hi` is exclusive. */
export interface Family {
	id: string;
	/** Full, descriptive label (used in the chip's accessible name / inspector). */
	label: string;
	/** Compact label for the on-axis chip. */
	short: string;
	/** The short label spelled out — what the acronym/band name stands for. */
	name: string;
	/** A sentence or two: what this neighbourhood is and what it's generally used for. */
	blurb: string;
	lo: number;
	hi: number;
}

/**
 * The families, low → high frequency, tiling the spectrum so every allocation lands in
 * exactly one. Radio/microwave (where the data is dense) get fine neighbourhoods; the sparse
 * optical/ionising regions map one family per region.
 */
export const FAMILIES: readonly Family[] = [
	{
		id: 'elf',
		label: 'ELF & power-frequency',
		short: 'ELF',
		name: 'Extremely low frequency',
		blurb:
			'The slowest radio waves—from a few hertz up to ~10 kHz. The 50/60 Hz hum of the power grid lives here, alongside the Earth–ionosphere Schumann resonances and the enormous antennas navies use to reach submarines underwater.',
		lo: 1,
		hi: 1e4
	},
	{
		id: 'vlf-lf',
		label: 'VLF/LF: time & navigation',
		short: 'VLF/LF',
		name: 'Very low / low frequency',
		blurb:
			'Long waves (10–900 kHz) that hug the curve of the Earth and slip into seawater. Used for time-standard broadcasts (the atomic clocks behind radio-controlled watches), maritime and aeronautical navigation beacons, and submarine comms.',
		lo: 1e4,
		hi: 9e5
	},
	{
		id: 'mf-hf',
		label: 'MF/HF: AM, shortwave & ham',
		short: 'MF/HF',
		name: 'Medium / high frequency',
		blurb:
			"AM broadcast (medium wave) and shortwave (high frequency), 0.9–30 MHz. HF bounces off the ionosphere to skip around the planet—which is why shortwave, CB, and amateur 'ham' operators can reach the far side of the world.",
		lo: 9e5,
		hi: 3e7
	},
	{
		id: 'vhf',
		label: 'VHF: FM, TV, air & marine',
		short: 'VHF',
		name: 'Very high frequency',
		blurb:
			'30–300 MHz: FM radio, the lower broadcast-TV channels, air-traffic control and marine voice radio, and NOAA weather stations. Mostly line-of-sight signals that stop at the horizon.',
		lo: 3e7,
		hi: 3e8
	},
	{
		id: 'uhf',
		label: 'UHF: TV, cellular & ISM',
		short: 'UHF',
		name: 'Ultra high frequency',
		blurb:
			'300 MHz–1 GHz: upper TV channels, early mobile phones, walkie-talkies, garage remotes, RFID tags, and the 433/900 MHz ISM bands countless gadgets share.',
		lo: 3e8,
		hi: 1e9
	},
	{
		id: 'lband',
		label: 'L-band: GNSS & aeronautical',
		short: 'L-band',
		name: 'L-band',
		blurb:
			'1–1.7 GHz. GPS and other satellite navigation, aircraft transponders and radar, satellite radio, and satellite phones. It penetrates clouds and foliage well, which is why GNSS lives here.',
		lo: 1e9,
		hi: 1.7e9
	},
	{
		id: 'sband-low',
		label: 'S-band: cellular & 2.4 GHz ISM',
		short: 'S-band',
		name: 'S-band',
		blurb:
			'1.7–2.7 GHz. The 2.4 GHz ISM band—Wi-Fi, Bluetooth, microwave ovens, cordless gear—plus a great deal of cellular (3G/4G/5G mid-band) and weather radar.',
		lo: 1.7e9,
		hi: 2.7e9
	},
	{
		id: 'sc-band',
		label: 'S/C-band: radar, Wi-Fi & satellite',
		short: 'C-band',
		name: 'S / C-band',
		blurb:
			"2.7–7 GHz. 5 GHz Wi-Fi, airport and weather radar, and satellite uplinks. The 'C-band' satellite range here is being re-farmed for 5G.",
		lo: 2.7e9,
		hi: 7e9
	},
	{
		id: 'xku-band',
		label: 'X/Ku-band: radar & satellite TV',
		short: 'X/Ku',
		name: 'X / Ku-band',
		blurb:
			'7–18 GHz. Military, weather, and marine radar; satellite-TV downlinks and VSAT terminals. Short wavelengths mean small dishes and sharp, narrow radar beams.',
		lo: 7e9,
		hi: 1.8e10
	},
	{
		id: 'k-band',
		label: 'K-band: mmWave & satellite',
		short: 'K-band',
		name: 'K-band',
		blurb:
			"18–30 GHz. Satellite links, police speed radar, and the lower 5G millimetre-wave bands. The middle (the 'K' absorption peak) is partly blocked by atmospheric water vapour.",
		lo: 1.8e10,
		hi: 3e10
	},
	{
		id: 'ehf',
		label: 'EHF: WiGig & automotive radar',
		short: 'EHF',
		name: 'Extremely high frequency',
		blurb:
			"30–300 GHz, the 'millimetre wave' band. 60 GHz WiGig, 77 GHz automotive collision-avoidance radar, 5G mmWave, airport body scanners, and radio astronomy. Huge capacity, but short range.",
		lo: 3e10,
		hi: 3e11
	},
	{
		id: 'ir',
		label: 'Infrared',
		short: 'Infrared',
		name: 'Infrared',
		blurb:
			'Light just beyond red, felt as heat. TV remotes, fibre-optic internet, thermal cameras and night vision, and the warmth radiating from every warm object.',
		lo: 3e11,
		hi: 4e14
	},
	{
		id: 'visible',
		label: 'Visible light',
		short: 'Visible',
		name: 'Visible light',
		blurb:
			'The single octave our eyes evolved to see—red through violet. Lasers, LEDs, displays, and the colours of the world. A sliver of the whole spectrum.',
		lo: 4e14,
		hi: 7.9e14
	},
	{
		id: 'uv',
		label: 'Ultraviolet',
		short: 'Ultraviolet',
		name: 'Ultraviolet',
		blurb:
			"Beyond violet. Sterilising lamps, fluorescence and 'black light', vitamin-D and sunburn. Near the top, photons gain enough energy to start ionising atoms.",
		lo: 7.9e14,
		hi: 3e16
	},
	{
		id: 'xray',
		label: 'X-ray',
		short: 'X-ray',
		name: 'X-rays',
		blurb:
			'Ionising radiation that passes through soft tissue. Medical and dental imaging, airport security scanners, and crystallography that maps molecules atom by atom.',
		lo: 3e16,
		hi: 3e19
	},
	{
		id: 'gamma',
		label: 'Gamma rays',
		short: 'Gamma',
		name: 'Gamma rays',
		blurb:
			'The most energetic light, from nuclear decay and cosmic cataclysms. Cancer radiotherapy, equipment sterilisation, and PET scans. Deeply ionising—the signature of the violent universe.',
		lo: 3e19,
		hi: 1e24
	}
] as const;

/** Look up a family by id (e.g. from a `grp-<id>` group item). */
export function familyById(id: string): Family | undefined {
	return FAMILIES.find((f) => f.id === id);
}

/** The family containing a frequency (Hz), or `undefined` if outside every family. */
export function familyOf(hz: number): Family | undefined {
	return FAMILIES.find((f) => hz >= f.lo && hz < f.hi);
}

/**
 * A clickable spectrum "neighbourhood" for the info card — either a {@link Family} or a whole
 * region (the coarse umbrella shown at low zoom when a region's families are too compressed to
 * stand on their own). `Family` already supplies these fields; regions add the same shape.
 */
export interface Neighbourhood {
	id: string;
	short: string;
	name: string;
	blurb: string;
	lo: number;
	hi: number;
}

/**
 * Region-level umbrellas for the multi-family regions. The optical regions (infrared … gamma) are
 * one-to-one with a family, so they reuse that family's own card; only radio and microwave need a
 * coarser explainer for when their many sub-bands collapse together at low zoom.
 */
export const REGION_GROUPS: Record<string, Neighbourhood> = {
	radio: {
		id: 'radio',
		short: 'Radio',
		name: 'Radio waves',
		blurb:
			'The long-wavelength end we broadcast and communicate with—the power-grid hum and submarine signalling up through AM/FM, broadcast television, and aviation, marine and two-way radio. Zoom in for the ELF, VLF/LF, MF/HF and VHF neighbourhoods.',
		lo: 1,
		hi: 3e8
	},
	microwave: {
		id: 'microwave',
		short: 'Microwave',
		name: 'Microwaves',
		blurb:
			'Centimetre-to-millimetre waves that carry most modern wireless: Wi-Fi and Bluetooth, mobile phones, GPS, radar and satellite links—and microwave ovens. Zoom in for the UHF, L-, S-, C-, X/Ku- and K-band neighbourhoods up to EHF.',
		lo: 3e8,
		hi: 3e11
	}
};

/** The umbrella neighbourhood for a region: its dedicated region group, else its sole family. */
function regionNeighbourhood(region: {
	id: string;
	lo: number;
	hi: number;
}): Neighbourhood | undefined {
	return REGION_GROUPS[region.id] ?? FAMILIES.find((f) => f.lo >= region.lo && f.hi <= region.hi);
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
	/** The neighbourhood a group resolves to for its info card (family or region). */
	info?: Neighbourhood;
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
	const sorted = [...visible].sort((p, q) => p.hz - q.hz);
	const byFamily = new Map<string, Allocation[]>();
	for (const a of sorted) {
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

	const leafCandidate = (a: Allocation): Candidate => {
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
		return {
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
		};
	};

	/** A collapsed-neighbourhood chip over [loX,hiX], for a family or a whole region. */
	const groupCandidate = (
		info: Neighbourhood,
		members: Allocation[],
		loX: number,
		hiX: number
	): Candidate => ({
		kind: 'group',
		id: `grp-${info.id}`,
		label: info.short,
		sublabel: `${members.length} signals`,
		aria: `${info.name}, ${members.length} signals`,
		// Centre the chip over the *visible* slice so a wide, half-off-screen neighbourhood still
		// labels itself where you can see it.
		x: (Math.max(loX, 0) + Math.min(hiX, width)) / 2,
		loX,
		hiX,
		count: members.length,
		layer: dominantLayer(members),
		alloc: null,
		members,
		info,
		width: groupLabelWidth(info.short, members.length)
	});

	/** A family's representation at this zoom: expanded leaves, one chip, or nothing (too small). */
	const familyCandidates = (fam: Family, members: Allocation[]): Candidate[] => {
		if (members.length === 1) return [leafCandidate(members[0])];
		// Member extent drives the *expand* decision (do the members have room?);
		// the family's true extent drives the chip + span bar (neighbourhoods tile honestly).
		const memSpanPx = xOf(members[members.length - 1].hz) - xOf(members[0].hz);
		const famSpanPx = xOf(fam.hi) - xOf(fam.lo);
		if (memSpanPx >= members.length * opt.leafSlotPx * opt.expandFill) {
			return members.map(leafCandidate);
		}
		if (famSpanPx >= opt.minFamilyPx) {
			return [groupCandidate(fam, members, xOf(fam.lo), xOf(fam.hi))];
		}
		return [];
	};

	// Pass A — per region, choose the finest representation that *covers* it: its families when they
	// fill enough of the region's on-screen width, otherwise a single region umbrella. This is the
	// Region → Family → Leaf semantic-zoom hierarchy: at the widest zoom the dense microwave/optical
	// regions show one umbrella each (no gaps); zoom in and they dissolve into families, then leaves.
	const COVERAGE_MIN = 0.6;
	for (const region of REGIONS) {
		const regionMembers = sorted.filter((a) => a.hz >= region.lo && a.hz < region.hi);
		if (regionMembers.length === 0) continue;

		const regionVis0 = Math.max(xOf(region.lo), 0);
		const regionVis1 = Math.min(xOf(region.hi), width);
		const regionVisPx = regionVis1 - regionVis0;

		// Build the family-level representation and measure how much of the visible region it covers.
		const familyCands: Candidate[] = [];
		let coveredPx = 0;
		for (const fam of FAMILIES) {
			if (fam.lo < region.lo || fam.hi > region.hi) continue; // family not in this region
			const members = byFamily.get(fam.id);
			if (!members || members.length === 0) continue;
			const cands = familyCandidates(fam, members);
			if (cands.length === 0) continue;
			familyCands.push(...cands);
			coveredPx += Math.max(
				0,
				Math.min(xOf(fam.hi), regionVis1) - Math.max(xOf(fam.lo), regionVis0)
			);
		}
		const covered = regionVisPx > 0 ? coveredPx / regionVisPx : 0;

		const umbrella = regionNeighbourhood(region);
		if ((familyCands.length > 0 && covered >= COVERAGE_MIN) || !umbrella) {
			candidates.push(...familyCands);
		} else {
			// Families too compressed to stand alone → one umbrella over the whole region.
			candidates.push(groupCandidate(umbrella, regionMembers, xOf(region.lo), xOf(region.hi)));
		}
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
		if (placed === -1) continue; // no room—degrade to a bare dot (label dropped)
		laneEnds[placed] = x1;
		const { width: labelWidth, ...item } = c;
		void labelWidth; // width was only needed for placement
		items.push({ ...item, lane: placed });
	}

	return { dots, items };
}
