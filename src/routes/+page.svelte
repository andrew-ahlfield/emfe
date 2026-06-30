<script lang="ts">
	import { browser } from '$app/environment';
	import { view, visibleDomain, resetView, undoView } from '$lib/state/view';
	import { selection, selectedAllocation, clearSelection, gasIsolated } from '$lib/state/selection';
	import { groupSelection, clearGroup } from '$lib/state/group';
	import { layers } from '$lib/state/layers';
	import { license } from '$lib/state/license';
	import { theme } from '$lib/state/theme';
	import { axisOptions } from '$lib/state/axis';
	import { substrateView, substrateSelection, selectBand, clearBand } from '$lib/state/substrate';
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
	import RegionLabels from '$lib/components/RegionLabels.svelte';
	import IonizingMarker from '$lib/components/IonizingMarker.svelte';
	import SpectrumBand from '$lib/components/SpectrumBand.svelte';
	import Dock from '$lib/components/Dock.svelte';
	import InspectorDrawer from '$lib/components/InspectorDrawer.svelte';
	import SubstrateInfo from '$lib/components/SubstrateInfo.svelte';
	import GroupInfo from '$lib/components/GroupInfo.svelte';
	import LayerToggles from '$lib/components/LayerToggles.svelte';
	import LicenseFilter from '$lib/components/LicenseFilter.svelte';
	import VisibleFilter from '$lib/components/VisibleFilter.svelte';
	import AllocationFilter from '$lib/components/AllocationFilter.svelte';
	import AxisOptions from '$lib/components/AxisOptions.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import SourcesModal from '$lib/components/SourcesModal.svelte';

	let width = $state(0);
	let zoomed = $derived($view.zoom > 1);

	// Mobile bottom-sheet ceiling: track the spectrum card's bottom edge so the info sheet can rise
	// to just under it (never overlapping the number line) and scroll internally beyond that. Exposed
	// as a CSS var the drawer reads; harmless on desktop where the drawer is a full-height side sheet.
	let cardEl = $state<HTMLElement>();
	$effect(() => {
		if (!browser || !cardEl) return;
		const update = () => {
			const bottom = Math.round(cardEl!.getBoundingClientRect().bottom);
			document.documentElement.style.setProperty('--card-bottom', `${bottom}px`);
		};
		update();
		const ro = new ResizeObserver(update);
		ro.observe(cardEl);
		window.addEventListener('resize', update);
		window.addEventListener('scroll', update, { passive: true });
		return () => {
			ro.disconnect();
			window.removeEventListener('resize', update);
			window.removeEventListener('scroll', update);
		};
	});

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

	// The marker inspector, the group explainer, and the substrate band card are all right-hand
	// sheets — only one shows at a time. Selecting a marker closes the other two; opening the group
	// card closes the marker + band (band pick clears the others inline, below).
	$effect(() => {
		if ($selection) {
			clearBand();
			clearGroup();
		}
	});
	$effect(() => {
		if ($groupSelection) {
			clearSelection();
			clearBand();
		}
	});

	// Selecting a gas/discharge re-isolates its spectrum (dims the others).
	$effect(() => {
		const a = $selection && allocations.find((x) => x.id === $selection);
		if (a && a.lines && a.lines.length > 0) gasIsolated.set(true);
	});

	// A click on empty space — not the info card, the controls dock, or an entry/button — brings
	// every spectrum back (un-isolate) while leaving the selected gas's card open.
	function onBackgroundClick(e: MouseEvent) {
		const t = e.target;
		if (t instanceof Element && t.closest('.drawer, .dock, .modal, [role="button"], button, a')) {
			return;
		}
		gasIsolated.set(false);
	}

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

	// Structured data for search engines and AI assistants. Describes the tool as a free
	// WebApplication and the underlying U.S. (FCC) spectrum allocations as a Dataset — both
	// linked to Exagrow as publisher. Serialized into <script type="application/ld+json"> in
	// <svelte:head> below (the tag is assembled there to avoid a literal closing tag here).
	const jsonLd = {
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'WebApplication',
				'@id': 'https://emfe.exagrow.com/#app',
				name: 'EM Frequency Explorer',
				url: 'https://emfe.exagrow.com/',
				applicationCategory: 'EducationalApplication',
				applicationSubCategory: 'Reference',
				operatingSystem: 'Any (modern web browser)',
				browserRequirements: 'Requires JavaScript and a modern browser.',
				description:
					'An interactive, zoomable explorer for the electromagnetic spectrum — from below ELF through radio, light, X-ray and gamma, on one logarithmic frequency axis, with U.S. (FCC) allocations and licences.',
				isAccessibleForFree: true,
				offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
				inLanguage: 'en',
				image: 'https://emfe.exagrow.com/og-image.png',
				publisher: { '@type': 'Organization', name: 'Exagrow', url: 'https://exagrow.com/' },
				about: { '@id': 'https://emfe.exagrow.com/#dataset' }
			},
			{
				'@type': 'Dataset',
				'@id': 'https://emfe.exagrow.com/#dataset',
				name: 'U.S. Electromagnetic Spectrum Allocations',
				description:
					'Frequency allocations and licence classes across the electromagnetic spectrum for the United States, derived from the FCC tables and presented on a continuous logarithmic frequency axis.',
				url: 'https://emfe.exagrow.com/',
				license: 'https://www.apache.org/licenses/LICENSE-2.0',
				isAccessibleForFree: true,
				creator: { '@type': 'Organization', name: 'Exagrow', url: 'https://exagrow.com/' },
				keywords: [
					'electromagnetic spectrum',
					'radio frequency allocation',
					'FCC spectrum',
					'frequency bands',
					'amateur radio',
					'spectrum licensing'
				]
			}
		]
	};
</script>

<svelte:window onpopstate={onPopState} onkeydown={onKeydown} onclick={onBackgroundClick} />

<svelte:head>
	<title>EM Frequency Explorer — Electromagnetic Spectrum</title>
	<meta
		name="description"
		content="An interactive, zoomable explorer for the electromagnetic spectrum — from below ELF through radio, light, X-ray and gamma, on one logarithmic frequency axis."
	/>
	<link rel="canonical" href="https://emfe.exagrow.com/" />
	<meta name="robots" content="index, follow, max-image-preview:large" />

	<!-- Open Graph / social + AI surfaces -->
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="EM Frequency Explorer" />
	<meta property="og:title" content="EM Frequency Explorer — the whole electromagnetic spectrum, one scale" />
	<meta
		property="og:description"
		content="Everything we broadcast, navigate by, and see — radio to gamma on one continuous logarithmic axis, with U.S. (FCC) allocations and licences."
	/>
	<meta property="og:url" content="https://emfe.exagrow.com/" />
	<meta property="og:image" content="https://emfe.exagrow.com/og-image.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="EM Frequency Explorer" />
	<meta
		name="twitter:description"
		content="An interactive, zoomable explorer for the electromagnetic spectrum — radio to gamma on one logarithmic axis, with U.S. (FCC) allocations."
	/>
	<meta name="twitter:image" content="https://emfe.exagrow.com/og-image.png" />

	{@html `<` + `script type="application/ld+json">` + JSON.stringify(jsonLd) + `</` + `script>`}
</svelte:head>

<a href="#explorer" class="skip-link">Skip to the spectrum explorer</a>

<!-- When the inspector is pinned, the whole layout slides left so the docked drawer and the
     number line stay side by side without overlap (desktop side-sheet only). Closing the drawer
     unpins it (see onclose), so the space is always reclaimed. -->
<div class="layout" class:pinned={$inspectorPinned}>
	<main>
		<section class="card" bind:this={cardEl}>
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
						<IonizingMarker {width} domain={$visibleDomain} />
						<Channels {width} domain={$visibleDomain} layers={$layers} />
						<Substrate
							{width}
							domain={$visibleDomain}
							off={$substrateView.off}
							admin={$substrateView.admin}
							onpick={(b) => {
								clearSelection();
								clearGroup();
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
		<div class="panel visible-col">
			<VisibleFilter />
		</div>
		<div class="panel allocation-col">
			<AllocationFilter />
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

	<GroupInfo group={$groupSelection} onclose={clearGroup} />
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
	.visible-col {
		width: 214px;
		flex-shrink: 0;
	}
	.allocation-col {
		width: 248px;
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
		.visible-col {
			width: 208px;
		}
		.allocation-col {
			width: 244px;
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
