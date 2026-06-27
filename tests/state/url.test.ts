import { describe, it, expect } from 'vitest';
import { encodeState, decodeState, discreteChanged, type DeepLinkSnapshot } from '$lib/state/url';
import { LAYERS, type LayerId } from '$lib/data/types';
import { FULL_DOMAIN } from '$lib/spectrum/scale';

const allOn = () => Object.fromEntries(LAYERS.map((l) => [l, true])) as Record<LayerId, boolean>;

const DEFAULTS: DeepLinkSnapshot = {
	centerExp: 12,
	zoom: 1,
	layers: allOn(),
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
			layers: { ...allOn(), gov: false, science: false },
			license: 'technician',
			theme: 'light',
			selected: 'wifi'
		});
		const p = new URLSearchParams(qs);
		expect(p.get('z')).toBe('8');
		expect(p.get('c')).toBe('9.5');
		expect(p.get('off')).toBe('gov,science');
		expect(p.get('lic')).toBe('technician');
		expect(p.get('t')).toBe('light');
		expect(p.get('sel')).toBe('wifi');
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

	it('round-trips the default view to defaults', () => {
		const back = decodeState(new URLSearchParams(encodeState(DEFAULTS)), FULL_DOMAIN);
		expect(back).toEqual(DEFAULTS);
	});
});

describe('decodeState — malformed input degrades safely', () => {
	it('falls back to defaults on garbage', () => {
		const back = decodeState(
			new URLSearchParams('z=abc&c=NaN&off=foo,bar&lic=admiral&t=neon'),
			FULL_DOMAIN
		);
		expect(back).toEqual(DEFAULTS);
	});

	it('clamps an out-of-range zoom and center', () => {
		const back = decodeState(new URLSearchParams('z=99999&c=-50'), FULL_DOMAIN);
		expect(back.zoom).toBeLessThanOrEqual(64);
		expect(back.centerExp).toBeGreaterThanOrEqual(FULL_DOMAIN.minExp);
		expect(back.centerExp).toBeLessThanOrEqual(FULL_DOMAIN.maxExp);
	});

	it('ignores unknown layer ids in the off-list', () => {
		const back = decodeState(new URLSearchParams('off=consumer,bogus'), FULL_DOMAIN);
		expect(back.layers.consumer).toBe(false);
		expect(back.layers.science).toBe(true);
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
