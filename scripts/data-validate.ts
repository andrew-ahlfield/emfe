/**
 * Validate curated allocation data against the JSON schema + invariants.
 *
 * Gates build + commit (SPEC §Boundaries): exits non-zero on any violation.
 *   1. JSON-schema conformance for data/sources.json and every data/allocations/*.json
 *   2. invariants (validateAllocations): enums, bands, monotonicity, no per-layer overlap,
 *      every `source` resolvable.
 *
 * Run natively by Node (`node scripts/data-validate.ts`) — no build step.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { validateAllocations } from '../src/lib/data/validate.ts';
import type { RawAllocation, SourceRef } from '../src/lib/data/types.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (rel: string) => JSON.parse(readFileSync(join(root, rel), 'utf8'));

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Compile each schema once — Ajv rejects re-compiling the same $id, and we validate
// many allocation files against the one allocations schema.
const allocationsValidator = ajv.compile(readJson('data/schema/allocations.schema.json'));
const sourcesValidator = ajv.compile(readJson('data/schema/sources.schema.json'));

const errors: string[] = [];

type Validator = (data: unknown) => boolean;
const checkSchema = (validate: Validator, data: unknown, label: string) => {
	if (!validate(data)) {
		for (const e of (
			validate as unknown as { errors?: { instancePath: string; message?: string }[] }
		).errors ?? []) {
			errors.push(`${label}${e.instancePath} ${e.message}`);
		}
		return false;
	}
	return true;
};

// 1. Sources.
const sources = readJson('data/sources.json') as SourceRef[];
checkSchema(sourcesValidator, sources, 'sources');
const sourceIds = new Set(sources.map((s) => s.id));

// 2. Allocations (every file in data/allocations/).
const allocDir = join(root, 'data/allocations');
const allAllocs: RawAllocation[] = [];
for (const file of readdirSync(allocDir).filter((f) => f.endsWith('.json'))) {
	const data = readJson(`data/allocations/${file}`);
	if (checkSchema(allocationsValidator, data, file)) {
		allAllocs.push(...(data as RawAllocation[]));
	}
}

// 3. Cross-cutting invariants.
for (const issue of validateAllocations(allAllocs, sourceIds)) {
	errors.push(`invariant [${issue.id}] ${issue.message}`);
}

if (errors.length > 0) {
	console.error(`data:validate — ${errors.length} problem(s):`);
	for (const e of errors) console.error(`  ✗ ${e}`);
	process.exit(1);
}

console.log(`data:validate — OK (${allAllocs.length} allocations, ${sources.length} sources).`);
