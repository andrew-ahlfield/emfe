<svelte:options namespace="svg" />

<script lang="ts">
	import { logPos, niceTicks, type FreqDomain } from '$lib/spectrum/scale';
	import { fmtWavelengthOf, fmtFreqTicks } from '$lib/spectrum/format';
	import { PLOT } from './plot-layout';

	let {
		width,
		domain,
		showExp = false,
		showLambda = false
	}: { width: number; domain: FreqDomain; showExp?: boolean; showLambda?: boolean } = $props();

	/** Decade labels at every third power of ten (1 Hz, 1 kHz, 1 MHz, …). */
	const NAMES: Record<number, string> = {
		0: '1 Hz',
		3: '1 kHz',
		6: '1 MHz',
		9: '1 GHz',
		12: '1 THz',
		15: '1 PHz',
		18: '1 EHz',
		21: '1 ZHz',
		24: '1 YHz'
	};

	interface Tick {
		id: string;
		x: number;
		major: boolean;
		/** Decade ticks: text before the optional raised exponent. Empty = no label. */
		base: string;
		/** Decade ticks only: the power of ten, drawn as a superscript when sci-notation is on. */
		exp: number | null;
		/** Zoomed-in ticks: a ready-made frequency label (e.g. "27 MHz"). */
		label: string;
		lambda: string;
	}

	// Two tick regimes. Across many decades, label powers of ten (every third one named). Once you
	// zoom inside ~3 decades the decade ruler thins out, so switch to round 1-2-5 frequencies that
	// keep the scale readable — you can finally measure how wide a single band is.
	let ticks = $derived.by<Tick[]>(() => {
		const zoomedIn = domain.maxExp - domain.minExp < 3;
		if (!zoomedIn) {
			return Array.from({ length: 25 }, (_, exp) => {
				const major = exp % 3 === 0;
				const name = major ? (NAMES[exp] ?? '') : '';
				const base = showExp ? (name ? `${name} · 10` : '10') : name;
				return {
					id: `p${exp}`,
					x: logPos(10 ** exp, domain) * width,
					major,
					base,
					exp,
					label: '',
					lambda: fmtWavelengthOf(10 ** exp)
				} satisfies Tick;
			}).filter((t) => t.x >= 0 && t.x <= width);
		}
		const values = niceTicks(10 ** domain.minExp, 10 ** domain.maxExp);
		const step = values.length > 1 ? values[1] - values[0] : values[0] || 1;
		const labels = fmtFreqTicks(values, step);
		return values
			.map(
				(hz, i): Tick => ({
					id: `n${hz}`,
					x: logPos(hz, domain) * width,
					major: true,
					base: '',
					exp: null,
					label: labels[i],
					lambda: fmtWavelengthOf(hz)
				})
			)
			.filter((t) => t.x >= 0 && t.x <= width);
	});
</script>

<line x1="0" y1={PLOT.axisY} x2={width} y2={PLOT.axisY} class="axis-line" />
<path d="M {width} {PLOT.axisY} l -8 -4.5 l 0 9 z" class="axis-arrow" />

{#each ticks as t (t.id)}
	<line x1={t.x} y1={PLOT.axisY} x2={t.x} y2={PLOT.axisY + (t.major ? 8 : 4)} class="tick" />
	{#if t.base}
		<text x={t.x} y={PLOT.axisY + 20} text-anchor="middle" class="tick-label" class:minor={!t.major}
			>{t.base}{#if showExp && t.exp !== null}<tspan class="exp" dy="-5">{t.exp}</tspan>{/if}</text
		>
	{:else if t.label}
		<text x={t.x} y={PLOT.axisY + 20} text-anchor="middle" class="tick-label">{t.label}</text>
	{/if}
	{#if showLambda && t.major}
		<text x={t.x} y={PLOT.axisY + 33} text-anchor="middle" class="lambda-label">{t.lambda}</text>
	{/if}
{/each}

{#if showLambda}
	<text x={width} y={PLOT.axisY + 33} text-anchor="end" class="lambda-axis">λ →</text>
{/if}

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
	.tick-label.minor {
		font-size: 10px;
		fill: var(--faint);
	}
	/* Raised exponent numerals — readable, unlike Unicode superscript glyphs. */
	.exp {
		font-size: 9px;
	}
	.lambda-label {
		font-family: var(--font-mono);
		font-size: 10px;
		fill: var(--layer-science);
		opacity: 0.9;
	}
	.lambda-axis {
		font-family: var(--font-mono);
		font-size: 10.5px;
		fill: var(--faint);
	}
</style>
