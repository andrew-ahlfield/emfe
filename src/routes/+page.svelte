<script lang="ts">
	import { view, visibleDomain, lod, resetView } from '$lib/state/view';
	import { selection, selectedAllocation } from '$lib/state/selection';
	import { layers } from '$lib/state/layers';
	import { license } from '$lib/state/license';
	import { axisOptions } from '$lib/state/axis';
	import { LOD_LABELS } from '$lib/spectrum/lod';
	import { zoomable } from '$lib/actions/zoom';
	import { PLOT } from '$lib/components/plot-layout';
	import Axis from '$lib/components/Axis.svelte';
	import Markers from '$lib/components/Markers.svelte';
	import RegionLabels from '$lib/components/RegionLabels.svelte';
	import SpectrumBand from '$lib/components/SpectrumBand.svelte';
	import Dock from '$lib/components/Dock.svelte';
	import Inspector from '$lib/components/Inspector.svelte';
	import LayerToggles from '$lib/components/LayerToggles.svelte';
	import LicenseFilter from '$lib/components/LicenseFilter.svelte';
	import AxisOptions from '$lib/components/AxisOptions.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import SourcesModal from '$lib/components/SourcesModal.svelte';

	let width = $state(0);
	let zoomed = $derived($view.zoom > 1);
</script>

<svelte:head>
	<title>EM Frequency Explorer</title>
	<meta
		name="description"
		content="An interactive, zoomable explorer for the electromagnetic spectrum — from below ELF through radio, light, X-ray and gamma, on one logarithmic frequency axis."
	/>
</svelte:head>

<main>
	<section class="card">
		<header>
			<div>
				<h1>The Electromagnetic Spectrum</h1>
				<p class="sub">Everything we broadcast, navigate by, and see — on one continuous scale.</p>
			</div>
			<div class="readout">
				ν, hertz (log)<br />
				Detail: {LOD_LABELS[$lod].toLowerCase()}
				{#if zoomed}
					· <button type="button" class="reset" onclick={resetView}>reset zoom</button>
				{/if}
			</div>
		</header>

		<div class="plot" style="height: {PLOT.height}px" bind:clientWidth={width}>
			{#if width > 0}
				<svg
					{width}
					height={PLOT.height}
					viewBox="0 0 {width} {PLOT.height}"
					role="img"
					aria-label="Electromagnetic spectrum on a logarithmic frequency axis, 1 Hz to 10^24 Hz"
					class="zoomable"
					use:zoomable={{ width: () => width, apply: (fn) => view.update(fn) }}
				>
					<SpectrumBand {width} domain={$visibleDomain} />
					<Markers
						{width}
						domain={$visibleDomain}
						lod={$lod}
						selected={$selection}
						layers={$layers}
					/>
					<RegionLabels {width} domain={$visibleDomain} />
					<Axis
						{width}
						domain={$visibleDomain}
						showExp={$axisOptions.showExp}
						showLambda={$axisOptions.showLambda}
					/>
				</svg>
			{/if}
		</div>

		<p class="hint" aria-hidden="true">Scroll to zoom · Shift-scroll to pan</p>
	</section>
</main>

<Dock>
	<div class="panel layers-col">
		<LayerToggles lod={$lod} />
	</div>
	<div class="panel license-col">
		<LicenseFilter />
	</div>
	<div class="panel axis-col">
		<AxisOptions />
	</div>
	<div class="panel inspector-col">
		<Inspector allocation={$selectedAllocation} license={$license} />
	</div>
</Dock>

<SourcesModal />
<ThemeToggle />

<style>
	.zoomable {
		cursor: crosshair;
		touch-action: none;
	}
	.reset {
		font: inherit;
		color: var(--ink);
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.hint {
		margin: 9px 0 0;
		text-align: center;
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--faint);
	}

	main {
		display: flex;
		justify-content: center;
		/* leave room for the fixed dock */
		padding: 16px 28px 260px;
	}

	.card {
		width: 100%;
		max-width: 1280px;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 20px;
		box-shadow: var(--softshadow);
		padding: 24px 40px 22px;
	}

	header {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 24px;
	}

	h1 {
		margin: 0;
		font-family: var(--font-serif);
		font-size: 27px;
		font-weight: 500;
		letter-spacing: -0.01em;
	}

	.sub {
		margin: 3px 0 0;
		font-size: 13.5px;
		color: var(--sub);
	}

	.readout {
		flex-shrink: 0;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--faint);
		text-align: right;
		line-height: 1.5;
	}

	.plot {
		position: relative;
		width: 100%;
	}

	svg {
		display: block;
	}

	/* dock panels */
	.panel {
		padding: 0 20px;
		border-right: 1px solid var(--line);
	}
	.panel:first-child {
		padding-left: 0;
	}
	.axis-col {
		width: 210px;
		flex-shrink: 0;
	}
	.layers-col {
		width: 238px;
		flex-shrink: 0;
	}
	.license-col {
		width: 236px;
		flex-shrink: 0;
	}
	.inspector-col {
		flex: 1;
		min-width: 0;
		border-right: none;
		padding-right: 0;
	}
	@media (max-width: 720px) {
		.panel {
			border-right: none;
			padding: 0;
		}
		.axis-col,
		.layers-col,
		.license-col {
			width: 100%;
		}
	}
</style>
