<svelte:options namespace="svg" />

<script lang="ts">
	import type { FreqDomain } from '$lib/spectrum/scale';
	import { CHANNEL_PLANS, placeChannels, type PlacedChannel } from '$lib/spectrum/channels';
	import { visibleAllocations } from '$lib/spectrum/filter';
	import { allocations } from '$lib/data/loader';
	import type { LayerId, LicenseRank } from '$lib/data/types';
	import { PLOT } from './plot-layout';

	let {
		width,
		domain,
		layers,
		license
	}: {
		width: number;
		domain: FreqDomain;
		layers: Record<LayerId, boolean>;
		license: LicenseRank;
	} = $props();

	const bandTop = PLOT.bandY;
	/** Minimum gap (px) between two printed channel numbers — keeps labels from overlapping. */
	const LABEL_GAP = 16;

	// Channels follow their allocation's visibility: only show for an allocation whose content
	// layer is on and (for amateur bands) the held licence permits — same rule as the markers.
	let visibleIds = $derived(
		new Set(visibleAllocations(allocations, 3, layers, license).map((a) => a.id))
	);

	// Reveal a plan's channels only once it spans a comfortable slice of the screen — they emerge
	// as a genuine deeper tier rather than cluttering the low-zoom view.
	let plans = $derived(
		CHANNEL_PLANS.filter((p) => visibleIds.has(p.id))
			.map((p) => ({ plan: p, ...placeChannels(p, domain, width) }))
			.filter((p) => p.show)
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
	{@const show = labelled(p.channels)}
	<!-- Service name at the start of the plan's on-screen extent. -->
	{@const x0 = Math.max(p.channels[0].x, 2)}
	<text x={x0} y={bandTop - 17} class="ch-service">{p.plan.service} channels</text>
	{#each p.channels as ch (ch.hz)}
		{#if ch.x >= -2 && ch.x <= width + 2}
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
	{/each}
{/each}

<style>
	.ch-tick {
		stroke: var(--marker-stroke);
		stroke-width: 1;
		opacity: 0.65;
	}
	/* GMRS-licence-only channels (the repeater inputs) read in the amateur/licence colour. */
	.ch-tick.gmrs {
		stroke: var(--layer-amateur);
		opacity: 0.9;
	}
	.ch-num {
		font-family: var(--font-mono);
		font-size: 9px;
		fill: var(--sub);
	}
	.ch-num.gmrs {
		fill: var(--layer-amateur);
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
