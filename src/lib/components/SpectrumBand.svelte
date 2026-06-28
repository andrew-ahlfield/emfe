<svelte:options namespace="svg" />

<script lang="ts">
	import { logPos, type FreqDomain } from '$lib/spectrum/scale';
	import { ITU_BANDS, bandGradientStops } from '$lib/spectrum/bands';
	import { PLOT } from './plot-layout';

	let { width, domain }: { width: number; domain: FreqDomain } = $props();

	const gradId = 'band-gradient';
	// The rainbow is gently widened to a legible minimum when zoomed out and tapers to its true
	// width as you zoom in; the axis ruler stays honest throughout, so this is always on.
	let stops = $derived(bandGradientStops(domain, { width, exaggerateVisible: true }));
	let bands = $derived(
		ITU_BANDS.map((b) => {
			const x = logPos(b.lo, domain) * width;
			return { ...b, x, w: logPos(b.hi, domain) * width - x };
		})
	);
</script>

<defs>
	<linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
		{#each stops as s, i (i)}
			<stop offset={s.offset} stop-color={s.color} stop-opacity={s.opacity} />
		{/each}
	</linearGradient>
</defs>

<!-- soft glow underlay -->
<rect x="0" y={PLOT.bandY} {width} height={PLOT.bandH} rx="8" fill="url(#{gradId})" class="glow" />

<!-- the continuous band -->
<rect x="0" y={PLOT.bandY} {width} height={PLOT.bandH} rx="7" fill="url(#{gradId})" />

<!-- ITU band row -->
{#each bands as b (b.abbr)}
	<line x1={b.x} y1={PLOT.ituY} x2={b.x} y2={PLOT.ituY + PLOT.ituH} class="itu-tick" />
	{#if b.w > 16}
		<text x={b.x + b.w / 2} y={PLOT.ituY + PLOT.ituH - 3} text-anchor="middle" class="itu-abbr">
			{b.abbr}
		</text>
	{/if}
{/each}

<style>
	.glow {
		filter: blur(15px);
		opacity: var(--glow);
	}
	.itu-tick {
		stroke: var(--line);
		stroke-width: 1;
	}
	.itu-abbr {
		font-family: var(--font-mono);
		font-size: 10.5px;
		fill: var(--faint);
		letter-spacing: 0.05em;
	}
</style>
