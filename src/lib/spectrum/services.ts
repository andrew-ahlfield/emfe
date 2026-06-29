/**
 * Radio-service taxonomy for the allocation substrate (SPEC §The three tiers).
 *
 * §2.106 allocates each band to one or more of ~30 named radio services. For a legible ribbon we
 * fold those into eleven **categories**, each with one CSS-variable colour. The fold is editorial
 * but follows how a reader thinks: a mode (aeronautical / maritime) wins over its sub-function
 * (its radionavigation), GPS-style RNSS reads as "navigation", and every satellite-comms service
 * (fixed/mobile/inter-satellite/DBS) reads as "satellite".
 *
 * Pure module: no DOM, no Svelte, no app state. Colours are `var(--svc-*)` strings only.
 */

/**
 * The user-facing service categories (one chip + colour each). `other` is intentionally absent:
 * every real §2.106 service maps to one of these ten, so `other` survives only as an invisible
 * type-level fallback for {@link serviceCategory} (never shown as a filter).
 */
export const SERVICE_CATEGORIES = [
	'broadcasting',
	'mobile',
	'fixed',
	'amateur',
	'aeronautical',
	'maritime',
	'radionavigation',
	'radiolocation',
	'satellite',
	'science'
] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number] | 'other';

/** Human label per category, for the legend / control panel. */
export const SERVICE_LABELS: Record<ServiceCategory, string> = {
	broadcasting: 'Broadcasting',
	mobile: 'Mobile',
	fixed: 'Fixed',
	amateur: 'Amateur',
	aeronautical: 'Aeronautical',
	maritime: 'Maritime',
	radionavigation: 'Radionavigation',
	radiolocation: 'Radiolocation',
	satellite: 'Satellite',
	science: 'Science & passive',
	other: 'Other'
};

/** CSS colour variable for a category. */
export function serviceColorVar(c: ServiceCategory): string {
	return `var(--svc-${c})`;
}

// Ordered rules — first match wins. Order encodes the editorial precedence above.
const RULES: [RegExp, ServiceCategory][] = [
	[/AMATEUR/, 'amateur'],
	[/AERONAUTICAL/, 'aeronautical'],
	[/MARITIME/, 'maritime'],
	[/RADIO ASTRONOMY|SPACE RESEARCH|EARTH EXPLORATION|METEOROLOGICAL|STANDARD FREQUENCY/, 'science'],
	[/RADIONAVIGATION|RADIODETERMINATION/, 'radionavigation'],
	[/RADIOLOCATION/, 'radiolocation'],
	[/BROADCASTING-SATELLITE/, 'satellite'],
	[/BROADCASTING/, 'broadcasting'],
	[/SATELLITE/, 'satellite'],
	[/MOBILE/, 'mobile'],
	[/FIXED/, 'fixed']
];

/** Map a raw §2.106 service name (e.g. `FIXED-SATELLITE (space-to-Earth)`) to a category. */
export function serviceCategory(name: string): ServiceCategory {
	const n = name.toUpperCase();
	for (const [re, cat] of RULES) if (re.test(n)) return cat;
	return 'other';
}

/**
 * The category that colours a band: its first primary service (the table lists the most
 * significant allocation first), falling back to the first secondary, then `other`.
 */
export function bandCategory(band: { primary: string[]; secondary?: string[] }): ServiceCategory {
	const lead = band.primary[0] ?? band.secondary?.[0];
	return lead ? serviceCategory(lead) : 'other';
}

// Compact forms for the on-ribbon label when a band is too narrow for the full service name.
// Longest/most-specific patterns first.
const ABBREVIATIONS: [RegExp, string][] = [
	[/STANDARD FREQUENCY AND TIME SIGNAL/, 'TIME SIGNAL'],
	[/AERONAUTICAL RADIONAVIGATION/, 'AERO RNAV'],
	[/AERONAUTICAL MOBILE/, 'AERO MOBILE'],
	[/MARITIME RADIONAVIGATION/, 'MAR RNAV'],
	[/MARITIME MOBILE/, 'MAR MOBILE'],
	[/RADIONAVIGATION-SATELLITE/, 'RNSS'],
	[/RADIODETERMINATION-SATELLITE/, 'RDSS'],
	[/RADIONAVIGATION/, 'RADIONAV'],
	[/RADIOLOCATION/, 'RADIOLOC'],
	[/BROADCASTING-SATELLITE/, 'BCAST-SAT'],
	[/BROADCASTING/, 'BROADCAST'],
	[/EARTH EXPLORATION-SATELLITE/, 'EESS'],
	[/SPACE RESEARCH/, 'SPACE RES'],
	[/RADIO ASTRONOMY/, 'RADIO ASTR'],
	[/METEOROLOGICAL-SATELLITE/, 'MET-SAT'],
	[/METEOROLOGICAL AIDS/, 'MET AIDS'],
	[/FIXED-SATELLITE/, 'FIXED-SAT'],
	[/MOBILE-SATELLITE/, 'MOBILE-SAT'],
	[/INTER-SATELLITE/, 'INTER-SAT'],
	[/AMATEUR-SATELLITE/, 'HAM-SAT'],
	[/AMATEUR/, 'AMATEUR']
];

/**
 * A compact form of a service name for a narrow ribbon band (e.g. `AERONAUTICAL RADIONAVIGATION`
 * → `AERO RNAV`). Falls back to the cleaned (parenthetical-stripped) name when no rule matches —
 * short names like `FIXED` / `MOBILE` are already as short as they get.
 */
export function abbreviateService(name: string): string {
	const clean = name.replace(/\s*\(.*$/, '').trim();
	const u = clean.toUpperCase();
	for (const [re, short] of ABBREVIATIONS) if (re.test(u)) return short;
	return clean;
}
