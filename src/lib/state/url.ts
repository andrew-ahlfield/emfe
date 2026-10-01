/**
 * Deep-link (de)serialization: a compact, lossless mapping between the explorer's view state
 * and the URL query string. Only **non-default** dimensions are written, so a pristine view
 * yields an empty query and shared links stay short. Decoding is total: every missing or
 * malformed parameter degrades to its safe default.
 *
 * The guiding rule (SPEC): sharing your link should hand the recipient *your current view*.
 * Every control that changes what's on screen is mirrored here: layers, licence, the visible-
 * light sub-filter, the allocation substrate (admin + service ribbon), the axis/scale overlays,
 * the pinned state of the details drawer, and whichever details card is open.
 *
 * The one deliberate exception is **theme (dark/light)**: it is *not* encoded. Colour scheme is a
 * per-viewer preference (OS `prefers-color-scheme`, or a local override persisted to
 * localStorage), not a property of the view being shared. A recipient should read the link in
 * their own preferred scheme, not have the sharer's forced on them. See `state/theme.ts` and the
 * bootstrap script in `app.html`.
 *
 * Pure module: no DOM, no stores. The component owns reading/writing `window.location`.
 */

import {
	LAYERS,
	DEFAULT_ON_LAYERS,
	LICENSE_RANKS,
	OPTICAL_GROUPS,
	type LayerId,
	type LicenseRank,
	type OpticalGroup
} from '$lib/data/types';
import { SERVICE_CATEGORIES, type ServiceCategory } from '$lib/spectrum/services';
import { FULL_DOMAIN, type FreqDomain } from '$lib/spectrum/scale';
import { clampZoom, clampCenter } from '$lib/spectrum/zoom';
import type { Admin } from './substrate';
import type { AxisOptions } from './axis';

/** A complete snapshot of the deep-linkable view state. */
export interface DeepLinkSnapshot {
	centerExp: number;
	zoom: number;
	layers: Record<LayerId, boolean>;
	license: LicenseRank;
	/**
	 * The open details card as an opaque token (`<kind>:<id>`, see `state/card.ts`), or null.
	 * Covers all three mutually-exclusive cards: a marker's allocation, a spectrum neighbourhood,
	 * or a substrate band. This module keeps it opaque; `card.ts` maps it to/from concrete data.
	 */
	card: string | null;
	/** Visible-light sub-filter: which optical source groups are shown. */
	visibleGroups: Record<OpticalGroup, boolean>;
	/** Allocation substrate: which administration's table to show. */
	admin: Admin;
	/** Allocation substrate: the *hidden* service categories (empty = whole ribbon shown). */
	servicesOff: Set<ServiceCategory>;
	/** Axis & scale overlays. */
	axis: AxisOptions;
	/** Whether the details drawer is pinned (docked) rather than a transient overlay. */
	pinned: boolean;
}

const DEFAULT_LICENSE: LicenseRank = 'extra';
const DEFAULT_ADMIN: Admin = 'all';
const midExp = (full: FreqDomain) => (full.minExp + full.maxExp) / 2;

/** Valid service ids for the substrate ribbon: the categories plus the catch-all "other". */
const SERVICE_IDS = [...SERVICE_CATEGORIES, 'other'] as ServiceCategory[];

// ── Per-dimension defaults (kept in step with the owning store) ──────────────────────────────
const defaultLayers = (): Record<LayerId, boolean> =>
	Object.fromEntries(LAYERS.map((l) => [l, DEFAULT_ON_LAYERS.includes(l)])) as Record<
		LayerId,
		boolean
	>;

/** First-open visible-light default: LEDs only. Mirrors `state/visible.ts` `defaultGroups()`. */
const defaultVisible = (): Record<OpticalGroup, boolean> =>
	Object.fromEntries(OPTICAL_GROUPS.map((g) => [g, g === 'led'])) as Record<OpticalGroup, boolean>;

/** The axis overlays encoded as tokens; the default enabled set is just the wavelength row. */
const AXIS_TOKENS = ['exp', 'lambda', 'ev'] as const;
const axisOn = (a: AxisOptions): string[] =>
	[a.showExp && 'exp', a.showLambda && 'lambda', a.showEv && 'ev'].filter(Boolean) as string[];

/** Drop trailing zeros from a fixed-precision number string (e.g. "2.50" → "2.5"). */
function trim(n: number, places: number): string {
	return String(Number(n.toFixed(places)));
}

/**
 * An on-list is written when it differs from its default: the enabled ids joined by commas, or the
 * literal "none" when nothing is on (so "everything off" is distinguishable from "unset").
 */
function encodeOnList(on: string[], isDefault: boolean): string | null {
	if (isDefault) return null;
	return on.length > 0 ? on.join(',') : 'none';
}

/** Serialize a snapshot to a query string (without the leading "?"). Defaults are omitted. */
export function encodeState(s: DeepLinkSnapshot): string {
	const params = new URLSearchParams();

	// Center only matters once zoomed in (at zoom 1 the window is the whole spectrum).
	if (s.zoom > 1) {
		params.set('z', trim(s.zoom, 2));
		params.set('c', trim(s.centerExp, 2));
	}
	// Layers are written as the explicit on-list ("layers=consumer,science"), diffed against the
	// curated first-open default: "layers=none" when everything is off. (The pre-curated-default
	// format was an off-list relative to all-on; parseLayers still accepts it for old links.)
	const layersOn = LAYERS.filter((l) => s.layers[l]);
	const layersDefault =
		layersOn.length === DEFAULT_ON_LAYERS.length &&
		layersOn.every((l) => DEFAULT_ON_LAYERS.includes(l));
	const layersEnc = encodeOnList(layersOn, layersDefault);
	if (layersEnc !== null) params.set('layers', layersEnc);

	if (s.license !== DEFAULT_LICENSE) params.set('lic', s.license);
	if (s.card) params.set('card', s.card);

	// Visible-light sub-filter: on-list of optical groups, diffed against the LED-only default.
	const visOn = OPTICAL_GROUPS.filter((g) => s.visibleGroups[g]);
	const visDefault = visOn.length === 1 && visOn[0] === 'led';
	const visEnc = encodeOnList(visOn, visDefault);
	if (visEnc !== null) params.set('vis', visEnc);

	// Substrate admin filter (default "all" omitted) and the *hidden* service categories as an
	// off-list (empty = whole ribbon shown = omitted).
	if (s.admin !== DEFAULT_ADMIN) params.set('adm', s.admin);
	const svcOff = SERVICE_IDS.filter((c) => s.servicesOff.has(c));
	if (svcOff.length > 0) params.set('svc', svcOff.join(','));

	// Axis overlays: on-list of tokens, diffed against the wavelength-only default.
	const axOn = axisOn(s.axis);
	const axDefault = axOn.length === 1 && axOn[0] === 'lambda';
	const axEnc = encodeOnList(axOn, axDefault);
	if (axEnc !== null) params.set('ax', axEnc);

	if (s.pinned) params.set('pin', '1');

	return params.toString();
}

function parseLayers(params: URLSearchParams): Record<LayerId, boolean> {
	// Current format: an explicit on-list. Unknown ids are dropped; a value with no valid ids is
	// treated as malformed and degrades to the default, except the deliberate "none".
	const raw = params.get('layers');
	if (raw !== null) {
		const on = raw.split(',').filter((id) => (LAYERS as readonly string[]).includes(id));
		if (on.length === 0 && raw !== 'none') return defaultLayers();
		return Object.fromEntries(LAYERS.map((l) => [l, on.includes(l)])) as Record<LayerId, boolean>;
	}
	// Legacy format (pre-curated-default links): an off-list relative to all layers on.
	const off = params.get('off');
	if (off !== null) {
		const layers = Object.fromEntries(LAYERS.map((l) => [l, true])) as Record<LayerId, boolean>;
		for (const id of off.split(',')) {
			if ((LAYERS as readonly string[]).includes(id)) layers[id as LayerId] = false;
		}
		return layers;
	}
	return defaultLayers();
}

/** Decode an on-list param into a per-key boolean record, degrading to `fallback` when malformed. */
function parseOnList<K extends string>(
	raw: string | null,
	keys: readonly K[],
	fallback: () => Record<K, boolean>
): Record<K, boolean> {
	if (raw === null) return fallback();
	const on = raw.split(',').filter((id) => (keys as readonly string[]).includes(id));
	if (on.length === 0 && raw !== 'none') return fallback();
	return Object.fromEntries(keys.map((k) => [k, on.includes(k)])) as Record<K, boolean>;
}

/**
 * Decode a query string into a complete snapshot. Every field falls back to its default when
 * the parameter is absent or malformed, so partial/garbage URLs never throw.
 *
 * The `card` token is returned as-is (or null); the caller (`state/card.ts`) resolves and
 * validates it against the dataset.
 */
export function decodeState(
	params: URLSearchParams,
	full: FreqDomain = FULL_DOMAIN
): DeepLinkSnapshot {
	const rawZoom = Number(params.get('z'));
	const zoom = Number.isFinite(rawZoom) && rawZoom > 0 ? clampZoom(rawZoom) : 1;

	const rawCenter = Number(params.get('c'));
	const centerExp = clampCenter(Number.isFinite(rawCenter) ? rawCenter : midExp(full), full, zoom);

	const rawLic = params.get('lic');
	const license: LicenseRank = (LICENSE_RANKS as readonly string[]).includes(rawLic ?? '')
		? (rawLic as LicenseRank)
		: DEFAULT_LICENSE;

	// The open card. Current format is the unified `card=<kind>:<id>` token; legacy links used a
	// bare `sel=<allocation-id>` (markers only), which maps onto the "sig" kind.
	const rawCard = params.get('card');
	const legacySel = params.get('sel');
	const card =
		rawCard && rawCard.length > 0
			? rawCard
			: legacySel && legacySel.length > 0
				? `sig:${legacySel}`
				: null;

	const rawAdm = params.get('adm');
	const admin: Admin = rawAdm === 'non-federal' || rawAdm === 'federal' ? rawAdm : DEFAULT_ADMIN;

	const rawSvc = params.get('svc');
	const servicesOff = new Set<ServiceCategory>(
		rawSvc === null
			? []
			: rawSvc
					.split(',')
					.filter((c): c is ServiceCategory => SERVICE_IDS.includes(c as ServiceCategory))
	);

	const ax = parseOnList(params.get('ax'), AXIS_TOKENS, () => ({
		exp: false,
		lambda: true,
		ev: false
	}));

	return {
		centerExp,
		zoom,
		layers: parseLayers(params),
		license,
		card,
		visibleGroups: parseOnList(params.get('vis'), OPTICAL_GROUPS, defaultVisible),
		admin,
		servicesOff,
		axis: { showExp: ax.exp, showLambda: ax.lambda, showEv: ax.ev },
		pinned: params.get('pin') === '1'
	};
}

/** Whether two snapshots differ in a *discrete* dimension (anything other than zoom/pan). */
export function discreteChanged(a: DeepLinkSnapshot, b: DeepLinkSnapshot): boolean {
	if (a.license !== b.license || a.card !== b.card) return true;
	if (a.admin !== b.admin || a.pinned !== b.pinned) return true;
	if (LAYERS.some((l) => a.layers[l] !== b.layers[l])) return true;
	if (OPTICAL_GROUPS.some((g) => a.visibleGroups[g] !== b.visibleGroups[g])) return true;
	if (
		a.axis.showExp !== b.axis.showExp ||
		a.axis.showLambda !== b.axis.showLambda ||
		a.axis.showEv !== b.axis.showEv
	)
		return true;
	if (a.servicesOff.size !== b.servicesOff.size) return true;
	for (const c of a.servicesOff) if (!b.servicesOff.has(c)) return true;
	return false;
}
