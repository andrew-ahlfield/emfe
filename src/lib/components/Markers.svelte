<svelte:options namespace="svg" />

<script lang="ts">
	import { logPos, type FreqDomain, FULL_DOMAIN, decades } from '$lib/spectrum/scale';
	import { visibleAllocations, effectiveLayer } from '$lib/spectrum/filter';
	import { layoutSpectrum, type PlacedItem } from '$lib/spectrum/grouping';
	import { licenseRank, type Allocation } from '$lib/data/types';
	import { fmtFreq } from '$lib/spectrum/format';
	import { spectralColor } from '$lib/spectrum/color';
	import { LICENSE_ICON, privilegeBands, hasPrivilegePlan } from '$lib/spectrum/license';
	import { clampCenter, clampZoom } from '$lib/spectrum/zoom';
	import { allocations } from '$lib/data/loader';
	import type { LayerId, LicenseRank } from '$lib/data/types';
	import { select } from '$lib/state/selection';
	import { jumpTo } from '$lib/state/view';
	import { visibleGroups } from '$lib/state/visible';
	import { PLOT } from './plot-layout';

	let {
		width,
		domain,
		selected,
		layers,
		license
	}: {
		width: number;
		domain: FreqDomain;
		selected: string | null;
		layers: Record<LayerId, boolean>;
		license: LicenseRank;
	} = $props();

	/** Top y of each label lane; three staggered rows that stay clear of the region labels. */
	const LANE_Y = [6, 33, 60];
	/** Callout dots sit on the vertical centre line of the coloured band. */
	const bandMid = PLOT.bandY + PLOT.bandH / 2;
	/** A real-bandwidth bar replaces the dot once the allocation's band is at least this wide. */
	const MIN_BAR_PX = 7;
	/** A bar at least this wide on screen can carry the licence glyph centred on it; narrower
	 *  bands (and points) park the glyph just to their left so it never gets clipped. */
	const ICON_FIT_PX = 17;
	/** An opaque sub-band section at least this wide can seat its own class glyph, centred. */
	const SECTION_GLYPH_PX = 13;

	/**
	 * An "emitter" colours itself by the physical colour of its light: a laser/LED (`emission`) or a
	 * gas/discharge (`lines`). Everything else — including non-laser physical-science phenomena like
	 * IR heat, UV bands and gamma sources — keeps its content-layer colour (science = green).
	 */
	const emits = (a: Allocation | null): boolean =>
		!!a && (a.emission != null || (a.lines?.length ?? 0) > 0);
	/** Marker fill for an emitter: white for a broadband white LED, else the sampled spectral colour. */
	const fillOf = (a: Allocation | null, fallback: string): string =>
		a?.emission === 'white'
			? 'var(--emit-white)'
			: a?.emission === 'spectral'
				? spectralColor(a.hz)
				: fallback;
	/** Callout-line colour: spectral only for a colour-true emitter (a laser/LED); else layer colour. */
	const lineColorOf = (a: Allocation | null, fallback: string): string =>
		a?.emission === 'spectral' ? spectralColor(a.hz) : fallback;

	interface IconPlacement {
		glyph: string;
		x: number;
		/** Centred on a solid section (white) vs parked to the left in the amateur colour. */
		onBar: boolean;
	}

	/**
	 * The operator-licence glyph(s) for an amateur allocation — the chart's cue to which class a
	 * band belongs to. For a sub-banded band this mirrors the inspector strip: one glyph per
	 * transmittable (opaque) sub-band, centred on it and showing *that section's* class. Plain
	 * bands, points, and bands you can't transmit on anywhere fall back to one glyph for the band's
	 * required class, riding the bar when there's room or parked just to its left otherwise.
	 */
	function iconsOf(
		a: Allocation | null,
		centerX: number,
		bar: { x0: number; w: number } | null
	): IconPlacement[] {
		if (!a?.reqLicense) return [];

		// Sub-banded band with real width: a glyph on each opaque section, centred on it.
		if (bar && hasPrivilegePlan(a.id)) {
			const enabled = privilegeBands(a.id, license).filter((b) => b.enabled);
			if (enabled.length > 0) {
				const out: IconPlacement[] = [];
				for (const b of enabled) {
					const x0 = logPos(b.loHz, domain) * width;
					const x1 = logPos(b.hiHz, domain) * width;
					if (x1 - x0 >= SECTION_GLYPH_PX) {
						out.push({ glyph: LICENSE_ICON[b.minLicense], x: (x0 + x1) / 2, onBar: true });
					}
				}
				// Every section too narrow for its own glyph → one centred on the band as a whole.
				return out.length > 0
					? out
					: [{ glyph: LICENSE_ICON[enabled[0].minLicense], x: bar.x0 + bar.w / 2, onBar: true }];
			}
			// else: no transmittable section — fall through to the single required-class glyph.
		}

		// Plain band / point / fully-muted band: one glyph for the band's required class. A solid
		// (transmittable) wide bar carries it centred; everything else parks it to the left so it
		// reads against the dark plot rather than a see-through fill.
		const glyph = LICENSE_ICON[a.reqLicense];
		if (bar && bar.w >= ICON_FIT_PX && !mutedAmateur(a)) {
			return [{ glyph, x: bar.x0 + bar.w / 2, onBar: true }];
		}
		const leftEdge = bar ? bar.x0 : centerX;
		return [{ glyph, x: leftEdge - 8, onBar: false }];
	}

	/**
	 * The on-screen pixel extent of an allocation's real band — or `null` when it has no band
	 * or is still too narrow to render as anything but a point. Once wide enough we draw the
	 * allocation at its true width on the axis (the "render data in real bandwidth" goal).
	 */
	function barOf(a: Allocation | null): { x0: number; x1: number; w: number } | null {
		if (!a?.band) return null;
		const x0 = logPos(a.band[0], domain) * width;
		const x1 = logPos(a.band[1], domain) * width;
		const w = x1 - x0;
		return w >= MIN_BAR_PX ? { x0, x1, w } : null;
	}

	/**
	 * The on-screen rects to draw for a bar — one per occupied {@link Allocation.segments} group
	 * when present (so the unused gap between groups isn't filled), else the single band span.
	 */
	function segmentsOf(a: Allocation | null): { x0: number; w: number }[] {
		if (!a) return [];
		const ranges = a.segments ?? (a.band ? [a.band] : []);
		return ranges.map(([lo, hi]) => {
			const x0 = logPos(lo, domain) * width;
			return { x0, w: logPos(hi, domain) * width - x0 };
		});
	}

	/**
	 * For a band with a documented sub-band privilege plan, the held licence's *accessible* runs
	 * (adjacent sub-bands merged) in screen px, plus whether the class unlocks the whole band.
	 * `null` for bands with no plan — those fall back to the plain single/segmented bar.
	 *
	 * This is what makes the band expand/contract with the licence: at a class with no privilege
	 * the runs are empty (only the transparent envelope shows); at Extra every sub-band is unlocked
	 * (`allEnabled`) and the band draws solid edge-to-edge.
	 */
	function privSegsOf(
		a: Allocation | null
	): { runs: { x0: number; w: number }[]; allEnabled: boolean } | null {
		if (!a?.band || !hasPrivilegePlan(a.id)) return null;
		const bands = privilegeBands(a.id, license);
		const runs: { loHz: number; hiHz: number }[] = [];
		for (const b of bands) {
			if (!b.enabled) continue;
			const last = runs[runs.length - 1];
			if (last && Math.abs(b.loHz - last.hiHz) < 1) last.hiHz = b.hiHz;
			else runs.push({ loHz: b.loHz, hiHz: b.hiHz });
		}
		const toPx = (loHz: number, hiHz: number) => {
			const x0 = logPos(loHz, domain) * width;
			return { x0, w: logPos(hiHz, domain) * width - x0 };
		};
		return {
			runs: runs.map((r) => toPx(r.loHz, r.hiHz)),
			allEnabled: bands.length > 0 && bands.every((b) => b.enabled)
		};
	}

	/**
	 * True when an amateur item is one the held licence can't transmit *anywhere* on — so it's
	 * drawn translucent (you may listen, just not key up). A sub-banded band counts only when no
	 * sub-band is unlocked; a plain amateur band when the class sits below its `reqLicense`.
	 * Drives the see-through circle in point-source mode and the transparent envelope as a bar.
	 */
	function mutedAmateur(a: Allocation | null): boolean {
		if (!a?.reqLicense) return false;
		if (hasPrivilegePlan(a.id)) return privilegeBands(a.id, license).every((b) => !b.enabled);
		return licenseRank(license) < licenseRank(a.reqLicense);
	}

	// Filter to the visible set (application tier only — assignments ride the middle lane and the
	// substrate is the bottom tier), then recolour dual-layer entries (e.g. UV-A) to whichever of
	// their two layers is currently on — physical-science preferred — before grouping reads `.layer`.
	let visible = $derived(
		visibleAllocations(allocations, 3, layers)
			.filter((a) => a.tier !== 'assignment')
			// Visible-light sub-filter: hide an optical entry whose group (laser/LED/gas/firework)
			// is toggled off. Entries without an `optical` group are unaffected.
			.filter((a) => !a.optical || $visibleGroups[a.optical])
			.map((a) => (a.altLayer ? { ...a, layer: effectiveLayer(a, layers) } : a))
	);

	let layout = $derived(layoutSpectrum(visible, domain, width, fmtFreq, { lanes: LANE_Y.length }));

	/** Geometry for one placed label (leaf or group), resolved against its lane. */
	function place(item: PlacedItem) {
		const top = LANE_Y[item.lane];
		return {
			item,
			nameY: top + 11,
			subY: top + 22,
			lineTop: top + 28,
			color: `var(--layer-${item.layer})`
		};
	}

	let placed = $derived(layout.items.map(place));

	/** Ids already drawn (with their own emphasised dot) by the label layer, so the dot layer
	 *  skips them to avoid double-drawing. */
	let labelledLeafIds = $derived(
		new Set(layout.items.filter((i) => i.kind === 'leaf').map((i) => i.id))
	);

	/** On-screen bar width of an allocation (0 when it renders as a point), for z-ordering. */
	const barWidth = (a: Allocation | null) => barOf(a)?.w ?? 0;

	// Draw order at the band line, back → front, so nothing is swallowed:
	//   1. group envelopes (the transparent neighbourhood spans) sit underneath everything;
	//   2. then data dots/bars and labelled leaves, each sorted widest-first so the *smaller*
	//      an entry is, the higher it rides — a narrow band is never buried under a wide one.
	let groupItems = $derived(placed.filter((p) => p.item.kind === 'group'));
	let leafItems = $derived(
		placed
			.filter((p) => p.item.kind === 'leaf')
			.sort((a, b) => barWidth(b.item.alloc ?? null) - barWidth(a.item.alloc ?? null))
	);
	let plainDots = $derived(
		layout.dots
			.filter((d) => !labelledLeafIds.has(d.id))
			.sort((a, b) => barWidth(b.alloc) - barWidth(a.alloc))
	);

	/** Click a group chip → frame that neighbourhood (drill down a tier). */
	function zoomToFamily(item: PlacedItem) {
		const lo = item.members[0].hz;
		const hi = item.members[item.members.length - 1].hz;
		const loE = Math.log10(lo);
		const hiE = Math.log10(hi);
		const span = Math.max(hiE - loE, 0.2) * 1.4; // pad so the cluster isn't edge-to-edge
		const zoom = clampZoom(decades(FULL_DOMAIN) / span);
		const centerExp = clampCenter((loE + hiE) / 2, FULL_DOMAIN, zoom);
		jumpTo({ centerExp, zoom });
	}

	function activate(item: PlacedItem) {
		if (item.kind === 'group') zoomToFamily(item);
		else select(item.id);
	}

	function onKey(e: KeyboardEvent, item: PlacedItem) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			activate(item);
		}
	}

	function onKey2(e: KeyboardEvent, id: string) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			select(id);
		}
	}
</script>

<defs>
	<linearGradient id="spectral-swatch" x1="0" y1="0" x2="1" y2="0">
		<stop offset="0" stop-color="var(--spectral-red)" />
		<stop offset="0.2" stop-color="var(--spectral-orange)" />
		<stop offset="0.4" stop-color="var(--spectral-yellow)" />
		<stop offset="0.6" stop-color="var(--spectral-green)" />
		<stop offset="0.8" stop-color="var(--spectral-blue)" />
		<stop offset="1" stop-color="var(--spectral-violet)" />
	</linearGradient>
</defs>

<!-- The real-bandwidth rect(s) for one allocation, shared by the dot and labelled-leaf layers.
     A band with a sub-band privilege plan draws a transparent full-band envelope with the held
     class's accessible runs filled in opaque (so it expands/contracts with the licence); once the
     class unlocks the whole band it falls through to the solid single bar. Bands without a plan
     keep the plain behaviour: a faint connector under split `segments`, else one solid span. -->
{#snippet bandShape(
	alloc: Allocation,
	bar: { x0: number; w: number },
	color: string,
	h: number,
	rx: number,
	barClass: string,
	sel: boolean
)}
	{@const priv = privSegsOf(alloc)}
	{#if priv && !priv.allEnabled}
		<rect
			x={bar.x0}
			y={bandMid - h / 2}
			width={bar.w}
			height={h}
			{rx}
			style="fill: {color}"
			class="priv-envelope"
		/>
		{#each priv.runs as r, ri (ri)}
			<rect
				x={r.x0}
				y={bandMid - h / 2}
				width={Math.max(r.w, 2)}
				height={h}
				{rx}
				style="fill: {color}"
				class={barClass}
				class:sel
			/>
		{/each}
	{:else if mutedAmateur(alloc)}
		<!-- A plain amateur band the class can't transmit on: present, but see-through. -->
		<rect
			x={bar.x0}
			y={bandMid - h / 2}
			width={bar.w}
			height={h}
			{rx}
			style="fill: {color}"
			class="priv-envelope"
		/>
	{:else}
		{#if alloc.segments}
			<rect
				x={bar.x0}
				y={bandMid - h / 2}
				width={bar.w}
				height={h}
				{rx}
				style="fill: {color}"
				class="seg-connector"
			/>
		{/if}
		{#each segmentsOf(alloc) as s, si (si)}
			<rect
				x={s.x0}
				y={bandMid - h / 2}
				width={Math.max(s.w, 2)}
				height={h}
				{rx}
				style="fill: {color}"
				class={barClass}
				class:sel
			/>
		{/each}
	{/if}
{/snippet}

<!-- Optical entry (laser / LED / emission line): drawn in the physical colour of its light. A
     real-bandwidth band shows as a translucent bracket so the spectrum gradient reads through it;
     a point shows as a small filled dot. Both carry a hairline outline so a same-coloured marker
     stays visible over the matching gradient. -->
{#snippet opticalShape(
	alloc: Allocation,
	bar: { x0: number; w: number } | null,
	x: number,
	sel: boolean
)}
	{@const col = fillOf(alloc, spectralColor(alloc.hz))}
	{#if alloc.lines && alloc.lines.length > 0}
		<!-- A discrete-line emitter (gas discharge / flame): one spectral tick per emission line. -->
		{#each alloc.lines as ln, i (i)}
			{@const lx = logPos(ln, domain) * width}
			<rect
				x={lx - (sel ? 1.25 : 1)}
				y={bandMid - (sel ? 10 : 8)}
				width={sel ? 2.5 : 2}
				height={sel ? 20 : 16}
				style="fill: {spectralColor(ln)}"
				class="emission-line"
				class:sel
			/>
		{/each}
	{:else if bar}
		<rect
			x={bar.x0}
			y={bandMid - (sel ? 8 : 6)}
			width={bar.w}
			height={sel ? 16 : 12}
			rx="2.5"
			style="fill: {col}"
			class="optical-bar"
			class:sel
		/>
	{:else}
		<circle cx={x} cy={bandMid} r={sel ? 6 : 4} style="fill: {col}" class="optical-dot" class:sel />
	{/if}
{/snippet}

<!-- Layer 1 — neighbourhood envelopes. Kept beneath every entry so a wide transparent span
     never splits a narrow band's bar (the labelled chip in layer 3 is the real button; this
     stays a mouse target but is hidden from assistive tech to avoid a double announcement). -->
{#each groupItems as p (p.item.id)}
	{@const item = p.item}
	<rect
		x={item.loX}
		y={bandMid - 7}
		width={Math.max(item.hiX - item.loX, 2)}
		height="14"
		rx="4"
		style="fill: {p.color}"
		class="span"
		aria-hidden="true"
		onclick={() => activate(item)}
	/>
{/each}

<!-- Layer 2 — data dots/bars: every visible allocation not already drawn as a label, clickable
     to inspect. Sorted widest-first so narrow bands ride on top of broad ones. -->
{#each plainDots as d (d.id)}
	{@const sel = selected === d.id}
	{@const bar = barOf(d.alloc)}
	<!-- Collapsed/dense dots don't carry glyphs (too cluttered); only a real-bandwidth bar does.
	     Labelled leaves always show theirs (handled in the leaf layer). -->
	{@const ics = bar ? iconsOf(d.alloc, d.x, bar) : []}
	<g
		class="band-marker"
		role="button"
		tabindex="0"
		aria-label="{d.alloc.name}, {fmtFreq(d.alloc.hz)}"
		onclick={() => select(d.id)}
		onkeydown={(e) => onKey2(e, d.id)}
	>
		{#if emits(d.alloc)}
			{@render opticalShape(d.alloc, bar, d.x, sel)}
		{:else if bar}
			{@render bandShape(d.alloc, bar, `var(--layer-${d.layer})`, 10, 2.5, 'band-bar', sel)}
		{:else}
			<circle
				cx={d.x}
				cy={bandMid}
				r={sel ? 5 : 3}
				style="fill: var(--layer-{d.layer})"
				class="band-dot"
				class:sel
				class:muted={mutedAmateur(d.alloc)}
			/>
		{/if}
		{#each ics as ic, ii (ii)}
			<text x={ic.x} y={bandMid} class="license-icon" class:on-bar={ic.onBar} class:sel>
				{ic.glyph}
			</text>
		{/each}
	</g>
{/each}

<!-- Layer 3a — group chips: the connector + label for each collapsed neighbourhood. -->
{#each groupItems as p (p.item.id)}
	{@const item = p.item}
	<g
		class="marker group"
		role="button"
		tabindex="0"
		aria-label={item.aria}
		onclick={() => activate(item)}
		onkeydown={(e) => onKey(e, item)}
	>
		<line x1={item.x} y1={p.lineTop} x2={item.x} y2={bandMid - 7} class="line group-line" />
		<text x={item.x} y={p.nameY} text-anchor="middle" class="name" data-mk={item.id}
			>{item.label}</text
		>
		<text x={item.x} y={p.subY} text-anchor="middle" class="count" data-mk={item.id}
			>{item.sublabel}</text
		>
	</g>
{/each}

<!-- Layer 3b — labelled leaves: expanded allocations, sorted widest-first (smaller on top). -->
{#each leafItems as p (p.item.id)}
	{@const item = p.item}
	{@const sel = selected === item.id}
	{@const bar = barOf(item.alloc)}
	{@const ics = iconsOf(item.alloc ?? null, item.x, bar)}
	<g
		class="marker"
		class:selected={sel}
		role="button"
		tabindex="0"
		aria-label={item.aria}
		onclick={() => activate(item)}
		onkeydown={(e) => onKey(e, item)}
	>
		<line
			x1={item.x}
			y1={p.lineTop}
			x2={item.x}
			y2={bandMid}
			class="line"
			style="stroke: {sel
				? lineColorOf(item.alloc ?? null, p.color)
				: 'var(--panelb)'}; stroke-width: {sel ? 2 : 1}"
		/>
		{#if emits(item.alloc ?? null)}
			{@render opticalShape(item.alloc!, bar, item.x, sel)}
		{:else if bar}
			{@render bandShape(item.alloc!, bar, p.color, 12, 3, 'leaf-bar', sel)}
		{:else}
			<!-- emphasised dot for the labelled leaf (sits over its band dot) -->
			<circle
				cx={item.x}
				cy={bandMid}
				r={sel ? 7 : 5}
				style="fill: {p.color}"
				class="dot"
				class:sel
				class:muted={mutedAmateur(item.alloc ?? null)}
			></circle>
		{/if}
		{#each ics as ic, ii (ii)}
			<text x={ic.x} y={bandMid} class="license-icon" class:on-bar={ic.onBar} class:sel>
				{ic.glyph}
			</text>
		{/each}
		<text x={item.x} y={p.nameY} text-anchor="middle" class="name" data-mk={item.id}
			>{item.label}</text
		>
		<text x={item.x} y={p.subY} text-anchor="middle" class="freq" data-mk={item.id}
			>{item.sublabel}</text
		>
	</g>
{/each}

<style>
	.marker {
		cursor: pointer;
	}
	.marker.group {
		cursor: zoom-in;
	}
	.marker:focus-visible {
		outline: none;
	}
	.band-marker {
		cursor: pointer;
	}
	.band-marker:focus-visible {
		outline: none;
	}
	.band-dot {
		stroke: var(--marker-stroke);
		stroke-width: 1.5;
		opacity: 0.85;
	}
	.band-marker:hover .band-dot,
	.band-marker:focus-visible .band-dot {
		r: 5;
		opacity: 1;
	}
	.band-dot.sel {
		opacity: 1;
	}
	.band-bar {
		stroke: var(--marker-stroke);
		stroke-width: 1;
		opacity: 0.92;
	}
	.band-marker:hover .band-bar,
	.band-marker:focus-visible .band-bar {
		opacity: 1;
		stroke: var(--ink);
	}
	.band-bar.sel {
		opacity: 1;
		stroke: var(--ink);
	}
	.leaf-bar {
		stroke: var(--marker-stroke);
		stroke-width: 1.5;
	}
	.leaf-bar.sel {
		stroke: var(--ink);
		filter: drop-shadow(0 0 6px currentColor);
	}
	/* Optical entry drawn in its own light's colour. The translucent bar lets the spectrum
	   gradient read through (so it's a bracket over the rainbow, not a box); the hairline outline
	   keeps a same-coloured marker visible against the matching gradient. */
	.optical-bar {
		opacity: 0.5;
		stroke: var(--ink);
		stroke-width: 1;
	}
	.optical-bar.sel {
		opacity: 0.85;
		stroke-width: 1.5;
		filter: drop-shadow(0 0 5px currentColor);
	}
	.optical-dot {
		stroke: var(--ink);
		stroke-width: 1.3;
	}
	.optical-dot.sel {
		stroke-width: 1.8;
		filter: drop-shadow(0 0 5px currentColor);
	}
	/* A single emission line — a thin spectral spike, one per line of a discharge/flame spectrum. */
	.emission-line {
		stroke: var(--marker-stroke);
		stroke-width: 0.5;
	}
	.emission-line.sel {
		filter: drop-shadow(0 0 4px currentColor);
	}
	.band-marker:focus-visible .band-dot {
		stroke: var(--ink);
	}
	.dot {
		stroke: var(--marker-stroke);
		stroke-width: 2;
	}
	.dot.sel {
		filter: drop-shadow(0 0 6px currentColor);
	}
	.span {
		opacity: 0.32;
		stroke: var(--marker-stroke);
		stroke-width: 1;
		cursor: zoom-in;
		transition: opacity 0.12s;
	}
	.span:hover {
		opacity: 0.5;
	}
	/* Faint bridge across the unused gap between a split allocation's occupied segments, so the
	   two bars read as one service rather than two unrelated bands. */
	.seg-connector {
		opacity: 0.16;
	}
	/* The transparent full-band envelope for a licence-gated band: the whole allocation drawn at
	   true width and outlined, with only the held class's accessible sub-bands filled opaque over
	   it. At a class with no privilege here, this outline is all that shows. */
	.priv-envelope {
		opacity: 0.36;
		stroke: var(--marker-stroke);
		stroke-width: 1;
	}
	/* Point-source mode of a muted amateur item: the same see-through treatment as its envelope,
	   so a band you can only listen on reads identically whether it's a dot or a bar. */
	.band-dot.muted,
	.dot.muted {
		opacity: 0.36;
	}
	.group-line {
		stroke: var(--panelb);
		stroke-width: 1;
	}
	/* Operator-license glyph. On a wide enough band it rides centred on the bar (white for
	   contrast); otherwise it parks just left of the marker in the amateur colour. */
	.license-icon {
		font-size: 13px;
		fill: var(--layer-amateur);
		text-anchor: middle;
		dominant-baseline: central;
		pointer-events: none;
		paint-order: stroke;
		stroke: var(--marker-stroke);
		stroke-width: 2.5px;
	}
	.license-icon.on-bar {
		fill: #fff;
		stroke: none;
	}
	.license-icon.sel {
		font-size: 15px;
	}
	.name {
		font-family: var(--font-sans);
		font-size: 13.5px;
		font-weight: 600;
		fill: var(--ink);
	}
	.marker.group .name {
		font-size: 12.5px;
	}
	.freq {
		font-family: var(--font-mono);
		font-size: 11px;
		fill: var(--sub);
	}
	.count {
		font-family: var(--font-mono);
		font-size: 10px;
		fill: var(--faint);
		text-anchor: middle;
	}
	.marker:focus-visible .name {
		text-decoration: underline;
	}
</style>
