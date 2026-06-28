import { describe, it, expect } from 'vitest';
import {
	FULL_DOMAIN,
	SPEED_OF_LIGHT,
	clamp01,
	decades,
	freqToWavelength,
	logPos,
	niceTicks,
	posToHz,
	wavelengthToFreq,
	windowDomain,
	type FreqDomain
} from '$lib/spectrum/scale';

describe('niceTicks', () => {
	it('returns round 1-2-5 steps across a sub-decade window (the CB band)', () => {
		// 26.9–27.4 MHz: a decade ruler shows nothing here; we want readable round ticks.
		const ticks = niceTicks(26.9e6, 27.4e6);
		expect(ticks.length).toBeGreaterThanOrEqual(4);
		// Every tick is a clean multiple of the step (100 kHz here).
		const step = ticks[1] - ticks[0];
		for (let i = 1; i < ticks.length; i++) {
			expect(ticks[i] - ticks[i - 1]).toBeCloseTo(step, 3);
		}
		expect(ticks.every((t) => t >= 26.9e6 && t <= 27.4e6)).toBe(true);
	});

	it('picks a step from the 1-2-5 family', () => {
		const step = (lo: number, hi: number) => {
			const t = niceTicks(lo, hi);
			return t[1] - t[0];
		};
		// normalised step mantissa should be 1, 2 or 5 × a power of ten
		const mantissa = (s: number) => s / 10 ** Math.floor(Math.log10(s));
		expect([1, 2, 5]).toContain(Math.round(mantissa(step(0, 100))));
		expect([1, 2, 5]).toContain(Math.round(mantissa(step(1e6, 1.07e6))));
	});

	it('is empty for a degenerate range', () => {
		expect(niceTicks(5, 5)).toEqual([]);
		expect(niceTicks(10, 1)).toEqual([]);
	});
});

describe('FULL_DOMAIN', () => {
	it('spans 1 Hz to 10^24 Hz (24 decades)', () => {
		expect(FULL_DOMAIN).toEqual({ minExp: 0, maxExp: 24 });
		expect(decades(FULL_DOMAIN)).toBe(24);
	});
});

describe('logPos', () => {
	it('maps the domain edges to 0 and 1', () => {
		expect(logPos(1, FULL_DOMAIN)).toBe(0); // 10^0
		expect(logPos(1e24, FULL_DOMAIN)).toBe(1); // 10^24
	});

	it('maps the geometric midpoint to 0.5', () => {
		expect(logPos(1e12, FULL_DOMAIN)).toBeCloseTo(0.5, 10);
	});

	it('is linear in log space', () => {
		const d: FreqDomain = { minExp: 6, maxExp: 9 }; // 1 MHz–1 GHz
		expect(logPos(1e6, d)).toBeCloseTo(0, 10);
		expect(logPos(1e9, d)).toBeCloseTo(1, 10);
		expect(logPos(10 ** 7.5, d)).toBeCloseTo(0.5, 10);
	});

	it('returns values outside [0,1] for out-of-domain frequencies', () => {
		expect(logPos(0.1, FULL_DOMAIN)).toBeLessThan(0);
		expect(logPos(1e25, FULL_DOMAIN)).toBeGreaterThan(1);
	});
});

describe('posToHz', () => {
	it('inverts logPos (round-trip) across the spectrum', () => {
		// Relative comparison: absolute tolerance is meaningless across 24 decades.
		for (const hz of [1, 7.83, 535e3, 14e6, 2.45e9, 5.4e14, 3e18, 1e24]) {
			expect(posToHz(logPos(hz, FULL_DOMAIN), FULL_DOMAIN) / hz).toBeCloseTo(1, 10);
		}
	});

	it('round-trips positions for an arbitrary sub-domain', () => {
		const d: FreqDomain = { minExp: 8, maxExp: 10 };
		for (const p of [0, 0.25, 0.5, 0.75, 1]) {
			expect(logPos(posToHz(p, d), d)).toBeCloseTo(p, 10);
		}
	});
});

describe('clamp01', () => {
	it('clamps below, within, and above range', () => {
		expect(clamp01(-2)).toBe(0);
		expect(clamp01(0.42)).toBe(0.42);
		expect(clamp01(3)).toBe(1);
	});
});

describe('windowDomain', () => {
	it('shows the whole spectrum at zoom 1', () => {
		expect(windowDomain(FULL_DOMAIN, 12, 1)).toEqual({ minExp: 0, maxExp: 24 });
	});

	it('halves the visible span at zoom 2', () => {
		expect(windowDomain(FULL_DOMAIN, 12, 2)).toEqual({ minExp: 6, maxExp: 18 });
	});

	it('clamps (pans back in) at the low and high edges', () => {
		expect(windowDomain(FULL_DOMAIN, 0, 2)).toEqual({ minExp: 0, maxExp: 12 });
		expect(windowDomain(FULL_DOMAIN, 24, 2)).toEqual({ minExp: 12, maxExp: 24 });
	});

	it('zooms deeper around the center', () => {
		expect(windowDomain(FULL_DOMAIN, 12, 4)).toEqual({ minExp: 9, maxExp: 15 });
	});

	it('never inverts: zoom below 1 is treated as 1', () => {
		expect(windowDomain(FULL_DOMAIN, 12, 0.5)).toEqual({ minExp: 0, maxExp: 24 });
	});
});

describe('frequency ↔ wavelength', () => {
	it('uses the exact speed of light', () => {
		expect(SPEED_OF_LIGHT).toBe(299_792_458);
		expect(freqToWavelength(SPEED_OF_LIGHT)).toBe(1); // 1 m at ~300 MHz
	});

	it('round-trips freq → λ → freq', () => {
		for (const hz of [98e6, 2.45e9, 5.4e14]) {
			expect(wavelengthToFreq(freqToWavelength(hz))).toBeCloseTo(hz, 3);
		}
	});

	it('gives ~550 nm for green visible light (~545 THz)', () => {
		expect(freqToWavelength(5.45e14)).toBeCloseTo(550e-9, 8);
	});
});
