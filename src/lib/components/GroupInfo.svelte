<script lang="ts">
	import type { Neighbourhood } from '$lib/spectrum/grouping';
	import { allocations } from '$lib/data/loader';
	import { fmtFreq } from '$lib/spectrum/format';

	let { group, onclose }: { group: Neighbourhood | null; onclose: () => void } = $props();

	let open = $derived(group !== null);

	// How many charted signals fall inside this neighbourhood — a feel for how busy the band is.
	let count = $derived(
		group ? allocations.filter((a) => a.hz >= group!.lo && a.hz < group!.hi).length : 0
	);

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) onclose();
	}
</script>

<svelte:window onkeydown={onKey} />

<div
	class="drawer"
	class:open
	role={open ? 'dialog' : undefined}
	aria-label={open ? 'Spectrum band details' : undefined}
	inert={!open}
>
	<button type="button" class="close" onclick={onclose} aria-label="Close details">×</button>
	{#if group}
		<div class="content">
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
		</div>
	{/if}
</div>

<style>
	.drawer {
		position: fixed;
		z-index: 61;
		background: var(--panel);
		border: 1px solid var(--line);
		box-shadow: -18px 0 50px rgba(0, 0, 0, 0.28);
		overflow: hidden auto;
		overscroll-behavior: contain;
		top: 0;
		right: 0;
		height: 100dvh;
		width: min(380px, 92vw);
		border-radius: 18px 0 0 18px;
		transform: translateX(102%);
		transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.drawer.open {
		transform: translateX(0);
	}
	.content {
		padding: 40px 22px 28px;
	}
	.close {
		position: absolute;
		top: 10px;
		right: 12px;
		width: 30px;
		height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		border-radius: 8px;
		background: var(--chip);
		color: var(--sub);
		font-size: 20px;
		line-height: 1;
		cursor: pointer;
		z-index: 1;
	}
	.close:hover {
		background: var(--panelb);
		color: var(--ink);
	}
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

	/* Portrait phones: a bottom sheet (matches the other info cards). */
	@media (max-width: 720px) {
		.drawer {
			top: auto;
			bottom: 0;
			left: 0;
			right: 0;
			width: auto;
			height: auto;
			/* Rise only to just under the spectrum card (see InspectorDrawer); taller content scrolls. */
			max-height: min(80dvh, calc(100dvh - var(--card-bottom, 20dvh) - 14px));
			border-radius: 18px 18px 0 0;
			box-shadow: 0 -18px 50px rgba(0, 0, 0, 0.3);
			transform: translateY(102%);
		}
		.drawer.open {
			transform: translateY(0);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.drawer {
			transition: none;
		}
	}
</style>
