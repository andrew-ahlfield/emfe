<svelte:options namespace="svg" />

<!--
  Assignment tier — and a design note worth keeping.

  We originally gave the assignment tier its *own horizontal lane* between the band and the
  substrate (hence the file name "AssignmentLane"). In practice that dedicated row turned out not
  to be needed: it added height and a second visual language for only a handful of items, and the
  same information reads better folded onto the band itself. So there is no longer a lane — this
  component now draws the assignment tier *on the main band*:

    • Carrier/licensee holdings (Verizon, AT&T, T-Mobile, FirstNet, GPS, …) → a translucent bar
      sitting in front of, and within, the superset application band they overlap (e.g. Verizon 700
      nested inside the 700 MHz LTE band). Was: a stand-alone bar in the lane.
    • Designated single frequencies (121.5 / 243.0 guard, the ham FM calling frequencies) →
      a tick planted through the band, labelled with its exact frequency. Was: a pin in the lane.
    • The two emergency *channels* that used to live here as pins — Marine Ch 16 and CB Ch 9 —
      moved out entirely: they're now red `distress` ticks inside their channel plans (Channels.svelte),
      since they're really just one channel of an existing numbered grid.

  Net: the "assignment lane" concept is gone; the tier survives only as band-level overlays. Keep
  this component lean — if it ever shrinks to nothing, the whole tier (toggle + filter) can go too.
-->

<script lang="ts">
	import { logPos, decades, type FreqDomain } from '$lib/spectrum/scale';
	import { visibleAllocations } from '$lib/spectrum/filter';
	import { allocations } from '$lib/data/loader';
	import { fmtFreq, fmtFreqShort } from '$lib/spectrum/format';
	import { operatorColorVar } from '$lib/spectrum/operators';
	import type { LayerId } from '$lib/data/types';
	import { select } from '$lib/state/selection';
	import { PLOT } from './plot-layout';

	let {
		width,
		domain,
		layers,
		selected
	}: {
		width: number;
		domain: FreqDomain;
		layers: Record<LayerId, boolean>;
		selected: string | null;
	} = $props();

	const bandTop = PLOT.bandY;
	const bandBot = PLOT.bandY + PLOT.bandH;
	/** Min px between two labels before the later one is dropped. */
	const LABEL_GAP = 56;
	/**
	 * Designated single frequencies are a deep-zoom landmark, like the channel ticks: they only
	 * appear once the view is zoomed into a band neighbourhood, so a lone red guard tick doesn't
	 * float over a whole-spectrum view.
	 */
	const DESIG_MAX_DECADES = 2.5;

	// Assignment-tier entries passing the content-layer filter. Two flavours, now both riding the
	// main band: operator/licensee *holdings* (a band someone owns nationally) as translucent bars
	// over their superset application band, and *designated* single frequencies (distress, calling)
	// as ticks planted through the band.
	let visible = $derived(
		visibleAllocations(allocations, 3, layers).filter((a) => a.tier === 'assignment')
	);

	// Operator holdings → translucent coloured bars over the band, labelled with greedy de-overlap.
	let bars = $derived.by(() => {
		const items = visible
			.filter((a) => a.operator && a.band)
			.map((a) => {
				const x0 = Math.max(logPos(a.band![0], domain) * width, 0);
				const x1 = Math.min(logPos(a.band![1], domain) * width, width);
				return { a, x0, w: x1 - x0, cx: (x0 + x1) / 2 };
			})
			.filter((b) => b.w > 0.3 && b.x0 < width && b.x0 + b.w > 0)
			.sort((p, q) => p.cx - q.cx);
		let lastLabel = -Infinity;
		return items.map((b) => {
			const labelled = b.cx - lastLabel >= LABEL_GAP && b.w >= 16 && b.cx > 20 && b.cx < width - 20;
			if (labelled) lastLabel = b.cx;
			return { ...b, labelled };
		});
	});

	// Designated single frequencies → ticks through the band, labelled with their exact frequency.
	let ticks = $derived.by(() => {
		if (decades(domain) > DESIG_MAX_DECADES) return [];
		const items = visible
			.filter((a) => a.designation)
			.map((a) => ({ a, x: logPos(a.hz, domain) * width }))
			.filter((p) => p.x >= -2 && p.x <= width + 2)
			.sort((p, q) => p.x - q.x);
		let lastLabelX = -Infinity;
		return items.map((p) => {
			const labelled = p.x - lastLabelX >= LABEL_GAP && p.x > 24 && p.x < width - 24;
			if (labelled) lastLabelX = p.x;
			return { ...p, labelled };
		});
	});

	/** A designated frequency's colour: emergency/guard is red; a calling frequency takes its layer. */
	const desigColor = (a: (typeof visible)[number]) =>
		a.designation === 'distress' ? 'var(--spectral-red)' : `var(--layer-${a.layer})`;

	function activate(id: string) {
		select(id);
	}
	function onKey(e: KeyboardEvent, id: string) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			select(id);
		}
	}
</script>

<g class="assignments" aria-label="Assignment tier — carrier holdings and designated frequencies">
	<!-- Operator/licensee holdings, overlapping their superset application band. -->
	{#each bars as b (b.a.id)}
		{@const sel = selected === b.a.id}
		<g
			class="op"
			class:sel
			role="button"
			tabindex="0"
			aria-label="{b.a.name}, {fmtFreq(b.a.band![0])} to {fmtFreq(b.a.band![1])} — operator holding"
			onclick={() => activate(b.a.id)}
			onkeydown={(e) => onKey(e, b.a.id)}
		>
			<title>{b.a.name} · {fmtFreq(b.a.band![0])}–{fmtFreq(b.a.band![1])}</title>
			<rect
				x={b.x0}
				y={PLOT.opBarY}
				width={Math.max(b.w, 1.5)}
				height={PLOT.opBarH}
				rx="2.5"
				style="fill: {operatorColorVar(b.a.operator!)}"
				class="op-bar"
				class:sel
			/>
			{#if b.labelled}
				<text x={b.cx} y={PLOT.opLabelY} class="lbl" class:sel>{b.a.name}</text>
			{/if}
		</g>
	{/each}

	<!-- Designated single frequencies (distress / calling) planted through the band. -->
	{#each ticks as p (p.a.id)}
		{@const sel = selected === p.a.id}
		{@const col = desigColor(p.a)}
		<g
			class="pin"
			class:sel
			role="button"
			tabindex="0"
			aria-label="{p.a.name}, {fmtFreqShort(p.a.hz)} — designated {p.a.designation} frequency"
			onclick={() => activate(p.a.id)}
			onkeydown={(e) => onKey(e, p.a.id)}
		>
			<title>{p.a.name} · {fmtFreqShort(p.a.hz)}</title>
			<line x1={p.x} y1={bandTop - 7} x2={p.x} y2={bandBot} class="stem" style="stroke: {col}" />
			<path
				d="M {p.x} {bandTop - 11} l 3.4 3.6 l -3.4 3.6 l -3.4 -3.6 z"
				style="fill: {col}"
				class="diamond"
			/>
			{#if p.labelled}
				<text x={p.x} y={PLOT.desigLabelY} class="lbl desig" class:sel style="fill: {col}"
					>{fmtFreqShort(p.a.hz)}</text
				>
			{/if}
		</g>
	{/each}
</g>

<style>
	.op,
	.pin {
		cursor: pointer;
	}
	.op:focus-visible,
	.pin:focus-visible {
		outline: none;
	}
	/* Carrier bar: sits in front of its superset application bar on the same row, a touch shorter so
	   the superset frames it. Lightly translucent so the band underneath still reads as the host. */
	.op-bar {
		opacity: 0.8;
		stroke: var(--marker-stroke);
		stroke-width: 0.75;
	}
	.op:hover .op-bar,
	.op:focus-visible .op-bar,
	.op.sel .op-bar {
		opacity: 1;
		stroke: var(--ink);
		stroke-width: 1;
	}
	.op.sel .op-bar {
		filter: drop-shadow(0 0 5px currentColor);
	}
	.stem {
		stroke-width: 1.4;
		opacity: 0.9;
	}
	.diamond {
		stroke: var(--marker-stroke);
		stroke-width: 1;
	}
	.pin:hover .stem,
	.pin:focus-visible .stem,
	.pin.sel .stem {
		opacity: 1;
		stroke-width: 2;
	}
	.pin.sel .diamond {
		filter: drop-shadow(0 0 4px currentColor);
	}
	.lbl {
		font-family: var(--font-sans);
		font-size: 11px;
		font-weight: 500;
		fill: var(--sub);
		text-anchor: middle;
	}
	/* A designated frequency's label is mono (it's a number) and carries the tick's own colour. */
	.lbl.desig {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 600;
	}
	.lbl.sel {
		fill: var(--ink);
	}
	.op:hover .lbl,
	.pin:hover .lbl {
		fill: var(--ink);
	}
</style>
