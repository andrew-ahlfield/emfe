import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { visibleGroups, restoreGroups } from '$lib/state/visible';
import { layers, setAllLayers, enableLayer, defaultLayers } from '$lib/state/layers';

// Reset the shared layer store to first-open before each case (the visible store's auto-collapse
// subscription keys off it, so a clean baseline keeps cases independent).
beforeEach(() => layers.set(defaultLayers()));

describe('restoreGroups (deep-link restore)', () => {
	it('applies the snapshot verbatim', () => {
		restoreGroups({ laser: true, led: false, gas: true, fireworks: false });
		expect(get(visibleGroups)).toEqual({
			laser: true,
			led: false,
			gas: true,
			fireworks: false
		});
	});

	it('is not clobbered when an optical layer toggles on afterwards (ordering-hazard fix)', () => {
		// A shared link may encode a layer state that hides every optical layer. Restoring it fires the
		// visible store's blank-when-uncovered pass, which *remembers* the pre-load groups so it can
		// restore them later. restoreGroups must clear that memory, otherwise the next optical-layer
		// toggle springs the remembered set back and overwrites the link's intended groups.
		// The remembered baseline below has gas ON; the link restores gas OFF, so a regression that
		// failed to clear the memory would flip gas back on when science comes up, tripping the assert.
		restoreGroups({ laser: false, led: true, gas: true, fireworks: true }); // busy baseline
		setAllLayers(false); // hides all optical layers → subscription blanks + remembers the baseline
		restoreGroups({ laser: true, led: false, gas: false, fireworks: false }); // the link's state

		enableLayer('science'); // lasers live here → optical coverage returns
		expect(get(visibleGroups).laser).toBe(true); // still ours, not the remembered pre-load set
		expect(get(visibleGroups).gas).toBe(false);
	});
});
