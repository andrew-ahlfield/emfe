<script lang="ts">
	import type { ServiceAllocation } from '$lib/data/types';
	import { fmtFreq } from '$lib/spectrum/format';
	import {
		serviceCategory,
		serviceColorVar,
		SERVICE_LABELS,
		SERVICE_GLOSSARY,
		type ServiceCategory
	} from '$lib/spectrum/services';

	let { band, onclose }: { band: ServiceAllocation | null; onclose: () => void } = $props();

	let open = $derived(band !== null);

	// Distinct categories present in the band (primary first), for the "what this means" glossary —
	// deduped so a FIXED + MOBILE band explains each once.
	let glossary = $derived.by<{ cat: ServiceCategory; label: string; text: string }[]>(() => {
		if (!band) return [];
		const seen: ServiceCategory[] = [];
		const out: { cat: ServiceCategory; label: string; text: string }[] = [];
		for (const s of [...band.primary, ...(band.secondary ?? [])]) {
			const cat = serviceCategory(s);
			if (seen.includes(cat)) continue;
			seen.push(cat);
			out.push({ cat, label: SERVICE_LABELS[cat], text: SERVICE_GLOSSARY[cat] });
		}
		return out;
	});

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) onclose();
	}
</script>

<svelte:window onkeydown={onKey} />

<div
	class="drawer"
	class:open
	role={open ? 'dialog' : undefined}
	aria-label={open ? 'Allocation details' : undefined}
	inert={!open}
>
	<button type="button" class="close" onclick={onclose} aria-label="Close details">×</button>
	{#if band}
		<div class="content">
			<div class="eyebrow">Allocation · 47 CFR §2.106</div>
			<h2>{fmtFreq(band.lo)} – {fmtFreq(band.hi)}</h2>

			<div class="admin" class:federal={band.federal}>
				<span class="swatch" aria-hidden="true"></span>
				{band.federal
					? 'Federal — government / military (managed by NTIA)'
					: 'Non-Federal — civilian (managed by the FCC)'}
			</div>

			{#if band.note}
				<p class="note">{band.note}</p>
			{/if}

			<div class="section">
				<div class="label">Allocated to</div>
				<ul class="svclist">
					{#each band.primary as s (s)}
						<li class="primary">
							<span class="dot" style="--c: {serviceColorVar(serviceCategory(s))}"></span>
							<span class="svc">{s}</span>
							<span class="rank">primary</span>
						</li>
					{/each}
					{#each band.secondary ?? [] as s (s)}
						<li class="secondary">
							<span class="dot" style="--c: {serviceColorVar(serviceCategory(s))}"></span>
							<span class="svc">{s}</span>
							<span class="rank">secondary</span>
						</li>
					{/each}
				</ul>
				<p class="fine">
					<strong>Primary</strong> services are protected; <strong>secondary</strong> services may not
					interfere with them and can’t claim protection in return.
				</p>
			</div>

			<div class="section">
				<div class="label">What this means</div>
				{#each glossary as g (g.cat)}
					<div class="gloss">
						<span class="dot" style="--c: {serviceColorVar(g.cat)}"></span>
						<div>
							<div class="gloss-h">{g.label}</div>
							<p>{g.text}</p>
						</div>
					</div>
				{/each}
			</div>

			{#if band.footnotes && band.footnotes.length > 0}
				<div class="section">
					<div class="label">Footnotes</div>
					<div class="chips">
						{#each band.footnotes as f (f)}<span class="fn">{f}</span>{/each}
					</div>
				</div>
			{/if}
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
		margin: 4px 0 12px;
		font-family: var(--font-serif);
		font-size: 23px;
		font-weight: 500;
	}
	.admin {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12.5px;
		color: var(--sub);
		margin-bottom: 14px;
	}
	.admin .swatch {
		width: 22px;
		height: 13px;
		border-radius: 4px;
		background: var(--panelb);
		flex-shrink: 0;
	}
	.admin.federal .swatch {
		background-image: repeating-linear-gradient(
			45deg,
			color-mix(in srgb, var(--ink) 26%, transparent) 0 1px,
			transparent 1px 5px
		);
		background-color: var(--panelb);
	}
	.note {
		margin: 0 0 16px;
		font-size: 13.5px;
		line-height: 1.5;
		color: var(--ink);
		padding: 11px 13px;
		background: var(--chip);
		border-radius: 10px;
	}
	.section {
		margin-bottom: 18px;
	}
	.label {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--faint);
		margin-bottom: 9px;
	}
	.svclist {
		list-style: none;
		margin: 0 0 9px;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 5px;
	}
	.svclist li {
		display: flex;
		align-items: center;
		gap: 9px;
		font-size: 13px;
	}
	.svclist .svc {
		flex: 1;
		font-weight: 500;
	}
	li.secondary {
		color: var(--sub);
	}
	li.secondary .svc {
		font-weight: 400;
	}
	.rank {
		font-family: var(--font-mono);
		font-size: 9.5px;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--faint);
	}
	.dot {
		width: 11px;
		height: 11px;
		border-radius: 3px;
		background: var(--c);
		flex-shrink: 0;
	}
	.fine {
		margin: 0;
		font-size: 11.5px;
		line-height: 1.5;
		color: var(--faint);
	}
	.fine strong {
		color: var(--sub);
		font-weight: 600;
	}
	.gloss {
		display: flex;
		gap: 9px;
		margin-bottom: 11px;
	}
	.gloss .dot {
		margin-top: 4px;
	}
	.gloss-h {
		font-size: 13px;
		font-weight: 600;
		margin-bottom: 2px;
	}
	.gloss p {
		margin: 0;
		font-size: 12.5px;
		line-height: 1.5;
		color: var(--sub);
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.fn {
		font-family: var(--font-mono);
		font-size: 11px;
		padding: 3px 7px;
		background: var(--chip);
		border-radius: 6px;
		color: var(--sub);
	}

	/* Portrait phones: a bottom sheet (matches the marker inspector). */
	@media (max-width: 720px) {
		.drawer {
			top: auto;
			bottom: 0;
			left: 0;
			right: 0;
			width: auto;
			height: auto;
			max-height: 80dvh;
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
