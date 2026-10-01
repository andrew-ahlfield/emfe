import { describe, it, expect } from 'vitest';
import { encodeState, decodeState, discreteChanged, type DeepLinkSnapshot } from '$lib/state/url';
import { LAYERS, DEFAULT_ON_LAYERS, OPTICAL_GROUPS, type LayerId } from '$lib/data/types';
import { FULL_DOMAIN } from '$lib/spectrum/scale';
import { ZOOM_RANGE } from '$lib/spectrum/zoom';

const allOn = () => Object.fromEntries(LAYERS.map((l) => [l, true])) as Record<LayerId, boolean>;
const allOff = () => Object.fromEntries(LAYERS.map((l) => [l, false])) as Record<LayerId, boolean>;
const defaultLayers = () =>
	Object.fromEntries(LAYERS.map((l) => [l, DEFAULT_ON_LAYERS.includes(l)])) as Record<
		LayerId,
		boolean
	>;
const defaultVisible = () =>
	Object.fromEntries(OPTICAL_GROUPS.map((g) => [g, g === 'led'])) as Record<
		(typeof OPTICAL_GROUPS)[number],
		boolean
	>;
const allVisible = (on: boolean) =>
	Object.fromEntries(OPTICAL_GROUPS.map((g) => [g, on])) as Record<
		(typeof OPTICAL_GROUPS)[number],
		boolean
	>;

const DEFAULTS: DeepLinkSnapshot = {
	centerExp: 12,
	zoom: 1,
	layers: defaultLayers(),
	license: 'extra',
	card: null,
	visibleGroups: defaultVisible(),
	admin: 'all',
	servicesOff: new Set(),
	axis: { showExp: false, showLambda: true, showEv: false },
	pinned: false
};

describe('encodeState', () => {
	it('emits an empty query for the default view', () => {
		expect(encodeState(DEFAULTS)).toBe('');
	});

	it('omits center/zoom while at full zoom', () => {
		expect(encodeState({ ...DEFAULTS, centerExp: 9 })).toBe('');
	});

	it('writes only the non-default dimensions', () => {
		const qs = encodeState({
			...DEFAULTS,
			zoom: 8,
			centerExp: 9.5,
			layers: { ...defaultLayers(), science: true },
			license: 'technician',
			card: 'sig:wifi'
		});
		const p = new URLSearchParams(qs);
		expect(p.get('z')).toBe('8');
		expect(p.get('c')).toBe('9.5');
		expect(p.get('layers')).toBe('consumer,science');
		expect(p.get('lic')).toBe('technician');
		expect(p.get('card')).toBe('sig:wifi');
	});

	it('never writes a theme parameter: colour scheme is not shareable', () => {
		// Theme is a per-viewer preference (localStorage / OS), deliberately outside the deep-link.
		const qs = encodeState({ ...DEFAULTS, license: 'technician' });
		expect(new URLSearchParams(qs).has('t')).toBe(false);
	});

	it('writes "layers=none" when every layer is off', () => {
		const qs = encodeState({ ...DEFAULTS, layers: allOff() });
		expect(new URLSearchParams(qs).get('layers')).toBe('none');
	});

	it('writes the visible-light sub-filter as an on-list diffed against LEDs-only', () => {
		expect(new URLSearchParams(encodeState(DEFAULTS)).has('vis')).toBe(false); // LEDs = default
		const on = encodeState({ ...DEFAULTS, visibleGroups: allVisible(true) });
		expect(new URLSearchParams(on).get('vis')).toBe('laser,led,gas,fireworks');
		const off = encodeState({ ...DEFAULTS, visibleGroups: allVisible(false) });
		expect(new URLSearchParams(off).get('vis')).toBe('none');
	});

	it('writes the substrate admin and hidden-service off-list', () => {
		const qs = encodeState({
			...DEFAULTS,
			admin: 'federal',
			servicesOff: new Set(['broadcasting', 'mobile'])
		});
		const p = new URLSearchParams(qs);
		expect(p.get('adm')).toBe('federal');
		expect(p.get('svc')).toBe('broadcasting,mobile');
	});

	it('writes axis overlays as an on-list diffed against wavelength-only', () => {
		expect(new URLSearchParams(encodeState(DEFAULTS)).has('ax')).toBe(false); // λ row = default
		const both = encodeState({
			...DEFAULTS,
			axis: { showExp: true, showLambda: true, showEv: true }
		});
		expect(new URLSearchParams(both).get('ax')).toBe('exp,lambda,ev');
		const bare = encodeState({
			...DEFAULTS,
			axis: { showExp: false, showLambda: false, showEv: false }
		});
		expect(new URLSearchParams(bare).get('ax')).toBe('none');
	});

	it('writes the pinned drawer flag only when pinned', () => {
		expect(new URLSearchParams(encodeState(DEFAULTS)).has('pin')).toBe(false);
		expect(new URLSearchParams(encodeState({ ...DEFAULTS, pinned: true })).get('pin')).toBe('1');
	});
});

describe('round-trip', () => {
	it('survives encode → decode unchanged', () => {
		const state: DeepLinkSnapshot = {
			centerExp: 9.5,
			zoom: 8,
			layers: { ...allOn(), amateur: false },
			license: 'extra',
			card: 'grp:vlf-lf',
			visibleGroups: { laser: true, led: false, gas: true, fireworks: false },
			admin: 'non-federal',
			servicesOff: new Set(['amateur', 'science', 'other']),
			axis: { showExp: true, showLambda: false, showEv: true },
			pinned: true
		};
		const back = decodeState(new URLSearchParams(encodeState(state)), FULL_DOMAIN);
		expect(back).toEqual(state);
	});

	it('round-trips an all-off layer set', () => {
		const state: DeepLinkSnapshot = { ...DEFAULTS, layers: allOff() };
		const back = decodeState(new URLSearchParams(encodeState(state)), FULL_DOMAIN);
		expect(back).toEqual(state);
	});

	it('round-trips the default view to defaults', () => {
		const back = decodeState(new URLSearchParams(encodeState(DEFAULTS)), FULL_DOMAIN);
		expect(back).toEqual(DEFAULTS);
	});
});

describe('decodeState: malformed input degrades safely', () => {
	it('falls back to defaults on garbage', () => {
		const back = decodeState(
			new URLSearchParams(
				'z=abc&c=NaN&layers=foo,bar&lic=admiral&t=neon&vis=bogus&adm=galactic&svc=nope&ax=zzz'
			),
			FULL_DOMAIN
		);
		expect(back).toEqual(DEFAULTS);
	});

	it('clamps an out-of-range zoom and center', () => {
		const back = decodeState(new URLSearchParams('z=99999&c=-50'), FULL_DOMAIN);
		expect(back.zoom).toBeLessThanOrEqual(ZOOM_RANGE.max);
		expect(back.centerExp).toBeGreaterThanOrEqual(FULL_DOMAIN.minExp);
		expect(back.centerExp).toBeLessThanOrEqual(FULL_DOMAIN.maxExp);
	});

	it('ignores unknown layer ids in the on-list', () => {
		const back = decodeState(new URLSearchParams('layers=science,bogus'), FULL_DOMAIN);
		expect(back.layers.science).toBe(true);
		expect(back.layers.consumer).toBe(false);
	});

	it('drops unknown ids inside the visible / service lists but keeps the valid ones', () => {
		const back = decodeState(new URLSearchParams('vis=laser,bogus&svc=mobile,nope'), FULL_DOMAIN);
		expect(back.visibleGroups.laser).toBe(true);
		expect(back.visibleGroups.led).toBe(false);
		expect(back.servicesOff.has('mobile')).toBe(true);
		expect(back.servicesOff.size).toBe(1);
	});

	it('ignores any theme parameter on decode', () => {
		const back = decodeState(new URLSearchParams('t=light'), FULL_DOMAIN);
		expect(back).toEqual(DEFAULTS);
	});

	it('maps a legacy bare sel= link onto the "sig" card kind', () => {
		const back = decodeState(new URLSearchParams('sel=wifi'), FULL_DOMAIN);
		expect(back.card).toBe('sig:wifi');
	});

	it('prefers the unified card= param over a legacy sel=', () => {
		const back = decodeState(new URLSearchParams('card=grp:elf&sel=wifi'), FULL_DOMAIN);
		expect(back.card).toBe('grp:elf');
	});

	it('still honours the legacy off-list (pre-curated-default links)', () => {
		const back = decodeState(new URLSearchParams('off=gov,bogus'), FULL_DOMAIN);
		expect(back.layers.gov).toBe(false);
		// The legacy format was relative to all layers on.
		expect(back.layers.science).toBe(true);
		expect(back.layers.amateur).toBe(true);
		expect(back.layers.consumer).toBe(true);
	});
});

describe('discreteChanged', () => {
	it('is false for a pure zoom/pan change', () => {
		const a = { ...DEFAULTS, zoom: 2, centerExp: 8 };
		const b = { ...DEFAULTS, zoom: 16, centerExp: 9 };
		expect(discreteChanged(a, b)).toBe(false);
	});

	it('is true when any discrete dimension changes', () => {
		expect(discreteChanged(DEFAULTS, { ...DEFAULTS, card: 'sig:fm' })).toBe(true);
		expect(discreteChanged(DEFAULTS, { ...DEFAULTS, layers: { ...allOn(), gov: false } })).toBe(
			true
		);
		expect(discreteChanged(DEFAULTS, { ...DEFAULTS, visibleGroups: allVisible(true) })).toBe(true);
		expect(discreteChanged(DEFAULTS, { ...DEFAULTS, admin: 'federal' })).toBe(true);
		expect(discreteChanged(DEFAULTS, { ...DEFAULTS, servicesOff: new Set(['mobile']) })).toBe(true);
		expect(
			discreteChanged(DEFAULTS, {
				...DEFAULTS,
				axis: { showExp: true, showLambda: true, showEv: false }
			})
		).toBe(true);
		expect(discreteChanged(DEFAULTS, { ...DEFAULTS, pinned: true })).toBe(true);
	});
});
