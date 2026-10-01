<svelte:options namespace="svg" />

<script lang="ts">
	import { type FreqDomain } from '$lib/spectrum/scale';
	import { axisTicks, type AxisTick } from '$lib/spectrum/ticks';
	import { PLOT } from './plot-layout';

	let {
		width,
		domain,
		showExp = false,
		showLambda = false,
		showEv = false
	}: {
		width: number;
		domain: FreqDomain;
		showExp?: boolean;
		showLambda?: boolean;
		showEv?: boolean;
	} = $props();

	// Adaptive ruler: powers of ten with a width-aware label interval at wide zooms, round 1-2-5
	// frequencies once inside a decade. The scientific-notation toggle re-formats every label as
	// `m×10ⁿ Hz`. (Pure logic + density regression test live in $lib/spectrum/ticks.)
	let ticks = $derived(axisTicks(domain, width));

	// Label rows hang below the axis at an even rhythm: the frequency labels first, then each
	// enabled secondary row (λ, then eV) claims the next slot, so spacing stays identical no
	// matter which options are on. Add a future row by giving it the next slot index.
	const FREQ_Y = PLOT.axisY + 21;
	const ROW_GAP = 13;
	let lambdaY = $derived(FREQ_Y + ROW_GAP);
	let evY = $derived(FREQ_Y + ROW_GAP * (showLambda ? 2 : 1));

	const EDGE_PAD = 4;
	/**
	 * Keep an edge label fully on-screen: a label near the left/right edge anchors to its
	 * start/end (extending inward) instead of centring on its tick, so the first and last labels
	 * are never clipped at the axis ends.
	 */
	function anchorAt(x: number, estHalf: number): 'start' | 'middle' | 'end' {
		if (x - estHalf < EDGE_PAD) return 'start';
		if (x + estHalf > width - EDGE_PAD) return 'end';
		return 'middle';
	}
	/** Rough half-width (px) of a frequency tick's rendered label. */
	function freqHalf(t: AxisTick): number {
		const chars = showExp ? t.mant.length + 5 : t.plain.length; // "m×10ⁿ Hz" ≈ mant + 5 glyphs
		return (chars * 6.6) / 2;
	}
</script>

<line x1="0" y1={PLOT.axisY} x2={width} y2={PLOT.axisY} class="axis-line" />
<path d="M {width} {PLOT.axisY} l -8 -4.5 l 0 9 z" class="axis-arrow" />

{#each ticks as t (t.id)}
	<line x1={t.x} y1={PLOT.axisY} x2={t.x} y2={PLOT.axisY + (t.major ? 8 : 4)} class="tick" />
	{#if t.labeled}
		{@const fa = anchorAt(t.x, freqHalf(t))}
		{#if showExp}
			<!-- Exponent raised just a little (it shouldn't reach the tick above); the trailing
			     `dy` resets the baseline so "Hz" sits normally rather than as a superscript. -->
			<text x={t.x} y={FREQ_Y} text-anchor={fa} class="tick-label"
				>{t.mant}×10<tspan class="exp" dy="-4">{t.sexp}</tspan><tspan dy="4">&nbsp;Hz</tspan></text
			>
		{:else}
			<text x={t.x} y={FREQ_Y} text-anchor={fa} class="tick-label">{t.plain}</text>
		{/if}
	{/if}
	{#if showLambda && t.major}
		{@const la = anchorAt(t.x, (t.lambda.length * 6) / 2)}
		<text x={t.x} y={lambdaY} text-anchor={la} class="lambda-label">{t.lambda}</text>
	{/if}
	{#if showEv && t.major}
		{@const ea = anchorAt(t.x, (t.ev.length * 6) / 2)}
		<text x={t.x} y={evY} text-anchor={ea} class="ev-label">{t.ev}</text>
	{/if}
{/each}

<style>
	.axis-line {
		stroke: var(--line);
		stroke-width: 1;
	}
	.axis-arrow {
		fill: var(--faint);
	}
	.tick {
		stroke: var(--faint);
		stroke-width: 1;
	}
	.tick-label {
		font-family: var(--font-mono);
		font-size: 11px;
		fill: var(--sub);
	}
	/* Raised exponent numerals: readable, unlike Unicode superscript glyphs. */
	.exp {
		font-size: 9px;
	}
	.lambda-label {
		font-family: var(--font-mono);
		font-size: 10px;
		fill: var(--layer-science);
		opacity: 0.9;
	}
	.ev-label {
		font-family: var(--font-mono);
		font-size: 10px;
		fill: var(--region-xray);
		opacity: 0.9;
	}
</style>
