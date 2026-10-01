/**
 * Allocation-substrate loader (the bottom tier, SPEC §The three tiers).
 *
 * `data/allocation-table/us-table.json` is curated from the US Table of Frequency Allocations
 * (47 CFR §2.106) and tiles 8.3 kHz … 275 GHz without gaps. It lives in its own directory so the
 * application loader's `data/allocations/*.json` glob never picks it up (different shape). Pure
 * data: no DOM, no Svelte, no app state.
 */

import table from '../../../data/allocation-table/us-table.json';
import type { ServiceAllocation, SubstrateData } from './types';

const data = table as SubstrateData;

/** The substrate bands, ascending by low edge (already authored in order). */
export const substrate: ServiceAllocation[] = [...data.bands].sort((a, b) => a.lo - b.lo);

/** The §2.106 revision the substrate was curated from. */
export const substrateRevision: string = data.revision;
