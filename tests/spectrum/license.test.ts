import { describe, it, expect } from 'vitest';
import {
	eligibility,
	privilegeNote,
	privilegeStrip,
	HAM_SUBBANDS
} from '$lib/spectrum/license';
import { LICENSE_RANKS, type LicenseRank } from '$lib/data/types';

describe('eligibility', () => {
	it('reports no requirement for allocations without reqLicense', () => {
		const e = eligibility(undefined, 'general');
		expect(e).toEqual({ amateur: false, granted: false, text: '' });
	});

	it('grants license-free bands to everyone, including the unlicensed', () => {
		for (const held of LICENSE_RANKS) {
			const e = eligibility('unlicensed', held);
			expect(e.amateur).toBe(true);
			expect(e.granted).toBe(true);
			expect(e.text).toBe('✓ License-free — anyone may transmit');
		}
	});

	// Full rank × requirement matrix for the licensed tiers.
	const licensed: LicenseRank[] = ['technician', 'general', 'extra'];
	for (const required of licensed) {
		for (const held of LICENSE_RANKS) {
			const covers = LICENSE_RANKS.indexOf(held) >= LICENSE_RANKS.indexOf(required);
			it(`${held} vs ${required} → ${covers ? 'granted' : 'denied'}`, () => {
				const e = eligibility(required, held);
				expect(e.amateur).toBe(true);
				expect(e.granted).toBe(covers);
				expect(e.text.startsWith(covers ? '✓' : '✗')).toBe(true);
			});
		}
	}

	it('names the required and held class when denied', () => {
		expect(eligibility('extra', 'general').text).toBe('✗ Requires Extra (you have General)');
	});

	it('names the held class when granted above the floor', () => {
		expect(eligibility('general', 'extra').text).toBe('✓ Extra licence covers this band');
	});
});

describe('privilegeStrip', () => {
	it('is empty for bands without a documented sub-band plan', () => {
		expect(privilegeStrip('cb', 'extra')).toEqual([]);
		expect(privilegeStrip('does-not-exist', 'extra')).toEqual([]);
	});

	it('enables every segment for an Extra holder on 20 m', () => {
		const strip = privilegeStrip('ham20', 'extra');
		expect(strip).toHaveLength(HAM_SUBBANDS.ham20.length);
		expect(strip.every((s) => s.enabled)).toBe(true);
	});

	it('greys out Extra-only segments for a General holder', () => {
		const strip = privilegeStrip('ham20', 'general');
		for (const s of strip) {
			expect(s.enabled).toBe(s.minLicense !== 'extra');
		}
	});

	it('grants a Technician nothing on 20 m', () => {
		const strip = privilegeStrip('ham20', 'technician');
		expect(strip.every((s) => !s.enabled)).toBe(true);
	});

	it('keeps segments ordered and spanning the full band', () => {
		const segs = HAM_SUBBANDS.ham20;
		expect(segs[0].from).toBe(0);
		expect(segs[segs.length - 1].to).toBe(1);
		for (let i = 1; i < segs.length; i++) {
			expect(segs[i].from).toBeCloseTo(segs[i - 1].to, 5);
		}
	});
});

describe('privilegeNote', () => {
	it('summarises privileges per held class', () => {
		expect(privilegeNote('extra')).toBe('full band');
		expect(privilegeNote('general')).toBe('General privileges');
		expect(privilegeNote('technician')).toContain('Technician');
		expect(privilegeNote('unlicensed')).toBe('No amateur privileges');
	});
});
