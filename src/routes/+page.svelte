<script lang="ts">
	import { browser } from '$app/environment';
	import { view, visibleDomain, lod, resetView } from '$lib/state/view';
	import { selection, selectedAllocation } from '$lib/state/selection';
	import { layers } from '$lib/state/layers';
	import { license } from '$lib/state/license';
	import { theme } from '$lib/state/theme';
	import { axisOptions } from '$lib/state/axis';
	import { encodeState, decodeState, discreteChanged, type DeepLinkSnapshot } from '$lib/state/url';
	import { allocations } from '$lib/data/loader';
	import { LOD_LABELS } from '$lib/spectrum/lod';
	import { FULL_DOMAIN } from '$lib/spectrum/scale';
	import { fmtFreq } from '$lib/spectrum/format';
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

	// Announce view changes to assistive tech (debounced via the polite live region).
	let announcement = $derived(
		`${LOD_LABELS[$lod]} detail. Showing ${fmtFreq(10 ** $visibleDomain.minExp)} to ${fmtFreq(
			10 ** $visibleDomain.maxExp
		)}.`
	);

	// ── Deep linking ────────────────────────────────────────────────────────────────────
	// The URL query string is a lossless mirror of the view state (see state/url.ts).
	function snapshot(): DeepLinkSnapshot {
		return {
			centerExp: $view.centerExp,
			zoom: $view.zoom,
			layers: $layers,
			license: $license,
			theme: $theme,
			selected: $selection
		};
	}

	let restored = $state(false);
	let prev: DeepLinkSnapshot | null = null;

	// Restore from the URL once, in the browser, before we start mirroring back out.
	$effect(() => {
		if (!browser || restored) return;
		const s = decodeState(new URLSearchParams(window.location.search), FULL_DOMAIN);
		view.set({ centerExp: s.centerExp, zoom: s.zoom });
		layers.set(s.layers);
		license.set(s.license);
		theme.set(s.theme);
		const sel = s.selected && allocations.some((a) => a.id === s.selected) ? s.selected : null;
		selection.set(sel);
		prev = { ...s, selected: sel };
		restored = true;
	});

	// Mirror state → URL. Discrete changes (filters/theme/selection) push a history entry;
	// continuous zoom/pan replaces the current one so the back button isn't spammed.
	$effect(() => {
		const snap = snapshot(); // read deps eagerly so this re-runs on any change
		if (!browser || !restored) return;
		const qs = encodeState(snap);
		const url = qs ? `?${qs}` : window.location.pathname;
		const method = prev && discreteChanged(prev, snap) ? 'pushState' : 'replaceState';
		history[method](history.state, '', url);
		prev = snap;
	});

	// Back/forward: re-apply the view encoded in the URL the browser navigated to.
	function onPopState() {
		const s = decodeState(new URLSearchParams(window.location.search), FULL_DOMAIN);
		view.set({ centerExp: s.centerExp, zoom: s.zoom });
		layers.set(s.layers);
		license.set(s.license);
		theme.set(s.theme);
		selection.set(s.selected && allocations.some((a) => a.id === s.selected) ? s.selected : null);
		prev = snapshot();
	}
</script>

<svelte:window onpopstate={onPopState} />

<svelte:head>
	<title>EM Frequency Explorer</title>
	<meta
		name="description"
		content="An interactive, zoomable explorer for the electromagnetic spectrum — from below ELF through radio, light, X-ray and gamma, on one logarithmic frequency axis."
	/>
</svelte:head>

<a href="#explorer" class="skip-link">Skip to the spectrum explorer</a>

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
				<!-- Deliberately focusable: a custom-keyboard widget (arrows pan, +/- zoom) whose
				     interactive marker children stay exposed to assistive tech. -->
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<svg
					id="explorer"
					{width}
					height={PLOT.height}
					viewBox="0 0 {width} {PLOT.height}"
					role="application"
					tabindex="0"
					aria-roledescription="spectrum explorer"
					aria-label="Electromagnetic spectrum on a logarithmic frequency axis from 1 hertz to 10 to the 24 hertz. Use arrow keys to pan, plus and minus to zoom, and 0 to reset."
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
		<p class="sr-only" role="status" aria-live="polite">{announcement}</p>
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

	{#snippet actions()}
		<SourcesModal />
		<ThemeToggle />
	{/snippet}
</Dock>

<style>
	.skip-link {
		position: fixed;
		top: -60px;
		left: 18px;
		z-index: 100;
		padding: 10px 16px;
		border-radius: 0 0 10px 10px;
		background: var(--chip);
		color: var(--ink);
		font-family: var(--font-mono);
		font-size: 12px;
		text-decoration: none;
		transition: top 0.15s;
	}
	.skip-link:focus {
		top: 0;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		padding: 0;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
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
		main {
			/* Clear the fixed corner buttons up top; the dock collapses on mobile so the
			   big bottom reserve is no longer needed. */
			padding: 74px 12px 96px;
		}
		.card {
			padding: 18px 16px 18px;
			border-radius: 16px;
		}
		header {
			flex-direction: column;
			align-items: flex-start;
			gap: 6px;
			margin-bottom: 18px;
		}
		.readout {
			text-align: left;
		}
		h1 {
			font-size: 22px;
		}
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
