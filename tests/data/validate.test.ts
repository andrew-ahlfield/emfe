import { describe, it, expect } from 'vitest';
import { validateAllocations } from '$lib/data/validate';
import type { RawAllocation } from '$lib/data/types';

const SOURCES = new Set(['s1']);

/** A minimal valid allocation; override fields per case. */
function alloc(over: Partial<RawAllocation> = {}): RawAllocation {
	return {
		id: 'a',
		name: 'A',
		hz: 1e6,
		layer: 'consumer',
		region: 'radio',
		minLod: 2,
		note: 'n',
		source: 's1',
		...over
	};
}

describe('validateAllocations — valid data', () => {
	it('returns no issues for a well-formed set', () => {
		const ok: RawAllocation[] = [
			alloc({ id: 'a', hz: 1e6, band: [5e5, 2e6] }),
			alloc({ id: 'b', hz: 1e8, layer: 'gov', band: [9e7, 1.1e8] }),
			alloc({ id: 'c', hz: 5.4e14, layer: 'science', region: 'visible', reqLicense: undefined })
		];
		expect(validateAllocations(ok, SOURCES)).toEqual([]);
	});
});

describe('validateAllocations — invariant violations', () => {
	const cases: Array<[string, RawAllocation[], RegExp]> = [
		[
			'duplicate id',
			[alloc({ id: 'dup', hz: 1e6 }), alloc({ id: 'dup', hz: 2e6 })],
			/duplicate id/
		],
		['invalid layer', [alloc({ layer: 'bogus' as never })], /invalid layer/],
		['invalid region', [alloc({ region: 'bogus' as never })], /invalid region/],
		['invalid reqLicense', [alloc({ reqLicense: 'wizard' as never })], /invalid reqLicense/],
		['invalid minLod', [alloc({ minLod: 9 as never })], /invalid minLod/],
		['non-positive hz', [alloc({ hz: 0 })], /non-positive hz/],
		['band low ≥ high', [alloc({ band: [2e6, 1e6] })], /not below high/],
		['hz outside band', [alloc({ hz: 9e9, band: [1e6, 2e6] })], /outside band/],
		['unknown source', [alloc({ source: 'ghost' })], /unknown source/],
		[
			'non-monotonic (equal hz)',
			[alloc({ id: 'a', hz: 1e6 }), alloc({ id: 'b', hz: 1e6 })],
			/not strictly increasing/
		],
		[
			'overlapping bands in a layer',
			[
				alloc({ id: 'a', hz: 1.5e6, band: [1e6, 2e6] }),
				alloc({ id: 'b', hz: 1.8e6, band: [1.5e6, 3e6] })
			],
			/overlaps/
		]
	];

	for (const [label, data, pattern] of cases) {
		it(`flags ${label}`, () => {
			const issues = validateAllocations(data, SOURCES);
			expect(issues.length).toBeGreaterThan(0);
			expect(issues.some((i) => pattern.test(i.message))).toBe(true);
		});
	}

	it('allows non-overlapping bands across different layers', () => {
		const data = [
			alloc({ id: 'a', hz: 1.5e6, layer: 'consumer', band: [1e6, 2e6] }),
			alloc({ id: 'b', hz: 1.8e6, layer: 'amateur', band: [1.5e6, 3e6] })
		];
		// Cross-layer overlap is fine; only the equal-hz monotonic rule could fire — it won't here.
		expect(validateAllocations(data, SOURCES)).toEqual([]);
	});
});
