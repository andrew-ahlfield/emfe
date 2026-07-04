import { describe, it, expect } from 'vitest';
import {
	ALL_MODES_LABEL,
	classRuns,
	hasPrivilegePlan,
	isAmateurBand,
	modeRuns,
	powerLimit,
	powerMinNote,
	privilegeBands,
	privilegeNote,
	privilegeStrip,
	HAM_SUBBANDS
} from '$lib/spectrum/license';

describe('hasPrivilegePlan', () => {
	it('is true for every HF band with a documented sub-band plan', () => {
		for (const id of [
			'ham160m',
			'ham80m',
			'ham60m',
			'ham40m',
			'ham30m',
			'ham20',
			'ham17m',
			'ham15m',
			'ham12m',
			'ham10m'
		]) {
			expect(hasPrivilegePlan(id)).toBe(true);
		}
	});

	it('is false for bands without a plan', () => {
		expect(hasPrivilegePlan('ham6m')).toBe(false);
		expect(hasPrivilegePlan('wifi')).toBe(false);
		expect(hasPrivilegePlan('does-not-exist')).toBe(false);
	});
});

describe('privilegeBands', () => {
	it('is empty for bands without a documented plan', () => {
		expect(privilegeBands('ham6m', 'extra')).toEqual([]);
		expect(privilegeBands('does-not-exist', 'extra')).toEqual([]);
	});

	it('resolves sub-bands to absolute Hz spanning the whole 20 m band', () => {
		const bands = privilegeBands('ham20', 'extra');
		expect(bands[0].loHz).toBe(14e6);
		expect(bands[bands.length - 1].hiHz).toBe(14.35e6);
	});

	it('enables every sub-band for an Extra holder, none for a Technician on 20 m', () => {
		expect(privilegeBands('ham20', 'extra').every((b) => b.enabled)).toBe(true);
		expect(privilegeBands('ham20', 'technician').some((b) => b.enabled)).toBe(false);
	});

	it('enables only the non-Extra sub-bands for a General holder on 20 m', () => {
		for (const b of privilegeBands('ham20', 'general')) {
			expect(b.enabled).toBe(b.minLicense !== 'extra');
		}
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

	it('keeps every plan ordered and spanning the full band', () => {
		for (const segs of Object.values(HAM_SUBBANDS)) {
			expect(segs[0].from).toBe(0);
			expect(segs[segs.length - 1].to).toBe(1);
			for (let i = 1; i < segs.length; i++) {
				expect(segs[i].from).toBeCloseTo(segs[i - 1].to, 5);
			}
		}
	});

	it('grants a Technician only the CW window on 80 m', () => {
		const strip = privilegeStrip('ham80m', 'technician');
		const enabled = strip.filter((s) => s.enabled);
		expect(enabled).toHaveLength(1);
		expect(enabled[0].mode).toBe('cw');
	});

	it('gives a Technician CW-only on 80/40/15 m but phone on 10 m — never phone below 10 m', () => {
		for (const id of ['ham80m', 'ham40m', 'ham15m']) {
			const enabled = privilegeStrip(id, 'technician').filter((s) => s.enabled);
			expect(enabled.length).toBeGreaterThan(0);
			expect(enabled.every((s) => s.mode === 'cw')).toBe(true);
		}
		// 10 m is the one HF band where a Technician may run phone (voice).
		const tenM = privilegeStrip('ham10m', 'technician').filter((s) => s.enabled);
		expect(tenM.some((s) => s.mode === 'phone')).toBe(true);
	});

	it('locks 30 m to CW/data — no phone segment for any class', () => {
		for (const held of ['general', 'extra'] as const) {
			const strip = privilegeStrip('ham30m', held);
			expect(strip.every((s) => s.mode !== 'phone')).toBe(true);
		}
	});

	it('opens the WARC and 160/60 m bands to General but not Technician', () => {
		for (const id of ['ham160m', 'ham60m', 'ham30m', 'ham17m', 'ham12m']) {
			expect(privilegeStrip(id, 'technician').some((s) => s.enabled)).toBe(false);
			expect(privilegeStrip(id, 'general').every((s) => s.enabled)).toBe(true);
		}
	});

	it('covers every HF band with a sub-band plan', () => {
		for (const id of [
			'ham160m',
			'ham80m',
			'ham60m',
			'ham40m',
			'ham30m',
			'ham20',
			'ham17m',
			'ham15m',
			'ham12m',
			'ham10m'
		]) {
			expect(HAM_SUBBANDS[id]?.length).toBeGreaterThan(0);
		}
	});
});

describe('powerLimit', () => {
	it('defaults to the 1500 W PEP legal limit on a full-privilege HF band', () => {
		expect(powerLimit('ham20', 'general')).toBe('1500 W PEP');
		expect(powerLimit('ham17m', 'extra')).toBe('1500 W PEP');
	});

	it('caps 30 m at 200 W PEP for every class', () => {
		expect(powerLimit('ham30m', 'general')).toBe('200 W PEP');
		expect(powerLimit('ham30m', 'extra')).toBe('200 W PEP');
	});

	it('quotes the ERP/EIRP ceilings on 60 m and the LF/VLF bands', () => {
		expect(powerLimit('ham60m', 'general')).toBe('100 W ERP');
		expect(powerLimit('ham630m', 'technician')).toBe('5 W EIRP');
		expect(powerLimit('ham2200m', 'technician')).toBe('1 W EIRP');
	});

	it('holds a Technician to 200 W on their HF segments but full power on VHF', () => {
		for (const id of ['ham80m', 'ham40m', 'ham15m', 'ham10m']) {
			expect(powerLimit(id, 'technician')).toBe('200 W PEP');
			expect(powerLimit(id, 'general')).toBe('1500 W PEP');
		}
		// A Technician runs the legal limit on 2 m — the 200 W cap is HF-segment-specific.
		expect(powerLimit('2m', 'technician')).toBe('1500 W PEP');
	});

	it('gives the fixed Part 95 limit for the personal-radio bands', () => {
		expect(powerLimit('cb', 'unlicensed')).toBe('4 W AM · 12 W PEP SSB');
		expect(powerLimit('frs', 'unlicensed')).toBe('FRS 2 W · GMRS up to 50 W');
		expect(powerLimit('murs', 'unlicensed')).toBe('2 W');
	});

	it('is empty for bands with no operator power limit', () => {
		expect(powerLimit('wifi', 'extra')).toBe('');
		expect(powerLimit('fm-broadcast', 'extra')).toBe('');
	});

	it('attaches the §97.313 minimum-power note to amateur bands only', () => {
		expect(powerMinNote('ham20')).toContain('§97.313');
		expect(powerMinNote('2m')).toContain('§97.313');
		expect(powerMinNote('cb')).toBe('');
		expect(powerMinNote('frs')).toBe('');
	});
});

describe('isAmateurBand', () => {
	it('is true for ham* ids and 2 m, false for Part 95 and everything else', () => {
		for (const id of ['ham17m', 'ham6m', 'ham70cm', '2m']) expect(isAmateurBand(id)).toBe(true);
		for (const id of ['cb', 'frs', 'murs', 'wifi']) expect(isAmateurBand(id)).toBe(false);
	});

	it('exposes an all-modes caption for bands with no class-varying plan', () => {
		expect(ALL_MODES_LABEL).toMatch(/CW/);
		expect(ALL_MODES_LABEL).toMatch(/voice/);
		// 6 m has no documented sub-band plan → the card falls back to the all-modes caption.
		expect(hasPrivilegePlan('ham6m')).toBe(false);
	});
});

describe('classRuns / modeRuns', () => {
	it('merges a single-class band split only by mode into one class run (17 m)', () => {
		const runs = classRuns(privilegeStrip('ham17m', 'general'));
		expect(runs).toHaveLength(1);
		expect(runs[0]).toMatchObject({ key: 'general', from: 0, to: 1, enabled: true });
		// …while the mode row keeps the CW/data → phone split.
		expect(modeRuns(privilegeStrip('ham17m', 'general')).map((r) => r.key)).toEqual([
			'data',
			'phone'
		]);
	});

	it('merges the two Technician mode segments on 10 m into one T run', () => {
		const runs = classRuns(privilegeStrip('ham10m', 'technician'));
		// 28.0–28.3 data + 28.3–28.5 phone are both Technician → one run, then General above.
		expect(runs.map((r) => r.key)).toEqual(['technician', 'general']);
		expect(runs[0].enabled).toBe(true);
		expect(runs[1].enabled).toBe(false); // a Technician can't work 28.5–29.7
		expect(modeRuns(privilegeStrip('ham10m', 'technician')).map((r) => r.key)).toEqual([
			'data',
			'phone'
		]);
	});

	it('keeps distinct adjacent classes separate (20 m: E, G, E, G)', () => {
		expect(classRuns(privilegeStrip('ham20', 'extra')).map((r) => r.key)).toEqual([
			'extra',
			'general',
			'extra',
			'general'
		]);
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
