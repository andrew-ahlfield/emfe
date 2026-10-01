import { describe, it, expect } from 'vitest';
import { axisTicks, maxLabelGap } from '$lib/spectrum/ticks';
import { FULL_DOMAIN, windowDomain, type FreqDomain } from '$lib/spectrum/scale';

/** Representative plot widths: mobile, large phone/tablet portrait, tablet, desktop, wide desktop. */
const WIDTHS = [360, 414, 768, 1280, 1680];

/**
 * A representative spread of zoom levels (1 = whole spectrum → deep) at a few centres, so we cover
 * the whole-spectrum view, the awkward mid-zoom that used to go sparse, and deep single-band zooms.
 */
const ZOOMS = [1, 2, 3.5, 5, 7.37, 12, 30, 80, 256, 2048, 32768];
const CENTERS = [3, 8, 12, 18];

const domains: FreqDomain[] = [];
for (const zoom of ZOOMS) {
	for (const c of CENTERS) domains.push(windowDomain(FULL_DOMAIN, c, zoom));
}
// The exact view from the bug report (z=7.37, c=8.33): a ~3.3-decade window.
domains.push(windowDomain(FULL_DOMAIN, 8.33, 7.37));

/**
 * The axis must never look empty: no stretch wider than this fraction of the screen may go without
 * a labelled tick (including the gaps from each edge). 0.5 = "never more than half the axis blank"
 * generous enough to allow honest log spacing on small screens, strict enough that the old
 * every-3rd-power behaviour (a single "1 GHz" across a 3-decade window) would fail it.
 */
const MAX_GAP_FRACTION = 0.5;

describe('axisTicks: label density across zooms and screen sizes', () => {
	for (const width of WIDTHS) {
		it(`never leaves a label gap wider than ${Math.round(MAX_GAP_FRACTION * 100)}% of a ${width}px axis`, () => {
			for (const domain of domains) {
				const gap = maxLabelGap(axisTicks(domain, width), width);
				expect(
					gap,
					`width ${width}, window 10^${domain.minExp.toFixed(2)}–10^${domain.maxExp.toFixed(2)}`
				).toBeLessThanOrEqual(width * MAX_GAP_FRACTION);
			}
		});
	}

	it('always produces at least one labelled tick', () => {
		for (const width of WIDTHS) {
			for (const domain of domains) {
				const labelled = axisTicks(domain, width).filter((t) => t.labeled);
				expect(labelled.length, `width ${width}`).toBeGreaterThan(0);
			}
		}
	});

	it('fixes the reported sparse mid-zoom (z=7.37, c=8.33): several labels, not one', () => {
		const domain = windowDomain(FULL_DOMAIN, 8.33, 7.37);
		const labelled = axisTicks(domain, 1280).filter((t) => t.labeled);
		expect(labelled.length).toBeGreaterThanOrEqual(4);
	});
});
