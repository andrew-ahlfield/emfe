import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import allocationsSchema from '../../data/schema/allocations.schema.json';
import sourcesSchema from '../../data/schema/sources.schema.json';
import seed from '../../data/allocations/seed.json';
import sources from '../../data/sources.json';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validateAllocs = ajv.compile(allocationsSchema);
const validateSources = ajv.compile(sourcesSchema);

describe('JSON schema — allocations', () => {
	it('accepts the seed data', () => {
		expect(validateAllocs(seed)).toBe(true);
	});

	it('rejects a missing required field', () => {
		expect(validateAllocs([{ id: 'x', name: 'X', hz: 1e6 }])).toBe(false);
	});

	it('rejects an unknown layer enum', () => {
		const bad = [{ ...seed[0], layer: 'bogus' }];
		expect(validateAllocs(bad)).toBe(false);
	});

	it('rejects an out-of-range minLod', () => {
		const bad = [{ ...seed[0], minLod: 7 }];
		expect(validateAllocs(bad)).toBe(false);
	});

	it('rejects an additional property', () => {
		const bad = [{ ...seed[0], surprise: true }];
		expect(validateAllocs(bad)).toBe(false);
	});
});

describe('JSON schema — sources', () => {
	it('accepts the source registry', () => {
		expect(validateSources(sources)).toBe(true);
	});

	it('rejects a malformed url', () => {
		const bad = [{ id: 'x', title: 'X', url: 'not a url' }];
		expect(validateSources(bad)).toBe(false);
	});
});
