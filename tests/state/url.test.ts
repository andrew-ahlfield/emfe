import { describe, it, expect } from 'vitest';
import { encodeState, decodeState, discreteChanged, type DeepLinkSnapshot } from '$lib/state/url';
import { LAYERS, DEFAULT_ON_LAYERS, type LayerId } from '$lib/data/types';
import { FULL_DOMAIN } from '$lib/spectrum/scale';
import { ZOOM_RANGE } from '$lib/spectrum/zoom';

const allOn = () => Object.fromEntries(LAYERS.map((l) => [l, true])) as Record<LayerId, boolean>;
const allOff = () => Object.fromEntries(LAYERS.map((l) => [l, false])) as Record<LayerId, boolean>;
const defaultLayers = () =>
	Object.fromEntries(LAYERS.map((l) => [l, DEFAULT_ON_LAYERS.includes(l)])) as Record<
		LayerId,
		boolean
	>;

const DEFAULTS: DeepLinkSnapshot = {
	centerExp: 12,
	zoom: 1,
	layers: defaultLayers(),
	license: 'extra',
	theme: 'dark',
	selected: null
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
			theme: 'light',
			selected: 'wifi'
		});
		const p = new URLSearchParams(qs);
		expect(p.get('z')).toBe('8');
		expect(p.get('c')).toBe('9.5');
		expect(p.get('layers')).toBe('consumer,science');
		expect(p.get('lic')).toBe('technician');
		expect(p.get('t')).toBe('light');
		expect(p.get('sel')).toBe('wifi');
	});

	it('writes "layers=none" when every layer is off', () => {
		const qs = encodeState({ ...DEFAULTS, layers: allOff() });
		expect(new URLSearchParams(qs).get('layers')).toBe('none');
	});
});

describe('round-trip', () => {
	it('survives encode → decode unchanged', () => {
		const state: DeepLinkSnapshot = {
			centerExp: 9.5,
			zoom: 8,
			layers: { ...allOn(), amateur: false },
			license: 'extra',
			theme: 'light',
			selected: 'gps'
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

describe('decodeState — malformed input degrades safely', () => {
	it('falls back to defaults on garbage', () => {
		const back = decodeState(
			new URLSearchParams('z=abc&c=NaN&layers=foo,bar&lic=admiral&t=neon'),
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

	it('is true when a filter, theme, or selection changes', () => {
		expect(discreteChanged(DEFAULTS, { ...DEFAULTS, theme: 'light' })).toBe(true);
		expect(discreteChanged(DEFAULTS, { ...DEFAULTS, selected: 'fm' })).toBe(true);
		expect(discreteChanged(DEFAULTS, { ...DEFAULTS, layers: { ...allOn(), gov: false } })).toBe(
			true
		);
	});
});
