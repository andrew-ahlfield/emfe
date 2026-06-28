<svelte:options namespace="svg" />

<script lang="ts">
	import { logPos, clamp01, type FreqDomain } from '$lib/spectrum/scale';
	import { REGIONS } from '$lib/spectrum/bands';
	import { PLOT } from './plot-layout';

	let { width, domain }: { width: number; domain: FreqDomain } = $props();

	/** Geometric mean = the log-axis midpoint of a region. */
	const mid = (lo: number, hi: number) => Math.sqrt(lo * hi);

	/** Approx rendered width (px) of a region label (12.5px bold uppercase + letter-spacing). */
	const labelWidth = (label: string) => label.length * 9 + 6;

	/**
	 * Region labels are persistent, but on a log axis the optical/ionising regions collapse to a
	 * sliver at the right edge when zoomed out — so we declutter: widest-on-screen regions win
	 * their position first, and a label that would collide with one already placed is hidden
	 * (it reappears as you zoom toward it). Centres are clamped so nothing clips at the edges.
	 */
	let placed = $derived.by(() => {
		const PAD = 6;
		const candidates = REGIONS.map((r) => {
			const lo = logPos(r.lo, domain) * width;
			const hi = logPos(r.hi, domain) * width;
			const w = labelWidth(r.label);
			const half = w / 2;
			const cx = clamp01(logPos(mid(r.lo, r.hi), domain)) * width;
			const x = Math.min(Math.max(cx, half + 2), width - half - 2);
			return { r, x, half, onScreenWidth: hi - lo };
		});
		// Place wider-on-screen regions first; keep only those that don't collide.
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
	<text
		x={p.x}
		y={PLOT.regionLabelY}
		text-anchor="middle"
		class="region"
		style="fill: {p.r.colorVar}">{p.r.label}</text
	>
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
