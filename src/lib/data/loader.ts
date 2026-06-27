/**
 * Allocation data loader.
 *
 * Curated JSON under data/ is the source of truth (SPEC §Tech Stack). At build time Vite
 * inlines every file in data/allocations/*.json plus the source registry; the loader
 * resolves each allocation's `source` id into a full {@link SourceRef} and returns the set
 * sorted by representative frequency. Pure data — no DOM, no Svelte, no app state.
 */

import sourceList from '../../../data/sources.json';
import type { Allocation, RawAllocation, SourceRef } from './types';

const sources = sourceList as SourceRef[];
const sourceById = new Map(sources.map((s) => [s.id, s]));

// Eagerly inlined at build; `import: 'default'` yields each file's array directly.
const allocationFiles = import.meta.glob('/data/allocations/*.json', {
	eager: true,
	import: 'default'
}) as Record<string, RawAllocation[]>;

const rawAllocations: RawAllocation[] = Object.values(allocationFiles).flat();

/** All allocations, source-resolved and sorted ascending by representative frequency. */
export const allocations: Allocation[] = rawAllocations
	.map((a): Allocation => {
		const source = sourceById.get(a.source);
		if (!source) throw new Error(`Allocation "${a.id}" references unknown source "${a.source}"`);
		return { ...a, source };
	})
	.sort((x, y) => x.hz - y.hz);

/** Every distinct source referenced by the loaded allocations (for the Sources modal). */
export function referencedSources(): SourceRef[] {
	const ids = new Set(allocations.map((a) => a.source.id));
	return sources.filter((s) => ids.has(s.id));
}
