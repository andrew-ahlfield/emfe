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
	const bandMid = PLOT.bandY + PLOT.bandH / 2;
	/** Minimum gap (px) between two printed channel numbers — keeps labels from overlapping. */
	const LABEL_GAP = 16;

	/** The host band [lo,hi] for each plan's allocation — gates the reveal and is needed for the
	 *  single-tick guard/calling plans (whose own channel-extent is zero). */
	const bandById = new Map(allocations.filter((a) => a.band).map((a) => [a.id, a.band!]));

	// Channels follow their allocation's visibility: shown once the content layer is on — the same
	// rule as the markers. (Channelised services are licence-free, so the licence never gates them.)
	let visibleIds = $derived(new Set(visibleAllocations(allocations, 3, layers).map((a) => a.id)));

	// Place every in-view plan; keep it if at least one channel is revealed at this zoom. The dense
	// grid emerges as a deeper tier, but a promoted landmark (an emergency / guard / calling tick)
	// can light up well before that — so a plan may render with just its single tick showing.
	let plans = $derived(
		CHANNEL_PLANS.filter((p) => visibleIds.has(p.id) && bandById.has(p.id))
			.map((p) => ({ plan: p, ...placeChannels(p, bandById.get(p.id)!, domain, width) }))
			.filter((p) => p.channels.some((c) => c.revealed))
	);

	/** Whether a plan has any ordinary "grid" channels (so its "… channels" header makes sense) —
	 *  a plan that's only landmark ticks (guard/calling) is named by its band's own marker instead. */
	const hasGrid = (channels: PlacedChannel[]) =>
		channels.some((c) => c.tag !== 'distress' && c.tag !== 'calling');

	/**
	 * Greedy left-to-right labelling: walk the channels in screen order and print a number only
	 * when it clears the last printed one by `LABEL_GAP`. Identity key is the unique Hz (a marine
	 * duplex channel repeats its number across two frequencies). Returns the channel Hz to label.
	 */
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
		// Priority: the distress + calling landmarks win, then the everyday channels, then the
		// GMRS-only repeater labels fill whatever room is left.
		place(onscreen.filter((c) => c.tag === 'distress' || c.tag === 'calling'));
		place(onscreen.filter((c) => c.tag === undefined));
		place(onscreen.filter((c) => c.tag === 'gmrs'));
		return keep;
	}
</script>

{#each plans as p (p.plan.id)}
	{@const revealed = p.channels.filter((c) => c.revealed)}
	{@const show = labelled(revealed)}
	<!-- Service name once the full grid is up — skipped for a resonance plan and for landmark-only
	     plans (guard/calling), whose host band's own marker already names them. -->
	{#if p.show && !p.plan.tone && hasGrid(revealed)}
		{@const x0 = Math.max(revealed[0].x, 2)}
		<text x={x0} y={bandTop - 17} class="ch-service">{p.plan.service} channels</text>
	{/if}
	{#each revealed as ch (ch.hz)}
		{#if ch.x >= -2 && ch.x <= width + 2}
			{#if ch.barW != null}
				<!-- A resonance mode: a bar of its real bandwidth, on the band mid-line, in the plan's
				     tone (sits within the translucent envelope its marker draws). -->
				<rect
					x={ch.x - ch.barW / 2}
					y={bandMid - 7}
					width={Math.max(ch.barW, 2)}
					height="14"
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
					class:calling={ch.tag === 'calling'}
				/>
				{#if show.includes(ch.hz)}
					<text
						x={ch.x}
						y={bandTop - 8}
						text-anchor="middle"
						class="ch-num"
						class:gmrs={ch.tag === 'gmrs'}
						class:distress={ch.tag === 'distress'}
						class:calling={ch.tag === 'calling'}>{ch.n}</text
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
		opacity: 0.92;
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
	/* Distress / guard channel (Marine 16, CB 9, the aero/military guards) — red, so it stands out. */
	.ch-tick.distress {
		stroke: var(--spectral-red);
		stroke-width: 1.5;
		opacity: 1;
	}
	.ch-num.distress {
		fill: var(--spectral-red);
		font-weight: 700;
	}
	/* Calling frequency (the ham FM national calling channels) — amateur purple. */
	.ch-tick.calling {
		stroke: var(--layer-amateur);
		stroke-width: 1.5;
		opacity: 1;
	}
	.ch-num.calling {
		fill: var(--layer-amateur);
		font-weight: 600;
	}
	.ch-service {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		fill: var(--faint);
	}
</style>
