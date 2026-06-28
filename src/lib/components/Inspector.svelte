<script lang="ts">
	import type { Allocation, LicenseRank } from '$lib/data/types';
	import { REGIONS } from '$lib/spectrum/bands';
	import { fmtFreq, fmtWavelengthOf } from '$lib/spectrum/format';
	import {
		eligibility,
		privilegeNote,
		privilegeStrip,
		type PrivilegeMode
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

	/** Privilege-strip segment colours reuse the layer palette (≈ the prototype's mode hues). */
	const MODE_VAR: Record<PrivilegeMode, string> = {
		cw: '--layer-navigation',
		data: '--layer-consumer',
		phone: '--layer-gov'
	};

	let bandText = $derived(
		allocation.band ? `${fmtFreq(allocation.band[0])} – ${fmtFreq(allocation.band[1])}` : ''
	);
	let elig = $derived(eligibility(allocation.reqLicense, license));
	let segments = $derived(privilegeStrip(allocation.id, license));
</script>

<div class="inspector">
	<div class="eyebrow">Inspector</div>

	<div class="title">
		<span class="name">{allocation.name}</span>
		<span class="freq">{fmtFreq(allocation.hz)}</span>
	</div>

	<div class="meta">
		{regionLabel(allocation.region)} · λ {fmtWavelengthOf(allocation.hz)}{bandText
			? ` · ${bandText}`
			: ''}
	</div>

	{#if elig.amateur}
		<div class="pill" class:granted={elig.granted} class:denied={!elig.granted}>{elig.text}</div>
	{/if}

	{#if segments.length > 0 && allocation.band}
		<div class="strip" aria-hidden="true">
			{#each segments as seg, i (i)}
				<span
					class="seg"
					class:off={!seg.enabled}
					style="left: {seg.from * 100}%; width: {(seg.to - seg.from) * 100}%; --c: var({MODE_VAR[
						seg.mode
					]})"
				></span>
			{/each}
		</div>
		<div class="strip-legend">
			<span>{fmtFreq(allocation.band[0])}</span>
			<span>{privilegeNote(license)}</span>
			<span>{fmtFreq(allocation.band[1])}</span>
		</div>
	{/if}

	<p class="note">{allocation.note}</p>

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
	.pill {
		display: inline-block;
		font-family: var(--font-sans);
		font-size: 13.5px;
		font-weight: 600;
		padding: 4px 10px;
		border-radius: 7px;
		margin-bottom: 9px;
	}
	.pill.granted {
		background: color-mix(in srgb, var(--layer-consumer) 16%, transparent);
		color: var(--layer-consumer);
		border: 1px solid color-mix(in srgb, var(--layer-consumer) 33%, transparent);
	}
	.pill.denied {
		background: color-mix(in srgb, #ff6b6b 14%, transparent);
		color: #ff6b6b;
		border: 1px solid color-mix(in srgb, #ff6b6b 33%, transparent);
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
		background: var(--c);
	}
	.seg.off {
		background: var(--panelb);
		opacity: 0.4;
	}
	.strip-legend {
		display: flex;
		justify-content: space-between;
		font-family: var(--font-mono);
		font-size: 10.5px;
		color: var(--faint);
		margin-bottom: 10px;
	}
	.note {
		margin: 0 0 10px;
		font-family: var(--font-sans);
		font-size: 12.5px;
		line-height: 1.5;
		color: var(--sub);
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
	.source a {
		color: var(--layer-navigation);
		text-decoration: none;
	}
	.source a:hover {
		text-decoration: underline;
	}
</style>
