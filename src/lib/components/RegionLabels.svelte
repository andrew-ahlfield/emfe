<svelte:options namespace="svg" />

<script lang="ts">
	import { logPos, type FreqDomain } from '$lib/spectrum/scale';
	import { REGIONS } from '$lib/spectrum/bands';
	import { PLOT } from './plot-layout';

	let { width, domain }: { width: number; domain: FreqDomain } = $props();

	/** ROYGBIV spectral colours, one per letter of "VISIBLE" (7 letters, 7 hues). */
	const ROYGBIV = [
		'--spectral-red',
		'--spectral-orange',
		'--spectral-yellow',
		'--spectral-green',
		'--spectral-cyan',
		'--spectral-blue',
		'--spectral-violet'
	];

	/** Approx rendered width (px) of a region label (12.5px bold uppercase + letter-spacing). */
	const labelWidth = (label: string) => label.length * 9 + 6;

	/**
	 * One consistent rule for every region: a label shows only when the region's *on-screen slice*
	 * is wide enough to host it, and it's centred within that slice (never bleeding into a
	 * neighbour). On a log axis the optical/ionising regions collapse to slivers at the right when
	 * zoomed out, so their labels simply drop and reappear as you zoom toward them. No region is
	 * special-cased, so labels can never crowd or edge each other out.
	 */
	let placed = $derived.by(() => {
		const PAD = 6;
		const candidates = REGIONS.map((r) => {
			const lo = logPos(r.lo, domain) * width;
			const hi = logPos(r.hi, domain) * width;
			const vis0 = Math.max(lo, 2);
			const vis1 = Math.min(hi, width - 2);
			const onScreenWidth = vis1 - vis0;
			const w = labelWidth(r.label);
			const half = w / 2;
			// Centre on the visible slice, clamped so the whole label stays inside that slice.
			const x = Math.min(Math.max((vis0 + vis1) / 2, vis0 + half), vis1 - half);
			// Only a candidate when the on-screen slice can actually contain the label.
			const fits = onScreenWidth >= w;
			return { r, x, half, onScreenWidth, fits };
		}).filter((c) => c.fits);
		// Widest-on-screen regions claim their spot first; any that would still collide drop out.
		const order = [...candidates].sort((a, b) => b.onScreenWidth - a.onScreenWidth);
		const kept: typeof candidates = [];
		for (const c of order) {
			const clash = kept.some((k) => Math.abs(k.x - c.x) < k.half + c.half + PAD);
			if (!clash) kept.push(c);
		}
		const keptIds = new Set(kept.map((k) => k.r.id));
		return candidates.filter((c) => keptIds.has(c.r.id));
	});
</script>

{#each placed as p (p.r.id)}
	{#if p.r.id === 'visible'}
		<!-- Hero label: each letter of VISIBLE wears its own ROYGBIV hue. -->
		<text x={p.x} y={PLOT.regionLabelY} text-anchor="middle" class="region">
			{#each [...p.r.label.toUpperCase()] as ch, i (i)}
				<tspan style="fill: var({ROYGBIV[i % ROYGBIV.length]})">{ch}</tspan>
			{/each}
		</text>
	{:else}
		<text
			x={p.x}
			y={PLOT.regionLabelY}
			text-anchor="middle"
			class="region"
			style="fill: {p.r.colorVar}">{p.r.label}</text
		>
	{/if}
{/each}

<style>
	.region {
		font-family: var(--font-sans);
		font-weight: 600;
		font-size: 12.5px;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
</style>
