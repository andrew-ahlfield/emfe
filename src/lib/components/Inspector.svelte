<script lang="ts">
	import { licenseRank, type Allocation, type LicenseRank } from '$lib/data/types';
	import { REGIONS } from '$lib/spectrum/bands';
	import { fmtFreq, fmtPhotonEv, fmtWavelengthOf } from '$lib/spectrum/format';
	import { resonanceSpectrum } from '$lib/spectrum/resonance';
	import { planFor } from '$lib/spectrum/channels';
	import { axisOptions } from '$lib/state/axis';
	import {
		LICENSE_ICON,
		RANK_LABELS,
		classRuns,
		modeRuns,
		powerLimit,
		powerMinNote,
		privilegeNote,
		privilegeStrip,
		type RenderedSegment
	} from '$lib/spectrum/license';

	let { allocation, license }: { allocation: Allocation; license: LicenseRank } = $props();

	const regionLabel = (id: Allocation['region']) => REGIONS.find((r) => r.id === id)?.label ?? id;

	/** Optional "learn more" deep links for allocations whose story rewards a click-through. */
	const LEARN_MORE: Record<string, { url: string; label: string }> = {
		frs: {
			url: 'https://www.fcc.gov/general-mobile-radio-service-gmrs',
			label: 'About the GMRS licence'
		}
	};
	let learnMore = $derived(LEARN_MORE[allocation.id]);

	/** Badge copy for the band's required class — a neutral "what licence opens this band" cue.
	 *  License-free reads better than "Unlicensed" for the licence-free services. */
	const REQ_LABEL: Record<LicenseRank, string> = {
		unlicensed: 'License-free',
		technician: 'Technician licence',
		general: 'General licence',
		extra: 'Amateur Extra licence'
	};

	/** Operating-mode labels, spelt out so the abbreviations explain themselves on hover. */
	const MODE_LABEL: Record<RenderedSegment['mode'], string> = {
		cw: 'CW (Morse code)',
		data: 'Data (digital)',
		phone: 'Phone (voice)'
	};

	/** Compact mode captions for the strip's mode row — the fuller labels live in the tooltip. */
	const MODE_SHORT: Record<RenderedSegment['mode'], string> = {
		cw: 'CW',
		data: 'data',
		phone: 'voice'
	};

	/** Fractional [from,to] → absolute-frequency tooltip for a merged run. */
	function runTitle(from: number, to: number, extra: string): string {
		if (!allocation.band) return extra;
		const [lo, hi] = allocation.band;
		return `${fmtFreq(lo + from * (hi - lo))} – ${fmtFreq(lo + to * (hi - lo))} · ${extra}`;
	}

	let bandText = $derived(
		allocation.band ? `${fmtFreq(allocation.band[0])} – ${fmtFreq(allocation.band[1])}` : ''
	);

	// Frequency spectrum for a non-quantized multi-mode signal (the Schumann resonance): broad peaks
	// belling down from the fundamental. The modes come from the same resonance plan that draws the
	// width-bars on the band (a plan with `tone` set), so there's one source of truth.
	const SPEC_W = 320;
	const SPEC_H = 96;
	let modeFreqs = $derived(
		planFor(allocation.id)?.tone
			? (planFor(allocation.id)!
					.channels.filter((c) => c.bw != null)
					.map((c) => c.hz) ?? [])
			: []
	);
	let spectrum = $derived(
		modeFreqs.length > 1 ? resonanceSpectrum(modeFreqs, SPEC_W, SPEC_H) : null
	);
	const peakLabel = (hz: number) => (hz < 10 ? hz.toFixed(1) : String(Math.round(hz)));
	let reqClass = $derived(allocation.reqLicense);
	/** The power ceiling to show (amateur §97.313 or Part 95); '' for bands without an operator
	 *  limit. `powerNote` is the "minimum necessary power" reminder, amateur-only. */
	let maxPower = $derived(powerLimit(allocation.id, license));
	let powerNote = $derived(powerMinNote(allocation.id));
	let segments = $derived(privilegeStrip(allocation.id, license));
	/** The strip collapsed to licence-class runs (one glyph each) so a mode-only split doesn't read
	 *  as a class split, plus the operating-mode runs shown as a caption beneath it. */
	let licenceRuns = $derived(classRuns(segments));
	let opModeRuns = $derived(modeRuns(segments));
	/** Distinct licence classes present in this band, low → high, for the glyph key. */
	let classKey = $derived(
		[...new Set(segments.map((s) => s.minLicense))].sort((a, b) => licenseRank(a) - licenseRank(b))
	);
</script>

<div class="inspector">
	<div class="eyebrow">Inspector</div>

	<h2 class="name">{allocation.name}</h2>

	<div class="meta">
		<span class="freq">{fmtFreq(allocation.hz)}</span>
		<span class="sep" aria-hidden="true">·</span>
		{regionLabel(allocation.region)} · λ {fmtWavelengthOf(allocation.hz)}{$axisOptions.showEv
			? ` · E ${fmtPhotonEv(allocation.hz)}`
			: ''}{bandText ? ` · ${bandText}` : ''}
	</div>

	{#if maxPower}
		<div class="power">
			<span class="pwr-max">Max power <b>{maxPower}</b></span>
			{#if powerNote}<span class="pwr-min">{powerNote}</span>{/if}
		</div>
	{/if}

	{#if reqClass}
		<div class="class-badge">
			<span class="badge-glyph">{LICENSE_ICON[reqClass]}</span>
			<span>{REQ_LABEL[reqClass]}</span>
		</div>
	{/if}

	{#if segments.length > 0 && allocation.band}
		<!-- Strip glyphs merge by licence class so a band split only by mode (17 m: General CW/data
		     then phone) shows one "G", not two; the mode row below carries the operating-mode split. -->
		<div class="strip">
			{#each licenceRuns as run (run.from)}
				<span
					class="seg"
					class:off={!run.enabled}
					style="left: {run.from * 100}%; width: {(run.to - run.from) * 100}%"
					title={runTitle(run.from, run.to, RANK_LABELS[run.key])}
				>
					<span class="seg-mark">{LICENSE_ICON[run.key]}</span>
				</span>
			{/each}
		</div>
		<div class="mode-row">
			{#each opModeRuns as m (m.from)}
				<span
					class="mode"
					class:tick={m.from > 0}
					style="left: {m.from * 100}%; width: {(m.to - m.from) * 100}%"
					title={runTitle(m.from, m.to, MODE_LABEL[m.key])}>{MODE_SHORT[m.key]}</span
				>
			{/each}
		</div>
		<div class="strip-legend">
			<span>{fmtFreq(allocation.band[0])}</span>
			<span>{privilegeNote(license)}</span>
			<span>{fmtFreq(allocation.band[1])}</span>
		</div>
		{#if classKey.length > 0}
			<div class="class-key">
				{#each classKey as rank (rank)}
					<span><b>{LICENSE_ICON[rank]}</b> {RANK_LABELS[rank]}</span>
				{/each}
			</div>
		{/if}
	{/if}

	<p class="note">{allocation.note}</p>

	{#if spectrum}
		<figure class="scope">
			<svg
				viewBox="-20 0 {SPEC_W + 20} {SPEC_H + 22}"
				class="scope-svg"
				role="img"
				aria-label="Frequency spectrum of the {allocation.name}: broad peaks at {spectrum.peaks
					.map((p) => peakLabel(p.hz))
					.join(
						', '
					)} hertz, falling in strength from the fundamental—broad bumps, not sharp lines."
			>
				<rect class="scope-screen" x="0.5" y="0.5" width={SPEC_W - 1} height={SPEC_H - 1} rx="6" />
				{#each spectrum.hGrid as gy (gy)}
					<line x1="2" y1={gy} x2={SPEC_W - 2} y2={gy} class="grid" />
				{/each}
				{#each spectrum.peaks as p (p.hz)}
					<line x1={p.x} y1="2" x2={p.x} y2={SPEC_H - 2} class="grid" />
				{/each}
				<path d={spectrum.area} class="spec-area" />
				<path d={spectrum.curve} class="trace" />
				<!-- axes -->
				<text x={-SPEC_H / 2} y="-7" transform="rotate(-90)" text-anchor="middle" class="scope-axis"
					>magnetic field (pT)</text
				>
				{#each spectrum.peaks as p (p.hz)}
					<text x={p.x} y={SPEC_H + 11} text-anchor="middle" class="scope-axis"
						>{peakLabel(p.hz)}</text
					>
				{/each}
				<text x={SPEC_W} y={SPEC_H + 20} text-anchor="end" class="scope-axis">frequency (Hz)</text>
			</svg>
		</figure>
	{/if}

	{#if learnMore}
		<!-- External explainer (absolute https), not an internal SvelteKit route. -->
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
		<a class="learn-more" href={learnMore.url} target="_blank" rel="noreferrer noopener">
			{learnMore.label} →
		</a>
	{/if}

	<div class="source">
		Source:
		{#if allocation.source.url}
			<!-- External source URL (absolute https), not an internal SvelteKit route. -->
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
			<a href={allocation.source.url} target="_blank" rel="noreferrer noopener">
				{allocation.source.title}
			</a>
		{:else}
			{allocation.source.title}
		{/if}
	</div>

	{#if allocation.extraSource}
		<div class="source">
			Also:
			{#if allocation.extraSource.url}
				<!-- External source URL (absolute https), not an internal SvelteKit route. -->
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href={allocation.extraSource.url} target="_blank" rel="noreferrer noopener">
					{allocation.extraSource.title}
				</a>
			{:else}
				{allocation.extraSource.title}
			{/if}
		</div>
	{/if}
</div>

<style>
	/* Header vocabulary shared with the neighbourhood + substrate cards: mono eyebrow, serif title,
	   mono meta line. */
	.eyebrow {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.12em;
		color: var(--faint);
		text-transform: uppercase;
	}
	.name {
		margin: 4px 0 0;
		font-family: var(--font-serif);
		font-size: 23px;
		font-weight: 500;
		letter-spacing: -0.01em;
	}
	.meta {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--faint);
		margin: 8px 0 12px;
	}
	.meta .freq {
		color: var(--sub);
	}
	.meta .sep {
		margin: 0 2px;
	}
	/* Neutral "what licence opens this band" badge — the held class is shown by which sub-bands
	   light up on the chart and in the strip, so this no longer flips green/red by privilege. */
	.class-badge {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-family: var(--font-sans);
		font-size: 13.5px;
		font-weight: 600;
		padding: 4px 11px 4px 5px;
		border-radius: 999px;
		margin-bottom: 9px;
		color: var(--layer-amateur);
		background: color-mix(in srgb, var(--layer-amateur) 13%, transparent);
		border: 1px solid color-mix(in srgb, var(--layer-amateur) 33%, transparent);
	}
	.badge-glyph {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 19px;
		height: 19px;
		border-radius: 50%;
		flex-shrink: 0;
		background: var(--layer-amateur);
		color: #fff;
		font-family: var(--font-mono);
		font-weight: 700;
		font-size: 11px;
		line-height: 1;
	}
	.power {
		display: flex;
		flex-direction: column;
		gap: 1px;
		margin-bottom: 11px;
	}
	.pwr-max {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--sub);
	}
	.pwr-max b {
		color: var(--ink);
		font-weight: 700;
	}
	.pwr-min {
		font-size: 11.5px;
		color: var(--faint);
		font-style: italic;
	}
	.strip {
		position: relative;
		height: 18px;
		border-radius: 5px;
		overflow: hidden;
		border: 1px solid var(--line);
		margin-bottom: 4px;
	}
	.seg {
		position: absolute;
		top: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		background: var(--layer-amateur);
		box-shadow: inset -1px 0 0 color-mix(in srgb, var(--bg) 55%, transparent);
	}
	.strip > .seg:last-child {
		box-shadow: none;
	}
	.seg.off {
		background: color-mix(in srgb, var(--layer-amateur) 20%, var(--panelb));
	}
	.seg-mark {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		line-height: 1;
		color: var(--marker-stroke);
	}
	.seg.off .seg-mark {
		color: var(--faint);
		font-weight: 600;
	}
	/* Operating-mode caption under the strip: one label per mode run, aligned to the class strip,
	   with a hairline tick at each internal mode boundary so the split reads as *mode*, not class. */
	.mode-row {
		position: relative;
		height: 13px;
		margin-bottom: 5px;
	}
	.mode {
		position: absolute;
		top: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		font-family: var(--font-mono);
		font-size: 10px;
		line-height: 1;
		color: var(--sub);
		white-space: nowrap;
	}
	.mode.tick {
		border-left: 1px solid var(--line);
	}
	.strip-legend {
		display: flex;
		justify-content: space-between;
		font-family: var(--font-mono);
		font-size: 10.5px;
		color: var(--faint);
		margin-bottom: 5px;
	}
	.class-key {
		display: flex;
		gap: 12px;
		font-family: var(--font-mono);
		font-size: 10.5px;
		color: var(--faint);
		margin-bottom: 10px;
	}
	.class-key b {
		color: var(--layer-amateur);
		font-weight: 700;
	}
	.note {
		margin: 0 0 10px;
		font-family: var(--font-sans);
		font-size: 12.5px;
		line-height: 1.5;
		color: var(--sub);
	}
	/* Native-SVG spectrum analyser: a dark phosphor screen, a faint graticule with a drop-line at each
	   mode, and a glowing green curve of broad peaks belling down from the fundamental — so "broad
	   bumps, not sharp lines" reads at a glance. The screen stays dark in both themes (it's a screen). */
	.scope {
		margin: 0 0 14px;
	}
	.scope-svg {
		display: block;
		width: 100%;
		height: auto;
	}
	.scope-screen {
		fill: #0a0f0c;
		stroke: var(--line);
		stroke-width: 1;
	}
	.grid {
		stroke: var(--layer-science);
		stroke-width: 0.5;
		opacity: 0.16;
	}
	.spec-area {
		fill: var(--layer-science);
		opacity: 0.12;
	}
	.trace {
		fill: none;
		stroke: var(--layer-science);
		stroke-width: 1.6;
		stroke-linejoin: round;
		stroke-linecap: round;
		filter: drop-shadow(0 0 2.5px var(--layer-science));
	}
	.scope-axis {
		font-family: var(--font-mono);
		font-size: 9px;
		fill: var(--faint);
	}
	.learn-more {
		display: inline-block;
		margin: 0 0 12px;
		font-family: var(--font-sans);
		font-size: 12.5px;
		font-weight: 600;
		color: var(--layer-amateur);
		text-decoration: none;
	}
	.learn-more:hover {
		text-decoration: underline;
	}
	.source {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--faint);
	}
	.source + .source {
		margin-top: 4px;
	}
	.source a {
		color: var(--layer-navigation);
		text-decoration: none;
	}
	.source a:hover {
		text-decoration: underline;
	}
</style>
