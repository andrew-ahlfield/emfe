/**
 * Numbered channel plans for the bands that have them, surfaced as a deep level-of-detail: zoom
 * far enough into one of these allocations and its individual channels appear on the band.
 *
 * Reference data (kept in code like {@link FAMILIES} / ITU_BANDS, not the allocation dataset).
 * Frequencies in Hz, from the FCC channel tables. Starting set is the citizen/short-range voice
 * services (CB, FRS/GMRS, MURS) — the ones whose channels people actually dial by number.
 */

import type { FreqDomain } from './scale';
import { logPos } from './scale';

export interface Channel {
	/** Channel number/label as people refer to it ("9", "19", "1"). */
	n: string;
	/** Centre frequency, Hz. */
	hz: number;
	/**
	 * Special styling: `gmrs` = needs a paid GMRS licence (the repeater inputs, drawn in blue);
	 * `distress` = an emergency/guard channel (red); `calling` = a designated calling frequency
	 * (amateur purple). `distress`/`calling` are single landmarks promoted to reveal early — see
	 * {@link channelRevealPx}.
	 */
	tag?: 'gmrs' | 'distress' | 'calling';
	/**
	 * Bandwidth (Hz). A discrete channel has none and draws as a hairline tick; a *resonance* mode
	 * (the Schumann harmonics) has a real width and draws as a bar that wide — same multi-signal
	 * paradigm, honest width.
	 */
	bw?: number;
}

export interface ChannelPlan {
	/** Allocation id this plan belongs to (keys into the dataset). */
	id: string;
	/** Short service name shown alongside the channels. */
	service: string;
	channels: readonly Channel[];
	/** Override colour for the marks (CSS var), e.g. a resonance plan in its layer colour. Default
	 *  is the neutral channel-tick grey. Also suppresses the "… channels" header. */
	tone?: string;
}

const MHz = 1e6;

/** US CB — 40 channels, 26.965–27.405 MHz (note the historic 23/24/25 ordering). Channel 9 is the
 *  designated emergency/traveller-assistance channel, so it's drawn red like Marine 16. */
const CB: Channel[] = (
	[
		['1', 26.965],
		['2', 26.975],
		['3', 26.985],
		['4', 27.005],
		['5', 27.015],
		['6', 27.025],
		['7', 27.035],
		['8', 27.055],
		['9', 27.065],
		['10', 27.075],
		['11', 27.085],
		['12', 27.105],
		['13', 27.115],
		['14', 27.125],
		['15', 27.135],
		['16', 27.155],
		['17', 27.165],
		['18', 27.175],
		['19', 27.185],
		['20', 27.205],
		['21', 27.215],
		['22', 27.225],
		['23', 27.255],
		['24', 27.235],
		['25', 27.245],
		['26', 27.265],
		['27', 27.275],
		['28', 27.285],
		['29', 27.295],
		['30', 27.305],
		['31', 27.315],
		['32', 27.325],
		['33', 27.335],
		['34', 27.345],
		['35', 27.355],
		['36', 27.365],
		['37', 27.375],
		['38', 27.385],
		['39', 27.395],
		['40', 27.405]
	] as [string, number][]
).map(([n, mhz]) => ({
	n,
	hz: mhz * MHz,
	...(n === '9' ? { tag: 'distress' as const } : {})
}));

/**
 * FRS/GMRS walkie-talkie channels. The 22 shared FRS channels (license-free) span the 462 group
 * (1–7, 15–22) and the 467 group (8–14). On top of those, GMRS licensees get 8 *repeater input*
 * channels at 467.5500–467.7250 MHz (paired +5 MHz with channels 15–22) — license-only, tagged.
 */
const FRS: Channel[] = [
	...(
		[
			['1', 462.5625],
			['2', 462.5875],
			['3', 462.6125],
			['4', 462.6375],
			['5', 462.6625],
			['6', 462.6875],
			['7', 462.7125],
			['8', 467.5625],
			['9', 467.5875],
			['10', 467.6125],
			['11', 467.6375],
			['12', 467.6625],
			['13', 467.6875],
			['14', 467.7125],
			['15', 462.55],
			['16', 462.575],
			['17', 462.6],
			['18', 462.625],
			['19', 462.65],
			['20', 462.675],
			['21', 462.7],
			['22', 462.725]
		] as [string, number][]
	).map(([n, mhz]) => ({ n, hz: mhz * MHz })),
	...(
		[
			['R15', 467.55],
			['R16', 467.575],
			['R17', 467.6],
			['R18', 467.625],
			['R19', 467.65],
			['R20', 467.675],
			['R21', 467.7],
			['R22', 467.725]
		] as [string, number][]
	).map(([n, mhz]) => ({ n, hz: mhz * MHz, tag: 'gmrs' as const }))
];

/** MURS — 5 channels: three at 151 MHz, two at 154 MHz. */
const MURS: Channel[] = [
	['1', 151.82],
	['2', 151.88],
	['3', 151.94],
	['4', 154.57],
	['5', 154.6]
].map(([n, mhz]) => ({ n: n as string, hz: (mhz as number) * MHz }));

/** US over-the-air TV, by RF channel number (6 MHz each). VHF-low 2–6 (note the 72–76 gap). */
const TV_VHF_LO: Channel[] = [
	['2', 57],
	['3', 63],
	['4', 69],
	['5', 79],
	['6', 85]
].map(([n, mhz]) => ({ n: n as string, hz: (mhz as number) * MHz }));

/** VHF-high TV, channels 7–13. */
const TV_VHF_HI: Channel[] = [7, 8, 9, 10, 11, 12, 13].map((n) => ({
	n: String(n),
	hz: (177 + (n - 7) * 6) * MHz
}));

/** UHF TV, channels 14–36 (post-repack top end). */
const TV_UHF: Channel[] = Array.from({ length: 23 }, (_, i) => {
	const n = i + 14;
	return { n: String(n), hz: (473 + (n - 14) * 6) * MHz };
});

/** US 2.4 GHz Wi-Fi, channels 1–11 (centres 5 MHz apart; 22 MHz wide, so they overlap). */
const WIFI24: Channel[] = Array.from({ length: 11 }, (_, i) => {
	const n = i + 1;
	return { n: String(n), hz: (2412 + (n - 1) * 5) * MHz };
});

/** NOAA Weather Radio — the seven WX channels (numbered out of frequency order). */
const WX: Channel[] = [
	['WX1', 162.55],
	['WX2', 162.4],
	['WX3', 162.475],
	['WX4', 162.425],
	['WX5', 162.45],
	['WX6', 162.5],
	['WX7', 162.525]
].map(([n, mhz]) => ({ n: n as string, hz: (mhz as number) * MHz }));

/** US 5 GHz Wi-Fi — the UNII 20 MHz channels (centre = 5000 + n·5 MHz). */
const WIFI5: Channel[] = [
	36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144, 149,
	153, 157, 161, 165
].map((n) => ({ n: String(n), hz: (5000 + n * 5) * MHz }));

/** US 6 GHz Wi-Fi (6E/7) — 20 MHz channels 1, 5, 9 … 233 (centre = 5950 + n·5 MHz). */
const WIFI6E: Channel[] = Array.from({ length: 59 }, (_, i) => {
	const n = 1 + i * 4;
	return { n: String(n), hz: (5950 + n * 5) * MHz };
});

/** US Marine VHF — the standard channel grid (ship-side frequencies; "A" = US simplex variant). */
const MARINE: Channel[] = (
	[
		['63A', 156.175],
		['1A', 156.05],
		['5A', 156.25],
		['65A', 156.275],
		['6', 156.3],
		['66A', 156.325],
		['7A', 156.35],
		['67', 156.375],
		['8', 156.4],
		['68', 156.425],
		['9', 156.45],
		['69', 156.475],
		['10', 156.5],
		['70', 156.525],
		['11', 156.55],
		['71', 156.575],
		['12', 156.6],
		['72', 156.625],
		['13', 156.65],
		['73', 156.675],
		['14', 156.7],
		['74', 156.725],
		['15', 156.75],
		['16', 156.8],
		['17', 156.85],
		['77', 156.875],
		['18A', 156.9],
		['78A', 156.925],
		['19A', 156.95],
		['79A', 156.975],
		['20', 157.0],
		['80A', 157.025],
		['21A', 157.05],
		['81A', 157.075],
		['22A', 157.1],
		['82A', 157.125],
		['23A', 157.15],
		['83A', 157.175],
		['24', 157.2],
		['84', 157.225],
		['25', 157.25],
		['85', 157.275],
		['26', 157.3],
		['86', 157.325],
		['27', 157.35],
		['87', 157.375],
		['28', 157.4],
		['88', 157.425],
		// Coast-station (duplex) transmit side, 4.6 MHz above the ship frequency.
		['20', 161.6],
		['24', 161.8],
		['84', 161.825],
		['25', 161.85],
		['85', 161.875],
		['26', 161.9],
		['86', 161.925],
		['27', 161.95],
		['87', 161.975],
		['28', 162.0],
		['88', 162.025]
	] as [string, number][]
).map(([n, mhz]) => ({
	n,
	hz: mhz * MHz,
	...(n === '16' ? { tag: 'distress' as const } : {})
}));

/** 60 m amateur band — five fixed USB channels (the only ham band that's channelised). */
const HAM60: Channel[] = [
	['1', 5.332],
	['2', 5.348],
	['3', 5.3585],
	['4', 5.373],
	['5', 5.405]
].map(([n, mhz]) => ({ n: n as string, hz: (mhz as number) * MHz }));

/**
 * Schumann resonances — the Earth–ionosphere cavity's modes (Hz). Not channels but the *same*
 * multi-signal paradigm as MURS/GMRS: a set of band marks revealed on zoom. Each carries a real
 * bandwidth (low Q ≈ 4–6, so ~f/Q wide and widening up the series) so it draws as a bar that broad
 * — resonances inherently have width, unlike a discrete channel.
 */
const SCHUMANN: Channel[] = (
	[
		['7.83', 7.83, 1.8],
		['14.3', 14.3, 3.1],
		['20.8', 20.8, 4.1],
		['27.3', 27.3, 5.0],
		['33.8', 33.8, 6.0]
	] as [string, number, number][]
).map(([n, hz, bw]) => ({ n, hz, bw }));

/**
 * Designated single frequencies — the aeronautical/military emergency ('guard') frequencies and the
 * ham FM national calling frequencies. Each is one tick above its band (red for a guard, amateur
 * purple for a calling freq), like CB Channel 9; the full story lives on the band's own info card.
 */
const guard = (n: string, mhz: number): Channel => ({ n, hz: mhz * MHz, tag: 'distress' });
const calling = (n: string, mhz: number): Channel => ({ n, hz: mhz * MHz, tag: 'calling' });

export const CHANNEL_PLANS: readonly ChannelPlan[] = [
	{ id: 'cb', service: 'CB', channels: CB },
	{ id: 'frs', service: 'Walkie-talkie', channels: FRS },
	{ id: 'murs', service: 'MURS', channels: MURS },
	{ id: 'tv-vhf-lo', service: 'TV', channels: TV_VHF_LO },
	{ id: 'tv-vhf-hi', service: 'TV', channels: TV_VHF_HI },
	{ id: 'tv', service: 'TV', channels: TV_UHF },
	{ id: 'wifi', service: 'Wi-Fi 2.4 GHz', channels: WIFI24 },
	{ id: 'wifi5', service: 'Wi-Fi 5 GHz', channels: WIFI5 },
	{ id: 'wifi6e', service: 'Wi-Fi 6 GHz', channels: WIFI6E },
	{ id: 'marine-vhf', service: 'Marine VHF', channels: MARINE },
	{ id: 'nws-wx', service: 'NOAA Weather', channels: WX },
	{ id: 'ham60m', service: '60 m', channels: HAM60 },
	{ id: 'schumann', service: 'Schumann', channels: SCHUMANN, tone: 'var(--layer-science)' },
	// Designated guard / calling frequencies, as single ticks on their host band.
	{ id: 'airband', service: 'Air-band', channels: [guard('121.5', 121.5)] },
	{ id: 'milair', service: 'Military UHF', channels: [guard('243', 243)] },
	{ id: '2m', service: '2 m', channels: [calling('146.52', 146.52)] },
	{ id: 'ham6m', service: '6 m', channels: [calling('52.525', 52.525)] },
	{ id: 'ham125cm', service: '1.25 m', channels: [calling('223.5', 223.5)] },
	{ id: 'ham70cm', service: '70 cm', channels: [calling('446', 446)] }
];

/** The plan for an allocation id, if it has a numbered channel plan. */
export function planFor(id: string): ChannelPlan | undefined {
	return CHANNEL_PLANS.find((p) => p.id === id);
}

/**
 * Per-channel level-of-detail, expressed as the on-screen plan span (px) a channel needs before it
 * surfaces. The dense numbered grid (`full`) only appears once the plan spans a comfortable slice
 * of the screen, so the numbers have room and don't collide. A `landmark` — the single emergency /
 * calling channel — is just one line, so it's promoted to appear far earlier, as soon as its band
 * is a recognizable bar rather than a sliver. Tune both here; everything downstream reads them.
 */
export const CHANNEL_REVEAL_PX = { landmark: 16, full: 160 } as const;

/**
 * The on-screen band width (px) at which a given channel reveals — a generalisation of the old
 * plan-wide threshold. A single emergency/guard/calling landmark surfaces early (as soon as its band
 * is a recognizable bar); every other channel waits for the full grid. Keyed off the channel's `tag`.
 */
export function channelRevealPx(c: Channel): number {
	return c.tag === 'distress' || c.tag === 'calling'
		? CHANNEL_REVEAL_PX.landmark
		: CHANNEL_REVEAL_PX.full;
}

/** A channel positioned for the current view, with whether this zoom reveals it. */
export interface PlacedChannel extends Channel {
	x: number;
	/** Revealed at the current zoom: in view AND the parent band is wide enough on screen. */
	revealed: boolean;
	/** On-screen width (px) of a mode's real bandwidth — undefined for a hairline channel. */
	barW?: number;
}

/**
 * Channels of a plan positioned for a view, gated by the parent `band`'s on-screen width (so a
 * single-tick plan — a guard or calling frequency — reveals just like a dense grid does, rather than
 * never, since its channel-extent is zero). Each channel carries its own `revealed` flag (a promoted
 * landmark can show before the full grid); `show` is the plan-wide "full grid is up" signal.
 */
export function placeChannels(
	plan: ChannelPlan,
	band: readonly [number, number],
	domain: FreqDomain,
	width: number
): { show: boolean; bandPx: number; channels: PlacedChannel[] } {
	const bandLoX = logPos(band[0], domain) * width;
	const bandHiX = logPos(band[1], domain) * width;
	const bandPx = bandHiX - bandLoX;
	const inView = bandHiX > 0 && bandLoX < width;
	const channels = plan.channels.map((c) => ({
		...c,
		x: logPos(c.hz, domain) * width,
		barW: c.bw
			? (logPos(c.hz + c.bw / 2, domain) - logPos(c.hz - c.bw / 2, domain)) * width
			: undefined,
		revealed: inView && bandPx >= channelRevealPx(c)
	}));
	return { show: inView && bandPx >= CHANNEL_REVEAL_PX.full, bandPx, channels };
}
