<svelte:options namespace="svg" />

<script lang="ts">
	import { logPos, type FreqDomain } from '$lib/spectrum/scale';
	import { visibleAllocations } from '$lib/spectrum/filter';
	import { allocations } from '$lib/data/loader';
	import { fmtFreq } from '$lib/spectrum/format';
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

	const yTop = PLOT.assignY;
	const yBot = PLOT.assignY + PLOT.assignH;
	/** Min px between two labels before the later one is dropped (its pin still shows). */
	const LABEL_GAP = 56;

	// The designated-frequency markers: assignment-tier allocations passing the content-layer
	// filter, positioned on the axis. (Application markers live in Markers.svelte; the substrate
	// is the bottom tier — this lane is only the middle tier.)
	let pins = $derived.by(() => {
		const items = visibleAllocations(allocations, 3, layers)
			.filter((a) => a.tier === 'assignment')
			.map((a) => ({ a, x: logPos(a.hz, domain) * width }))
			.filter((p) => p.x >= -2 && p.x <= width + 2)
			.sort((p, q) => p.x - q.x);

		// Greedy left→right: a pin gets its label only if it clears the last labelled one.
		let lastLabelX = -Infinity;
		return items.map((p) => {
			const labelled = p.x - lastLabelX >= LABEL_GAP && p.x > 24 && p.x < width - 24;
			if (labelled) lastLabelX = p.x;
			return { ...p, labelled };
		});
	});
</script>

<g class="assignments" aria-label="Assignment lane — specific designated frequencies">
	{#each pins as p (p.a.id)}
		{@const sel = selected === p.a.id}
		<g
			class="pin"
			class:sel
			role="button"
			tabindex="0"
			aria-label="{p.a.name}, {fmtFreq(p.a.hz)} — designated frequency"
			onclick={() => select(p.a.id)}
			onkeydown={(e) =>
				(e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), select(p.a.id))}
		>
			<title>{p.a.name} · {fmtFreq(p.a.hz)}</title>
			<line
				x1={p.x}
				y1={yTop}
				x2={p.x}
				y2={yBot}
				class="stem"
				style="stroke: var(--layer-{p.a.layer})"
			/>
			<path
				d="M {p.x} {yTop - 3} l 3.2 3.4 l -3.2 3.4 l -3.2 -3.4 z"
				style="fill: var(--layer-{p.a.layer})"
				class="diamond"
			/>
			{#if p.labelled}
				<text x={p.x} y={PLOT.assignLabelY} class="lbl" class:sel>{p.a.name}</text>
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
		opacity: 0.85;
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
	.lbl.sel {
		fill: var(--ink);
	}
	.pin:hover .lbl {
		fill: var(--ink);
	}
</style>
