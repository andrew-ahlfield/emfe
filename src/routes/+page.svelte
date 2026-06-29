<script lang="ts">
	import { browser } from '$app/environment';
	import { view, visibleDomain, resetView, undoView } from '$lib/state/view';
	import { selection, selectedAllocation, clearSelection } from '$lib/state/selection';
	import { layers } from '$lib/state/layers';
	import { license } from '$lib/state/license';
	import { theme } from '$lib/state/theme';
	import { axisOptions } from '$lib/state/axis';
	import { substrateView, substrateSelection, selectBand, clearBand } from '$lib/state/substrate';
	import { assignmentView } from '$lib/state/assignment';
	import { inspectorPinned } from '$lib/state/inspector';
	import { encodeState, decodeState, discreteChanged, type DeepLinkSnapshot } from '$lib/state/url';
	import { allocations } from '$lib/data/loader';
	import { FULL_DOMAIN } from '$lib/spectrum/scale';
	import { fmtFreq } from '$lib/spectrum/format';
	import { zoomable } from '$lib/actions/zoom';
	import { PLOT } from '$lib/components/plot-layout';
	import Axis from '$lib/components/Axis.svelte';
	import Markers from '$lib/components/Markers.svelte';
	import Channels from '$lib/components/Channels.svelte';
	import Substrate from '$lib/components/Substrate.svelte';
	import AssignmentLane from '$lib/components/AssignmentLane.svelte';
	import RegionLabels from '$lib/components/RegionLabels.svelte';
	import SpectrumBand from '$lib/components/SpectrumBand.svelte';
	import Dock from '$lib/components/Dock.svelte';
	import InspectorDrawer from '$lib/components/InspectorDrawer.svelte';
	import SubstrateInfo from '$lib/components/SubstrateInfo.svelte';
	import LayerToggles from '$lib/components/LayerToggles.svelte';
	import LicenseFilter from '$lib/components/LicenseFilter.svelte';
	import AllocationFilter from '$lib/components/AllocationFilter.svelte';
	import AssignmentFilter from '$lib/components/AssignmentFilter.svelte';
	import AxisOptions from '$lib/components/AxisOptions.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import SourcesModal from '$lib/components/SourcesModal.svelte';

	let width = $state(0);
	let zoomed = $derived($view.zoom > 1);

	// Announce the visible window to assistive tech (polite live region).
	let announcement = $derived(
		`Showing ${fmtFreq(10 ** $visibleDomain.minExp)} to ${fmtFreq(10 ** $visibleDomain.maxExp)}.`
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
		const params = new URLSearchParams(window.location.search);
		const s = decodeState(params, FULL_DOMAIN);
		view.set({ centerExp: s.centerExp, zoom: s.zoom });
		layers.set(s.layers);
		license.set(s.license);
		// Only the explicit deep-link theme overrides the OS preference already applied in <head>.
		if (params.has('t')) theme.set(s.theme);
		const sel = s.selected && allocations.some((a) => a.id === s.selected) ? s.selected : null;
		selection.set(sel);
		prev = { ...s, selected: sel, theme: $theme };
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

	// The marker inspector and the substrate info card are both right-hand sheets — only one shows
	// at a time. Selecting a marker closes the band card; picking a band (below) closes the marker.
	$effect(() => {
		if ($selection) clearBand();
	});

	// Ctrl/Cmd+Z reverses the last view jump (clicking a neighbourhood to frame it, or a reset).
	function onKeydown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
			if (undoView()) e.preventDefault();
		}
	}

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

<svelte:window onpopstate={onPopState} onkeydown={onKeydown} />

<svelte:head>
	<title>EM Frequency Explorer</title>
	<meta
		name="description"
		content="An interactive, zoomable explorer for the electromagnetic spectrum — from below ELF through radio, light, X-ray and gamma, on one logarithmic frequency axis."
	/>
</svelte:head>

<a href="#explorer" class="skip-link">Skip to the spectrum explorer</a>

<!-- When the inspector is pinned, the whole layout slides left so the docked drawer and the
     number line stay side by side without overlap (desktop side-sheet only). Closing the drawer
     unpins it (see onclose), so the space is always reclaimed. -->
<div class="layout" class:pinned={$inspectorPinned}>
	<main>
		<section class="card">
			<ThemeToggle />
			<header>
				<div>
					<h1>The Electromagnetic Spectrum</h1>
					<p class="sub">
						Everything we broadcast, navigate by, and see — on one continuous scale. Allocations and
						licences shown for the U.S. (FCC).
					</p>
				</div>
				<div class="readout">
					ν, hertz (log)
					{#if zoomed}
						<br />
						<button type="button" class="reset" onclick={resetView}>reset zoom</button>
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
							selected={$selection}
							layers={$layers}
							license={$license}
						/>
						<RegionLabels {width} domain={$visibleDomain} />
						<Channels {width} domain={$visibleDomain} layers={$layers} />
						{#if $assignmentView.show}
							<AssignmentLane
								{width}
								domain={$visibleDomain}
								layers={$layers}
								selected={$selection}
							/>
						{/if}
						<Substrate
							{width}
							domain={$visibleDomain}
							off={$substrateView.off}
							admin={$substrateView.admin}
							onpick={(b) => {
								clearSelection();
								selectBand(b);
							}}
						/>
						<Axis
							{width}
							domain={$visibleDomain}
							showExp={$axisOptions.showExp}
							showLambda={$axisOptions.showLambda}
							showEv={$axisOptions.showEv}
						/>
					</svg>
				{/if}
			</div>

			<p class="hint hint-fine" aria-hidden="true">Scroll to zoom · Shift-scroll to pan</p>
			<p class="hint hint-touch" aria-hidden="true">
				Scroll or pinch to zoom · Drag or shift-scroll to pan
			</p>
			<p class="sr-only" role="status" aria-live="polite">{announcement}</p>
		</section>
	</main>

	<Dock>
		<div class="panel layers-col">
			<LayerToggles />
		</div>
		<div class="panel license-col">
			<LicenseFilter />
		</div>
		<div class="panel allocation-col">
			<AllocationFilter />
		</div>
		<div class="panel assignment-col">
			<AssignmentFilter />
		</div>
		<div class="panel axis-col">
			<AxisOptions />
		</div>

		{#snippet actions()}
			<SourcesModal />
		{/snippet}
	</Dock>

	<InspectorDrawer
		allocation={$selectedAllocation}
		license={$license}
		open={$selection !== null}
		onclose={() => {
			clearSelection();
			inspectorPinned.set(false);
		}}
	/>

	<SubstrateInfo band={$substrateSelection} onclose={clearBand} />
</div>

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
		font-size: 11px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--faint);
	}
	/* Phrase the gesture hint for the actual input device: touch users get pinch/drag wording. */
	.hint-touch {
		display: none;
	}
	@media (pointer: coarse) {
		.hint-fine {
			display: none;
		}
		.hint-touch {
			display: block;
		}
	}

	/* Pinned inspector: slide the number line + dock left by the docked drawer's width so they
	   never sit under it. Side-sheet (desktop/tablet) only — the portrait bottom sheet doesn't
	   overlap horizontally. */
	.layout {
		--inspector-shift: 396px;
	}
	@media (min-width: 721px) {
		.layout.pinned main {
			margin-right: var(--inspector-shift);
			transition: margin-right 0.28s cubic-bezier(0.22, 1, 0.36, 1);
		}
		.layout.pinned :global(.dock) {
			right: calc(18px + var(--inspector-shift));
			transition: right 0.28s cubic-bezier(0.22, 1, 0.36, 1);
		}
	}

	main {
		display: flex;
		justify-content: center;
		/* Horizontal padding matches the dock's 18px side margins so the number-line card and the
		   controls card share one width and expand together on wide (2K/4K) displays. The big
		   bottom value reserves room for the fixed dock. */
		padding: 16px 18px 220px;
		/* Pinch / drag anywhere over the explorer area drives the view (the dock + drawer opt out
		   via their own handlers), so suppress the browser's own touch pan/zoom here. */
		touch-action: none;
	}

	.card {
		position: relative;
		/* No max-width: the card fills the available width (minus the shared margin) just like the
		   dock, so it uses the whole screen on large monitors. */
		width: 100%;
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
		/* clear the absolutely-positioned theme toggle in the top-right corner */
		padding-right: 52px;
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
		font-size: 13px;
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
	.allocation-col {
		width: 248px;
		flex-shrink: 0;
	}
	.assignment-col {
		width: 222px;
		flex-shrink: 0;
	}
	.panel:last-child {
		border-right: none;
	}

	/* Compact (phone portrait or landscape): the dock collapses to a handle, so reserve only a
	   little; controls scroll horizontally as fixed-width cards. */
	@media (max-width: 720px), (max-height: 600px) {
		main {
			padding: 14px 10px 70px;
		}
		.card {
			padding: 14px 14px 16px;
			border-radius: 16px;
		}
		header {
			/* Compact header: title + readout on one tidy row, subtitle hidden to save height. */
			gap: 10px;
			margin-bottom: 14px;
			padding-right: 44px;
		}
		h1 {
			font-size: 19px;
		}
		.sub {
			display: none;
		}
		.readout {
			font-size: 12px;
		}
		/* Keep panels as fixed-width cards that scroll horizontally (don't stretch full width). */
		.panel {
			flex: 0 0 auto;
			scroll-snap-align: start;
			border-right: none;
			padding: 0;
		}
		.axis-col {
			width: 196px;
		}
		.layers-col {
			width: 230px;
		}
		.license-col {
			width: 226px;
		}
		.allocation-col {
			width: 244px;
		}
		.assignment-col {
			width: 216px;
		}
	}

	/* Desktop / tablet with real height: keep the card high on the page (near the top) with a
	   little breathing room above it. */
	@media (min-width: 721px) and (min-height: 700px) {
		main {
			padding-top: clamp(20px, 5vh, 64px);
		}
	}

	/* Landscape phones: shrink the card chrome so the spectrum gets the height. */
	@media (max-height: 600px) and (min-width: 721px) {
		main {
			padding: 8px 16px 64px;
		}
		.card {
			padding: 12px 20px 12px;
		}
		header {
			margin-bottom: 8px;
		}
		.sub {
			display: none;
		}
	}
</style>
