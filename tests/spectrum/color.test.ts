import { describe, it, expect } from 'vitest';
import { wavelengthToRGB, spectralColor } from '$lib/spectrum/color';

const C = 299_792_458;
const hzOf = (nm: number) => C / (nm * 1e-9);

describe('wavelengthToRGB', () => {
	it('puts red, green and blue where the eye sees them', () => {
		const [rr, rg, rb] = wavelengthToRGB(660);
		expect(rr).toBeGreaterThan(rg);
		expect(rr).toBeGreaterThan(rb);

		const [gr, gg, gb] = wavelengthToRGB(530);
		expect(gg).toBeGreaterThan(gr);
		expect(gg).toBeGreaterThan(gb);

		const [br, bg, bb] = wavelengthToRGB(450);
		expect(bb).toBeGreaterThan(br);
		expect(bb).toBeGreaterThan(bg);
	});

	it('dims toward the spectrum edges', () => {
		const mid = wavelengthToRGB(530).reduce((a, b) => a + b, 0);
		const edge = wavelengthToRGB(700).reduce((a, b) => a + b, 0);
		expect(mid).toBeGreaterThan(edge);
	});

	it('clamps out-of-range (IR/UV) to the nearest edge hue, further dimmed', () => {
		// 940 nm (near-IR) clamps to the 780 nm deep-red edge: red dominant, low total.
		const [r, g, b] = wavelengthToRGB(940);
		expect(r).toBeGreaterThanOrEqual(g);
		expect(r).toBeGreaterThanOrEqual(b);
		expect(r).toBeLessThan(wavelengthToRGB(660)[0]);
	});
});

describe('spectralColor', () => {
	it('returns an rgb() string for a frequency', () => {
		expect(spectralColor(hzOf(650))).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
	});
	it('a red wavelength is red-dominant', () => {
		const m = spectralColor(hzOf(650)).match(/\d+/g)!.map(Number);
		expect(m[0]).toBeGreaterThan(m[1]);
		expect(m[0]).toBeGreaterThan(m[2]);
	});
});
