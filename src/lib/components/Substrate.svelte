<svelte:options namespace="svg" />

<script lang="ts">
	import { logPos, type FreqDomain } from '$lib/spectrum/scale';
	import { substrate } from '$lib/data/substrate';
	import { bandCategory, serviceColorVar, type ServiceCategory } from '$lib/spectrum/services';
	import type { ServiceAllocation } from '$lib/data/types';
	import { PLOT } from './plot-layout';

	let {
		width,
		domain,
		categories = null,
		admin = 'all',
		onpick
	}: {
		width: number;
		domain: FreqDomain;
		/** When set, only these service categories are shown (control-panel filter). */
		categories?: Set<ServiceCategory> | null;
		/** Administration filter: both, or only one side of the §2.106 table. */
		admin?: 'all' | 'federal' | 'non-federal';
		/** Click handler — surfaces a band to the inspector. */
		onpick?: (band: ServiceAllocation) => void;
	} = $props();

	const y = PLOT.substrateY;
	const h = PLOT.substrateH;
	/** A band at least this wide (px) can seat its leading service name. */
	const LABEL_MIN_PX = 46;
	/** Below this on-screen width a band is a plain tile — no hover target, no label (a11y). */
	const INTERACT_MIN_PX = 4;

	interface Tile {
		key: string;
		x: number;
		w: number;
		color: string;
		label: string;
		federal: boolean;
		band: ServiceAllocation;
	}

	/** Short, screen-friendly form of a service name: drop the parenthetical qualifier. */
	function shortService(s: string): string {
		return s.replace(/\s*\(.*$/, '').trim();
	}

	let tiles = $derived.by<Tile[]>(() => {
		const out: Tile[] = [];
		for (let i = 0; i < substrate.length; i++) {
			const b = substrate[i];
			if (admin === 'federal' && !b.federal) continue;
			if (admin === 'non-federal' && b.federal) continue;
			const cat = bandCategory(b);
			if (categories && !categories.has(cat)) continue;
			const x0 = logPos(b.lo, domain) * width;
			const x1 = logPos(b.hi, domain) * width;
			if (x1 < 0 || x0 > width) continue;
			const x = Math.max(x0, 0);
			const w = Math.min(x1, width) - x;
			if (w <= 0.15) continue;
			out.push({
				key: `${i}`,
				x,
				w,
				color: serviceColorVar(cat),
				label: shortService(b.primary[0] ?? b.secondary?.[0] ?? ''),
				federal: b.federal,
				band: b
			});
		}
		return out;
	});

	function pick(b: ServiceAllocation) {
		onpick?.(b);
	}
	function onKey(e: KeyboardEvent, b: ServiceAllocation) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			pick(b);
		}
	}
</script>

<!-- Allocation substrate (bottom tier): the gap-free §2.106 service-category bands. Muted on
     purpose — it's the regulatory floor the recognizable-application markers stand on. The empty
     stretches below 8.3 kHz and above 275 GHz are real: nothing is allocated there. -->
<g class="substrate" aria-label="Allocation substrate — US Table of Frequency Allocations">
	{#each tiles as t (t.key)}
		{#if t.w >= INTERACT_MIN_PX}
			<g
				class="tile interactive"
				class:federal={t.federal}
				role="button"
				tabindex="0"
				aria-label="{t.band.primary.join(', ')}{t.federal ? ' (Federal)' : ''}, {t.band.lo} to {t
					.band.hi} hertz"
				onclick={() => pick(t.band)}
				onkeydown={(e) => onKey(e, t.band)}
			>
				<title>{t.band.primary.join(' · ')}{t.federal ? '  [Federal]' : ''}</title>
				<rect x={t.x} {y} width={t.w} height={h} style="fill: {t.color}" class="fill" />
				{#if t.w >= LABEL_MIN_PX}
					<text x={t.x + t.w / 2} y={y + h / 2} class="svc-label">{t.label}</text>
				{/if}
			</g>
		{:else}
			<rect
				x={t.x}
				{y}
				width={Math.max(t.w, 0.6)}
				height={h}
				style="fill: {t.color}"
				class="fill"
				class:federal={t.federal}
				aria-hidden="true"
			/>
		{/if}
	{/each}
</g>

<style>
	.fill {
		opacity: 0.6;
	}
	/* Federal (government) bands read dimmer — restricted spectrum the public can't use. */
	.federal .fill,
	.fill.federal {
		opacity: 0.34;
	}
	.interactive {
		cursor: pointer;
	}
	.interactive:hover .fill,
	.interactive:focus-visible .fill {
		opacity: 0.92;
	}
	.interactive:focus-visible {
		outline: none;
	}
	.svc-label {
		font-family: var(--font-mono);
		font-size: 9.5px;
		letter-spacing: 0.03em;
		fill: #fff;
		text-anchor: middle;
		dominant-baseline: central;
		pointer-events: none;
		paint-order: stroke;
		stroke: var(--marker-stroke);
		stroke-width: 2.4px;
		text-transform: uppercase;
	}
</style>
