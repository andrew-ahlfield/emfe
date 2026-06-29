import { describe, it, expect } from 'vitest';
import { resonanceScope } from '$lib/spectrum/waveform';

const SCHUMANN = [7.83, 14.3, 20.8, 27.3, 33.8];

describe('resonanceScope', () => {
	it('builds a centred graticule for the given divisions', () => {
		const s = resonanceScope(SCHUMANN, 320, 112, { cols: 8, rows: 4 });
		expect(s.midline).toBe(56);
		expect(s.vGrid).toHaveLength(7); // interior lines only
		expect(s.hGrid).toHaveLength(3);
		expect(s.vGrid[0]).toBeCloseTo(40); // 320/8
	});

	it('produces a sampled trace path that stays within the screen box', () => {
		const s = resonanceScope(SCHUMANN, 320, 112, { samples: 100 });
		expect(s.trace.startsWith('M ')).toBe(true);
		const ys = [...s.trace.matchAll(/[ML] [\d.]+,([\d.]+)/g)].map((m) => Number(m[1]));
		expect(ys.length).toBe(101); // samples + 1
		expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
		expect(Math.max(...ys)).toBeLessThanOrEqual(112);
	});

	it('is deterministic — same input, same path', () => {
		expect(resonanceScope(SCHUMANN, 320, 112).trace).toBe(resonanceScope(SCHUMANN, 320, 112).trace);
	});

	it('handles the empty case without throwing', () => {
		const s = resonanceScope([], 320, 112);
		expect(s.trace).toBe('');
		expect(s.vGrid.length).toBeGreaterThan(0);
	});
});
