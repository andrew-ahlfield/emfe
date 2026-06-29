import { describe, it, expect } from 'vitest';
import { resonanceSpectrum } from '$lib/spectrum/resonance';

const SCHUMANN = [7.83, 14.3, 20.8, 27.3, 33.8];

describe('resonanceSpectrum', () => {
	it('places a peak x for every mode, in ascending order, inside the screen', () => {
		const s = resonanceSpectrum(SCHUMANN, 320, 96);
		expect(s.peaks.map((p) => p.hz)).toEqual(SCHUMANN);
		const xs = s.peaks.map((p) => p.x);
		expect(xs).toEqual([...xs].sort((a, b) => a - b));
		expect(Math.min(...xs)).toBeGreaterThan(0);
		expect(Math.max(...xs)).toBeLessThan(320);
	});

	it('frames the modes with a little headroom on each side', () => {
		const s = resonanceSpectrum(SCHUMANN, 320, 96);
		expect(s.fMin).toBeGreaterThan(0);
		expect(s.fMin).toBeLessThan(7.83);
		expect(s.fMax).toBeGreaterThan(33.8);
	});

	it('bells down: the fundamental is the tallest peak (smallest y)', () => {
		const s = resonanceSpectrum(SCHUMANN, 320, 96, { samples: 400 });
		const yAt = (hz: number) => {
			const pts = [...s.curve.matchAll(/[ML] ([\d.]+),([\d.]+)/g)].map((m) => ({
				x: Number(m[1]),
				y: Number(m[2])
			}));
			const targetX = s.peaks.find((p) => p.hz === hz)!.x;
			return pts.reduce((a, b) => (Math.abs(b.x - targetX) < Math.abs(a.x - targetX) ? b : a)).y;
		};
		expect(yAt(7.83)).toBeLessThan(yAt(14.3));
		expect(yAt(14.3)).toBeLessThan(yAt(33.8));
	});

	it('keeps the curve within the screen box and is deterministic', () => {
		const s = resonanceSpectrum(SCHUMANN, 320, 96);
		const ys = [...s.curve.matchAll(/[ML] [\d.]+,([\d.]+)/g)].map((m) => Number(m[1]));
		expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
		expect(Math.max(...ys)).toBeLessThanOrEqual(96);
		expect(resonanceSpectrum(SCHUMANN, 320, 96).curve).toBe(
			resonanceSpectrum(SCHUMANN, 320, 96).curve
		);
	});

	it('handles the empty case without throwing', () => {
		const s = resonanceSpectrum([], 320, 96);
		expect(s.curve).toBe('');
		expect(s.peaks).toHaveLength(0);
	});
});
