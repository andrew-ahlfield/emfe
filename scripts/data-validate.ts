/**
 * Validate curated allocation data against the JSON schema + invariants.
 *
 * Stub for Task 1 (scaffold). Task 3 implements the real validation:
 *   - JSON-schema conformance for every file in data/allocations/
 *   - no overlapping bands within a layer
 *   - monotonic representative frequencies
 *   - valid layer / region / source references
 *
 * Exits non-zero on any violation so it can gate build + commit (SPEC §Boundaries).
 */

function main(): number {
	console.log('data:validate — stub (no data yet). Implemented in Task 3.');
	return 0;
}

process.exit(main());
