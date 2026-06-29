<svelte:options namespace="svg" />

<!--
  Designated frequencies — the assignment tier, pared down.

  The assignment tier never needed its own lane. Carrier/licensee holdings have all become ordinary
  application entries (a band someone holds is just a recognizable use, drawn in its layer colour and
  free to overlap its superset band), so the only thing left here is the handful of *designated
  single frequencies* — the guard and ham FM calling frequencies — drawn as a tick planted through
  the band and labelled with its exact frequency. (Marine Ch 16 / CB Ch 9 live in their channel
  plans as red `distress` ticks.) Visibility follows the content-layer toggles.
-->

<script lang="ts">
	import { logPos, decades, type FreqDomain } from '$lib/spectrum/scale';
	import { visibleAllocations } from '$lib/spectrum/filter';
	import { allocations } from '$lib/data/loader';
	import { fmtFreqShort } from '$lib/spectrum/format';
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

	// Designated single frequencies (guard / calling) passing the content-layer filter → ticks
	// through the band, labelled with their exact frequency.
	let ticks = $derived.by(() => {
		if (decades(domain) > DESIG_MAX_DECADES) return [];
		const items = visibleAllocations(allocations, 3, layers)
			.filter((a) => a.tier === 'assignment' && a.designation)
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
	const desigColor = (a: (typeof ticks)[number]['a']) =>
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

<g class="assignments" aria-label="Designated frequencies">
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
	.pin {
		cursor: pointer;
	}
	.pin:focus-visible {
		outline: none;
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
	/* A designated frequency's label is mono (it's a number) and carries the tick's own colour. */
	.lbl.desig {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 600;
	}
	.lbl.sel {
		fill: var(--ink);
	}
	.pin:hover .lbl {
		fill: var(--ink);
	}
</style>
