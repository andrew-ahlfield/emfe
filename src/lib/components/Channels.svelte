<svelte:options namespace="svg" />

<script lang="ts">
	import type { FreqDomain } from '$lib/spectrum/scale';
	import { CHANNEL_PLANS, placeChannels, type PlacedChannel } from '$lib/spectrum/channels';
	import { visibleAllocations } from '$lib/spectrum/filter';
	import { allocations } from '$lib/data/loader';
	import type { LayerId } from '$lib/data/types';
	import { PLOT } from './plot-layout';

	let {
		width,
		domain,
		layers
	}: {
		width: number;
		domain: FreqDomain;
		layers: Record<LayerId, boolean>;
	} = $props();

	const bandTop = PLOT.bandY;
	/** Minimum gap (px) between two printed channel numbers — keeps labels from overlapping. */
	const LABEL_GAP = 16;

	// Channels follow their allocation's visibility: shown once the content layer is on — the same
	// rule as the markers. (Channelised services are licence-free, so the licence never gates them.)
	let visibleIds = $derived(new Set(visibleAllocations(allocations, 3, layers).map((a) => a.id)));

	// Place every in-view plan; keep it if at least one channel is revealed at this zoom. The dense
	// grid emerges as a deeper tier, but a promoted landmark (the emergency channel) can light up
	// well before that — so a plan may render with just its single red tick showing.
	let plans = $derived(
		CHANNEL_PLANS.filter((p) => visibleIds.has(p.id))
			.map((p) => ({ plan: p, ...placeChannels(p, domain, width) }))
			.filter((p) => p.channels.some((c) => c.revealed))
	);

	/**
	 * Greedy left-to-right labelling: walk the channels in screen order and print a number only
	 * when it clears the last printed one by `LABEL_GAP`. Sparse when zoomed out, every channel
	 * when zoomed in — and correct even when channel numbers run out of frequency order (e.g. the
	 * interleaved 15/1/16/2 walkie-talkie channels). Returns the channel numbers to label.
	 */
	// Identity key — a channel number can repeat within a plan (a marine duplex channel has both a
	// ship and a coast frequency), so we track which channels are labelled by their unique Hz.
	function labelled(channels: PlacedChannel[]): number[] {
		const onscreen = channels
			.filter((c) => c.x >= 12 && c.x <= width - 12)
			.sort((a, b) => a.x - b.x);
		const keep: number[] = [];
		const keptX: number[] = [];
		const place = (list: PlacedChannel[]) => {
			for (const c of list) {
				if (keptX.every((x) => Math.abs(x - c.x) >= LABEL_GAP)) {
					keep.push(c.hz);
					keptX.push(c.x);
				}
			}
		};
		// Priority: the distress/calling channel always wins, then the everyday channels, then the
		// GMRS-only repeater labels fill whatever room is left.
		place(onscreen.filter((c) => c.tag === 'distress'));
		place(onscreen.filter((c) => c.tag === undefined));
		place(onscreen.filter((c) => c.tag === 'gmrs'));
		return keep;
	}
</script>

{#each plans as p (p.plan.id)}
	{@const revealed = p.channels.filter((c) => c.revealed)}
	{@const show = labelled(revealed)}
	<!-- Service name once the full grid is up (skipped for a resonance plan — its marker already
	     names it — and for a lone emergency landmark, whose red tick already reads). -->
	{#if p.show && !p.plan.tone}
		{@const x0 = Math.max(revealed[0].x, 2)}
		<text x={x0} y={bandTop - 17} class="ch-service">{p.plan.service} channels</text>
	{/if}
	{#each revealed as ch (ch.hz)}
		{#if ch.x >= -2 && ch.x <= width + 2}
			{#if ch.barW != null}
				<!-- A resonance mode: a bar of its real bandwidth, in the plan's tone. -->
				<rect
					x={ch.x - ch.barW / 2}
					y={bandTop - 6}
					width={Math.max(ch.barW, 2)}
					height="12"
					rx="2"
					class="ch-bar"
					style="fill: {p.plan.tone}"
				/>
			{:else}
				<line
					x1={ch.x}
					y1={bandTop - 6}
					x2={ch.x}
					y2={bandTop + 6}
					class="ch-tick"
					class:gmrs={ch.tag === 'gmrs'}
					class:distress={ch.tag === 'distress'}
				/>
				{#if show.includes(ch.hz)}
					<text
						x={ch.x}
						y={bandTop - 8}
						text-anchor="middle"
						class="ch-num"
						class:gmrs={ch.tag === 'gmrs'}
						class:distress={ch.tag === 'distress'}>{ch.n}</text
					>
				{/if}
			{/if}
		{/if}
	{/each}
{/each}

<style>
	.ch-tick {
		stroke: var(--marker-stroke);
		stroke-width: 1;
		opacity: 0.65;
	}
	/* A resonance mode bar (Schumann) — a real-width block in the plan's tone, hairline-outlined. */
	.ch-bar {
		stroke: var(--marker-stroke);
		stroke-width: 0.75;
		opacity: 0.85;
	}
	/* GMRS-licence-only channels (the repeater inputs) read in blue, distinct from both the grey
	   licence-free ticks and the red emergency channel. */
	.ch-tick.gmrs {
		stroke: var(--layer-navigation);
		opacity: 0.9;
	}
	.ch-num {
		font-family: var(--font-mono);
		font-size: 9px;
		fill: var(--sub);
	}
	.ch-num.gmrs {
		fill: var(--layer-navigation);
		font-weight: 600;
	}
	/* The distress / calling channel (marine 16) — red, so it stands out. */
	.ch-tick.distress {
		stroke: var(--spectral-red);
		stroke-width: 1.5;
		opacity: 1;
	}
	.ch-num.distress {
		fill: var(--spectral-red);
		font-weight: 700;
	}
	.ch-service {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		fill: var(--faint);
	}
</style>
