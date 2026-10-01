<script lang="ts">
	import type { Neighbourhood } from '$lib/spectrum/grouping';
	import { allocations } from '$lib/data/loader';
	import { fmtFreq } from '$lib/spectrum/format';
	import Drawer from './Drawer.svelte';

	let { group, onclose }: { group: Neighbourhood | null; onclose: () => void } = $props();

	let open = $derived(group !== null);

	// How many charted signals fall inside this neighbourhood: a feel for how busy the band is.
	let count = $derived(
		group ? allocations.filter((a) => a.hz >= group!.lo && a.hz < group!.hi).length : 0
	);
</script>

<Drawer {open} label="Spectrum band details" {onclose}>
	{#if group}
		<div class="eyebrow">Spectrum neighbourhood</div>
		<h2>{group.short}</h2>
		{#if group.name !== group.short}
			<p class="expand">{group.name}</p>
		{/if}

		<div class="meta">
			<span class="range">{fmtFreq(group.lo)} – {fmtFreq(group.hi)}</span>
			<span class="sep" aria-hidden="true">·</span>
			<span>{count} signals charted</span>
		</div>

		<p class="blurb">{group.blurb}</p>
	{/if}
</Drawer>

<style>
	.eyebrow {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--faint);
	}
	h2 {
		margin: 4px 0 0;
		font-family: var(--font-serif);
		font-size: 27px;
		font-weight: 500;
		letter-spacing: -0.01em;
	}
	.expand {
		margin: 2px 0 0;
		font-size: 14px;
		color: var(--sub);
	}
	.meta {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 12px 0 16px;
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--faint);
	}
	.meta .range {
		color: var(--sub);
	}
	.blurb {
		margin: 0;
		font-size: 14px;
		line-height: 1.6;
		color: var(--ink);
	}
</style>
