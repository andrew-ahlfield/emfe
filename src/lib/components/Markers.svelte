<svelte:options namespace="svg" />

<script lang="ts">
	import { logPos, type FreqDomain } from '$lib/spectrum/scale';
	import { visibleAllocations } from '$lib/spectrum/filter';
	import { fmtFreq } from '$lib/spectrum/format';
	import type { Lod } from '$lib/spectrum/lod';
	import { allocations } from '$lib/data/loader';
	import type { LayerId } from '$lib/data/types';
	import { select } from '$lib/state/selection';
	import { PLOT } from './plot-layout';

	let {
		width,
		domain,
		lod,
		selected,
		layers
	}: {
		width: number;
		domain: FreqDomain;
		lod: Lod;
		selected: string | null;
		layers: Record<LayerId, boolean>;
	} = $props();

	/** Three staggered label rows so neighbouring labels don't collide. */
	const LEVELS = [4, 36, 68];

	/** Callout dots sit on the vertical centre line of the colored band. */
	const bandMid = PLOT.bandY + PLOT.bandH / 2;

	let markers = $derived(
		visibleAllocations(allocations, lod, layers)
			.map((a) => ({ a, pos: logPos(a.hz, domain) }))
			// cull markers outside the visible window (with a small margin for labels)
			.filter(({ pos }) => pos >= -0.05 && pos <= 1.05)
			.map(({ a, pos }, i) => {
				const labelY = LEVELS[i % LEVELS.length];
				return {
					a,
					x: pos * width,
					color: `var(--layer-${a.layer})`,
					nameY: labelY + 10,
					freqY: labelY + 21,
					lineTop: labelY + 28
				};
			})
	);

	function onKey(e: KeyboardEvent, id: string) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			select(id);
		}
	}
</script>

<defs>
	<linearGradient id="spectral-swatch" x1="0" y1="0" x2="1" y2="0">
		<stop offset="0" stop-color="var(--spectral-red)" />
		<stop offset="0.2" stop-color="var(--spectral-orange)" />
		<stop offset="0.4" stop-color="var(--spectral-yellow)" />
		<stop offset="0.6" stop-color="var(--spectral-green)" />
		<stop offset="0.8" stop-color="var(--spectral-blue)" />
		<stop offset="1" stop-color="var(--spectral-violet)" />
	</linearGradient>
</defs>

{#each markers as m (m.a.id)}
	{@const sel = selected === m.a.id}
	<g
		class="marker"
		class:selected={sel}
		role="button"
		tabindex="0"
		aria-label="{m.a.name}, {fmtFreq(m.a.hz)}"
		onclick={() => select(m.a.id)}
		onkeydown={(e) => onKey(e, m.a.id)}
	>
		<!-- connector line: from the label down to the band's centre line -->
		<line
			x1={m.x}
			y1={m.lineTop}
			x2={m.x}
			y2={bandMid}
			class="line"
			style="stroke: {sel ? m.color : 'var(--panelb)'}; stroke-width: {sel ? 2 : 1}"
		/>

		<!-- dot (or spectral swatch for visible light), centred on the band -->
		{#if m.a.region === 'visible'}
			<rect
				x={m.x - 13}
				y={bandMid - 4}
				width="26"
				height="8"
				rx="2"
				fill="url(#spectral-swatch)"
				stroke="var(--panel)"
			/>
		{:else}
			<circle cx={m.x} cy={bandMid} r={sel ? 7 : 5} style="fill: {m.color}" class="dot" class:sel />
		{/if}

		<!-- label -->
		<text x={m.x} y={m.nameY} text-anchor="middle" class="name">{m.a.name}</text>
		<text x={m.x} y={m.freqY} text-anchor="middle" class="freq">{fmtFreq(m.a.hz)}</text>
	</g>
{/each}

<style>
	.marker {
		cursor: pointer;
	}
	.marker:focus-visible {
		outline: none;
	}
	.dot {
		stroke: var(--panel);
		stroke-width: 2;
	}
	.dot.sel {
		filter: drop-shadow(0 0 6px currentColor);
	}
	.name {
		font-family: var(--font-sans);
		font-size: 11.5px;
		font-weight: 600;
		fill: var(--ink);
	}
	.freq {
		font-family: var(--font-mono);
		font-size: 9px;
		fill: var(--sub);
	}
	.marker:focus-visible .name {
		text-decoration: underline;
	}
</style>
