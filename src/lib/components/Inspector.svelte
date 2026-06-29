<script lang="ts">
	import { licenseRank, type Allocation, type LicenseRank } from '$lib/data/types';
	import { REGIONS } from '$lib/spectrum/bands';
	import { fmtFreq, fmtPhotonEv, fmtWavelengthOf } from '$lib/spectrum/format';
	import { resonanceScope } from '$lib/spectrum/waveform';
	import { axisOptions } from '$lib/state/axis';
	import {
		LICENSE_ICON,
		RANK_LABELS,
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

	/** A hover tooltip that keeps the mode info the pink fill no longer encodes. */
	function segTitle(seg: RenderedSegment): string {
		if (!allocation.band) return '';
		const [lo, hi] = allocation.band;
		const from = lo + seg.from * (hi - lo);
		const to = lo + seg.to * (hi - lo);
		return `${fmtFreq(from)} – ${fmtFreq(to)} · ${RANK_LABELS[seg.minLicense]} · ${MODE_LABEL[seg.mode]}`;
	}

	let bandText = $derived(
		allocation.band ? `${fmtFreq(allocation.band[0])} – ${fmtFreq(allocation.band[1])}` : ''
	);

	// Oscilloscope trace for a non-quantized multi-mode signal (the Schumann resonance): the summed
	// waveform, drawn so the reader sees a continuous wave rather than discrete lines.
	const SCOPE_W = 320;
	const SCOPE_H = 112;
	let scope = $derived(
		allocation.modes && allocation.modes.length > 1
			? resonanceScope(allocation.modes, SCOPE_W, SCOPE_H)
			: null
	);
	let reqClass = $derived(allocation.reqLicense);
	let segments = $derived(privilegeStrip(allocation.id, license));
	/** Distinct licence classes present in this band, low → high, for the glyph key. */
	let classKey = $derived(
		[...new Set(segments.map((s) => s.minLicense))].sort((a, b) => licenseRank(a) - licenseRank(b))
	);
</script>

<div class="inspector">
	<div class="eyebrow">Inspector</div>

	<div class="title">
		<span class="name">{allocation.name}</span>
		<span class="freq">{fmtFreq(allocation.hz)}</span>
	</div>

	<div class="meta">
		{regionLabel(allocation.region)} · λ {fmtWavelengthOf(allocation.hz)}{$axisOptions.showEv
			? ` · E ${fmtPhotonEv(allocation.hz)}`
			: ''}{bandText ? ` · ${bandText}` : ''}
	</div>

	{#if reqClass}
		<div class="class-badge">
			<span class="badge-glyph">{LICENSE_ICON[reqClass]}</span>
			<span>{REQ_LABEL[reqClass]}</span>
		</div>
	{/if}

	{#if segments.length > 0 && allocation.band}
		<div class="strip">
			{#each segments as seg, i (i)}
				<span
					class="seg"
					class:off={!seg.enabled}
					style="left: {seg.from * 100}%; width: {(seg.to - seg.from) * 100}%"
					title={segTitle(seg)}
				>
					<span class="seg-mark">{LICENSE_ICON[seg.minLicense]}</span>
				</span>
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

	{#if scope}
		<figure class="scope">
			<svg
				viewBox="0 0 {SCOPE_W} {SCOPE_H}"
				class="scope-svg"
				role="img"
				aria-label="Oscilloscope trace of the {allocation.name}: a continuous beating waveform, the sum of a fundamental and its overtones — not discrete lines."
			>
				<rect
					class="scope-screen"
					x="0.5"
					y="0.5"
					width={SCOPE_W - 1}
					height={SCOPE_H - 1}
					rx="6"
				/>
				{#each scope.vGrid as gx (gx)}
					<line x1={gx} y1="2" x2={gx} y2={SCOPE_H - 2} class="grid" />
				{/each}
				{#each scope.hGrid as gy (gy)}
					<line x1="2" y1={gy} x2={SCOPE_W - 2} y2={gy} class="grid" />
				{/each}
				<line x1="2" y1={scope.midline} x2={SCOPE_W - 2} y2={scope.midline} class="grid axis" />
				<path d={scope.trace} class="trace" />
			</svg>
			<figcaption class="scope-cap">
				A resonance, not a quantum: the cavity rings at a fundamental ({fmtFreq(
					allocation.modes![0]
				)}) and its overtones at once, so the signal is one continuous, beating wave — broad and
				drifting, unlike the sharp fixed lines of atomic emission.
			</figcaption>
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
	.eyebrow {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.14em;
		color: var(--faint);
		text-transform: uppercase;
		margin-bottom: 10px;
	}
	.title {
		display: flex;
		align-items: baseline;
		gap: 10px;
		flex-wrap: wrap;
	}
	.name {
		font-family: var(--font-sans);
		font-size: 18px;
		font-weight: 700;
	}
	.freq {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--sub);
	}
	.meta {
		font-family: var(--font-mono);
		font-size: 12.5px;
		color: var(--sub);
		margin: 3px 0 10px;
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
	/* Native-SVG oscilloscope: a dark phosphor screen with a faint graticule and a glowing green
	   trace — the literal waveform of the summed modes, so "continuous wave, not discrete lines"
	   reads at a glance. The screen stays dark in both themes (it's a device screen). */
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
	.grid.axis {
		opacity: 0.3;
	}
	.trace {
		fill: none;
		stroke: var(--layer-science);
		stroke-width: 1.6;
		stroke-linejoin: round;
		stroke-linecap: round;
		filter: drop-shadow(0 0 2.5px var(--layer-science));
	}
	.scope-cap {
		margin: 7px 0 0;
		font-family: var(--font-sans);
		font-size: 11.5px;
		line-height: 1.45;
		color: var(--faint);
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
