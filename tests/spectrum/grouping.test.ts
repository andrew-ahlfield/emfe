import { describe, it, expect } from 'vitest';
import { FAMILIES, familyOf, layoutSpectrum } from '$lib/spectrum/grouping';
import { FULL_DOMAIN, type FreqDomain } from '$lib/spectrum/scale';
import type { Allocation } from '$lib/data/types';

/** Minimal allocation factory for layout tests. */
function alloc(id: string, hz: number, extra: Partial<Allocation> = {}): Allocation {
	return {
		id,
		name: id,
		hz,
		layer: 'consumer',
		region: 'radio',
		minLod: 3,
		note: '',
		source: { id: 's', title: 'S' },
		...extra
	};
}

const fmt = (hz: number) => `${hz} Hz`;

describe('families', () => {
	it('tile the spectrum without gaps or overlaps, low → high', () => {
		for (let i = 1; i < FAMILIES.length; i++) {
			expect(FAMILIES[i].lo).toBe(FAMILIES[i - 1].hi); // contiguous
			expect(FAMILIES[i].hi).toBeGreaterThan(FAMILIES[i].lo);
		}
	});

	it('assigns each frequency to exactly one family', () => {
		expect(familyOf(98e6)?.id).toBe('vhf'); // FM radio
		expect(familyOf(2.45e9)?.id).toBe('sband-low'); // Wi-Fi 2.4
		expect(familyOf(1.575e9)?.id).toBe('lband'); // GPS L1
		expect(familyOf(60)?.id).toBe('elf'); // mains hum
	});
});

describe('layoutSpectrum — group-up', () => {
	const W = 1200;

	it('collapses a mid-sized neighbourhood into one group chip', () => {
		// Five S-band allocations spread across the family, viewed over a one-decade window:
		// visible as a neighbourhood, but too tight to give each its own label.
		const allocs = [1.8e9, 2.0e9, 2.2e9, 2.4e9, 2.6e9].map((hz, i) =>
			alloc(`w${i}`, hz, { region: 'microwave' })
		);
		const dom: FreqDomain = { minExp: 9, maxExp: 11 };
		const { items } = layoutSpectrum(allocs, dom, W, fmt);
		const groups = items.filter((i) => i.kind === 'group');
		expect(groups.length).toBe(1);
		expect(groups[0].count).toBe(5);
	});

	it('expands a cluster into leaves when zoomed in enough', () => {
		const allocs = [2.4e9, 2.45e9, 2.5e9, 2.6e9].map((hz, i) =>
			alloc(`w${i}`, hz, { region: 'microwave' })
		);
		// A narrow window around 2.4–2.6 GHz gives each member plenty of pixels.
		const dom: FreqDomain = { minExp: 9.37, maxExp: 9.42 };
		const { items } = layoutSpectrum(allocs, dom, W, fmt);
		expect(items.every((i) => i.kind === 'leaf')).toBe(true);
		expect(items.length).toBe(4);
	});

	it('always emits a dot per visible allocation, even when labels are dropped', () => {
		const allocs = Array.from({ length: 30 }, (_, i) => alloc(`a${i}`, 1e6 * (1 + i / 30)));
		const { dots } = layoutSpectrum(allocs, FULL_DOMAIN, W, fmt);
		expect(dots.length).toBe(30);
	});

	it('keeps a wide band visible (dot + labelled leaf) when its centre scrolls off-screen', () => {
		// A band 26.9–27.5 MHz whose centre (27.2) sits left of a window that starts at 27.3 — the
		// band's right edge is still in view, so its bar/label must not vanish (regression).
		const band = alloc('cb', 27.2e6, { band: [26.9e6, 27.5e6] });
		const dom: FreqDomain = { minExp: Math.log10(27.3e6), maxExp: Math.log10(27.9e6) };
		const { dots, items } = layoutSpectrum([band], dom, W, fmt);
		expect(dots.map((d) => d.id)).toContain('cb'); // band overlaps viewport → still a dot
		const leaf = items.find((i) => i.id === 'cb' && i.kind === 'leaf');
		expect(leaf, 'labelled leaf present').toBeDefined();
		// …and its label is anchored on-screen (not at the off-screen centre).
		expect(leaf!.x).toBeGreaterThanOrEqual(0);
		expect(leaf!.x).toBeLessThanOrEqual(W);
	});

	it('drops a band whose range is entirely off-screen', () => {
		const band = alloc('off', 27.2e6, { band: [26.9e6, 27.5e6] });
		const dom: FreqDomain = { minExp: Math.log10(30e6), maxExp: Math.log10(40e6) };
		const { dots } = layoutSpectrum([band], dom, W, fmt);
		expect(dots).toHaveLength(0);
	});
});

describe('layoutSpectrum — region hierarchy', () => {
	const W = 1440;
	// Populate every microwave sub-band (UHF…EHF) so the region is genuinely busy.
	const microwave: Allocation[] = [];
	let m = 0;
	for (const f of FAMILIES.filter((f) => f.lo >= 3e8 && f.hi <= 3e11)) {
		for (let k = 1; k <= 6; k++) {
			const hz = f.lo * (f.hi / f.lo) ** (k / 7);
			microwave.push(alloc(`m${m++}`, hz, { region: 'microwave' }));
		}
	}

	it('shows one region umbrella at the widest zoom (no per-family gaps)', () => {
		const { items } = layoutSpectrum(microwave, FULL_DOMAIN, W, fmt);
		const groups = items.filter((i) => i.kind === 'group');
		// The whole region collapses to a single "Microwave" umbrella…
		expect(groups.some((g) => g.id === 'grp-microwave')).toBe(true);
		expect(groups.find((g) => g.id === 'grp-microwave')!.info?.id).toBe('microwave');
		// …not the individual sub-band chips yet.
		expect(items.some((i) => i.id === 'grp-uhf' || i.id === 'grp-ehf')).toBe(false);
	});

	it('dissolves the umbrella into families when zoomed into the region', () => {
		const dom: FreqDomain = { minExp: 7.7, maxExp: 11.7 };
		const { items } = layoutSpectrum(microwave, dom, W, fmt);
		expect(items.some((i) => i.id === 'grp-microwave')).toBe(false);
		// Several finer neighbourhoods now stand on their own.
		expect(items.length).toBeGreaterThanOrEqual(3);
	});
});

describe('layoutSpectrum — no overlaps (invariant)', () => {
	const W = 1440;

	/** All 16 families populated with a spread of members, across many zoom windows. */
	const allocs: Allocation[] = [];
	let n = 0;
	for (const f of FAMILIES) {
		// place 4 members geometrically spread inside each family
		for (let k = 1; k <= 4; k++) {
			const hz = f.lo * (f.hi / f.lo) ** (k / 5);
			allocs.push(alloc(`x${n++}`, hz, { name: `Signal ${n}` }));
		}
	}

	const windows: FreqDomain[] = [
		FULL_DOMAIN,
		{ minExp: 0, maxExp: 12 },
		{ minExp: 6, maxExp: 10 },
		{ minExp: 8, maxExp: 9.5 },
		{ minExp: 9, maxExp: 9.6 },
		{ minExp: 14, maxExp: 16 }
	];

	for (const dom of windows) {
		it(`places labels without overlap in [10^${dom.minExp}, 10^${dom.maxExp}]`, () => {
			const { items } = layoutSpectrum(allocs, dom, W, fmt, { padPx: 10 });
			// Reconstruct each label box from x + an upper-bound width and check per-lane gaps.
			const boxes = items.map((it) => {
				const w = (it.kind === 'group' ? it.sublabel.length : it.label.length) * 7.2 + 8;
				return { lane: it.lane, x0: it.x - w / 2, x1: it.x + w / 2 };
			});
			for (let i = 0; i < boxes.length; i++) {
				for (let j = i + 1; j < boxes.length; j++) {
					if (boxes[i].lane !== boxes[j].lane) continue;
					const a = boxes[i];
					const b = boxes[j];
					const overlap = a.x0 < b.x1 && b.x0 < a.x1;
					expect(overlap, `labels ${i} and ${j} overlap in lane ${a.lane}`).toBe(false);
				}
			}
		});
	}
});
