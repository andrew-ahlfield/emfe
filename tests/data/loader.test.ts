import { describe, it, expect } from 'vitest';
import { allocations, referencedSources } from '$lib/data/loader';

describe('allocations loader', () => {
	it('loads the seed dataset', () => {
		expect(allocations.length).toBeGreaterThanOrEqual(20);
	});

	it('sorts ascending by representative frequency', () => {
		for (let i = 1; i < allocations.length; i++) {
			expect(allocations[i].hz).toBeGreaterThan(allocations[i - 1].hz);
		}
		// Spans from sub-ELF (Schumann ≈ 7.83 Hz) to high-energy gamma.
		expect(allocations[0].id).toBe('schumann');
		expect(allocations.at(-1)?.id).toBe('cosmic-gamma');
	});

	it('resolves each source id into a full SourceRef', () => {
		for (const a of allocations) {
			expect(typeof a.source).toBe('object');
			expect(a.source.id).toBeTruthy();
			expect(a.source.title).toBeTruthy();
		}
		expect(allocations.find((a) => a.id === 'ham20')?.source.id).toBe('fcc-part97');
	});

	it('lists only the sources actually referenced', () => {
		const ids = referencedSources()
			.map((s) => s.id)
			.sort();
		expect(ids).toEqual([
			'fcc-part97',
			'fcc-tofa',
			'fireworks-chem',
			'itu-rr',
			'nasa-ems',
			'nist-asd',
			'rp-photonics',
			'spectrum-holdings'
		]);
	});
});
