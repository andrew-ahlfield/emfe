<svelte:options namespace="svg" />

<script lang="ts">
	import { logPos, type FreqDomain } from '$lib/spectrum/scale';
	import { PLOT } from './plot-layout';

	let { width, domain }: { width: number; domain: FreqDomain } = $props();

	// The ionizing threshold: ~10 eV photon energy → ν = E/h ≈ 2.418×10¹⁵ Hz (λ ≈ 124 nm), inside
	// the ultraviolet. Above it, a single photon carries enough energy to knock an electron off an
	// atom — to break chemical bonds and damage DNA (why UV-C, X-rays and gamma are dangerous, and
	// radio/microwave/visible light are not).
	const IONIZING_HZ = 2.418e15;
	let x = $derived(logPos(IONIZING_HZ, domain) * width);
	let visible = $derived(x >= 40 && x <= width - 2);
</script>

{#if visible}
	<g class="ionizing" aria-label="Ionizing threshold at about 10 electron-volts (124 nanometres)">
		<line x1={x} y1={PLOT.regionLabelY + 6} x2={x} y2={PLOT.bandY + PLOT.bandH} class="ion-line" />
		<!-- Label hangs to the left (the non-ionizing side has the room); the arrow points into the
		     ionizing, higher-energy side. -->
		<text x={x - 6} y={PLOT.bandY - 16} text-anchor="end" class="ion-label">ionizing ▶</text>
		<text x={x - 6} y={PLOT.bandY - 5} text-anchor="end" class="ion-sub">10 eV · 124 nm</text>
	</g>
{/if}

<style>
	.ion-line {
		stroke: var(--region-uv);
		stroke-width: 1.25;
		stroke-dasharray: 3 3;
		opacity: 0.8;
	}
	.ion-label {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		fill: var(--region-uv);
		font-weight: 600;
	}
	.ion-sub {
		font-family: var(--font-mono);
		font-size: 9.5px;
		fill: var(--faint);
	}
</style>
