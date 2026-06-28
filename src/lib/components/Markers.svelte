<svelte:options namespace="svg" />

<script lang="ts">
	import { type FreqDomain, FULL_DOMAIN, decades } from '$lib/spectrum/scale';
	import { visibleAllocations } from '$lib/spectrum/filter';
	import { layoutSpectrum, type PlacedItem } from '$lib/spectrum/grouping';
	import { fmtFreq } from '$lib/spectrum/format';
	import { LICENSE_ICON } from '$lib/spectrum/license';
	import { clampCenter, clampZoom } from '$lib/spectrum/zoom';
	import { allocations } from '$lib/data/loader';
	import type { LayerId, LicenseRank } from '$lib/data/types';
	import { select } from '$lib/state/selection';
	import { view } from '$lib/state/view';
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

	let visible = $derived(visibleAllocations(allocations, 3, layers, license));

	let layout = $derived(layoutSpectrum(visible, domain, width, fmtFreq, { lanes: LANE_Y.length }));

	/** Geometry for one placed label (leaf or group), resolved against its lane. */
	function place(item: PlacedItem) {
		const top = LANE_Y[item.lane];
		return {
			item,
			nameY: top + 11,
			subY: top + 22,
			lineTop: top + 28,
			color: `var(--layer-${item.layer})`,
			licenseIcon: item.alloc?.reqLicense ? LICENSE_ICON[item.alloc.reqLicense] : ''
		};
	}

	let placed = $derived(layout.items.map(place));

	/** Ids already drawn (with their own emphasised dot) by the label layer, so the dot layer
	 *  skips them to avoid double-drawing. */
	let labelledLeafIds = $derived(
		new Set(layout.items.filter((i) => i.kind === 'leaf').map((i) => i.id))
	);
	let plainDots = $derived(layout.dots.filter((d) => !labelledLeafIds.has(d.id)));

	/** Click a group chip → frame that neighbourhood (drill down a tier). */
	function zoomToFamily(item: PlacedItem) {
		const lo = item.members[0].hz;
		const hi = item.members[item.members.length - 1].hz;
		const loE = Math.log10(lo);
		const hiE = Math.log10(hi);
		const span = Math.max(hiE - loE, 0.2) * 1.4; // pad so the cluster isn't edge-to-edge
		const zoom = clampZoom(decades(FULL_DOMAIN) / span);
		const centerExp = clampCenter((loE + hiE) / 2, FULL_DOMAIN, zoom);
		view.set({ centerExp, zoom });
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

<!-- Data dots: every visible allocation not already drawn as a label, clickable to inspect
     (so addresses inside a collapsed neighbourhood, or whose label didn't fit, stay reachable). -->
{#each plainDots as d (d.id)}
	{@const sel = selected === d.id}
	<g
		class="band-marker"
		role="button"
		tabindex="0"
		aria-label="{d.alloc.name}, {fmtFreq(d.alloc.hz)}"
		onclick={() => select(d.id)}
		onkeydown={(e) => onKey2(e, d.id)}
	>
		{#if d.region === 'visible'}
			<rect
				x={d.x - 9}
				y={bandMid - 3.5}
				width="18"
				height="7"
				rx="2"
				fill="transparent"
				stroke="var(--panel)"
				class="vis-dot"
				class:sel
			/>
		{:else}
			<circle
				cx={d.x}
				cy={bandMid}
				r={sel ? 5 : 3}
				style="fill: var(--layer-{d.layer})"
				class="band-dot"
				class:sel
			/>
		{/if}
	</g>
{/each}

<!-- Labels: expanded leaves and collapsed group chips, lane-packed so none overlap. -->
{#each placed as p (p.item.id)}
	{@const item = p.item}
	{@const sel = item.kind === 'leaf' && selected === item.id}
	<g
		class="marker"
		class:group={item.kind === 'group'}
		class:selected={sel}
		role="button"
		tabindex="0"
		aria-label={item.aria}
		onclick={() => activate(item)}
		onkeydown={(e) => onKey(e, item)}
	>
		{#if item.kind === 'group'}
			<!-- real-bandwidth span bar for the neighbourhood -->
			<rect
				x={item.loX}
				y={bandMid - 7}
				width={Math.max(item.hiX - item.loX, 2)}
				height="14"
				rx="4"
				style="fill: {p.color}"
				class="span"
			/>
			<!-- connector from the chip label down to the span's centre -->
			<line x1={item.x} y1={p.lineTop} x2={item.x} y2={bandMid - 7} class="line group-line" />
			<text x={item.x} y={p.nameY} text-anchor="middle" class="name" data-mk={item.id}
				>{item.label}</text
			>
			<text x={item.x} y={p.subY} text-anchor="middle" class="count" data-mk={item.id}
				>{item.sublabel}</text
			>
		{:else}
			<line
				x1={item.x}
				y1={p.lineTop}
				x2={item.x}
				y2={bandMid}
				class="line"
				style="stroke: {sel ? p.color : 'var(--panelb)'}; stroke-width: {sel ? 2 : 1}"
			/>
			<!-- emphasised dot for the labelled leaf (sits over its band dot) -->
			{#if item.alloc?.region !== 'visible'}
				<circle
					cx={item.x}
					cy={bandMid}
					r={sel ? 7 : 5}
					style="fill: {p.color}"
					class="dot"
					class:sel
				></circle>
				{#if p.licenseIcon}
					<text x={item.x} y={bandMid} class="license-icon" class:sel>{p.licenseIcon}</text>
				{/if}
			{/if}
			<text x={item.x} y={p.nameY} text-anchor="middle" class="name" data-mk={item.id}
				>{item.label}</text
			>
			<text x={item.x} y={p.subY} text-anchor="middle" class="freq" data-mk={item.id}
				>{item.sublabel}</text
			>
		{/if}
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
		stroke: var(--panel);
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
	.band-marker:focus-visible .vis-dot,
	.band-marker:focus-visible .band-dot {
		stroke: var(--ink);
	}
	.dot {
		stroke: var(--panel);
		stroke-width: 2;
	}
	.dot.sel {
		filter: drop-shadow(0 0 6px currentColor);
	}
	.span {
		opacity: 0.32;
		stroke: var(--panel);
		stroke-width: 1;
		transition: opacity 0.12s;
	}
	.marker.group:hover .span,
	.marker.group:focus-visible .span {
		opacity: 0.5;
	}
	.group-line {
		stroke: var(--panelb);
		stroke-width: 1;
	}
	/* Operator-license glyph, overlaid on the (purple) amateur dot. */
	.license-icon {
		font-size: 8px;
		fill: #fff;
		text-anchor: middle;
		dominant-baseline: central;
		pointer-events: none;
	}
	.license-icon.sel {
		font-size: 10px;
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
