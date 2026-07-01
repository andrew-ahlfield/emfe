<svelte:options namespace="svg" />

<script lang="ts">
	import { logPos, type FreqDomain } from '$lib/spectrum/scale';
	import { substrate } from '$lib/data/substrate';
	import {
		abbreviateService,
		bandCategory,
		serviceColorVar,
		type ServiceCategory
	} from '$lib/spectrum/services';
	import type { ServiceAllocation } from '$lib/data/types';
	import { PLOT } from './plot-layout';

	let {
		width,
		domain,
		off = new Set(),
		admin = 'all',
		onpick
	}: {
		width: number;
		domain: FreqDomain;
		/** Hidden service categories (control-panel filter); empty = all shown. */
		off?: Set<ServiceCategory>;
		/** Administration filter: both, or only one side of the §2.106 table. */
		admin?: 'all' | 'federal' | 'non-federal';
		/** Click handler — surfaces a band to the inspector. */
		onpick?: (band: ServiceAllocation) => void;
	} = $props();

	const y = PLOT.substrateY;
	const h = PLOT.substrateH;
	/** Below this on-screen width a band is a plain tile — no hover target, no label (a11y). */
	const INTERACT_MIN_PX = 4;
	/** Only comfortably-wide bands carry a caption now — the ribbon is a quiet floor, so it stays
	 *  sparsely labelled (the full per-service key lives in the Allocation control panel). */
	const LABEL_MIN_PX = 46;
	/** Hairline gap carved between adjacent tiles so the ribbon reads as crafted segments, not one
	 *  hard brick wall — applied only to tiles wide enough to spare it. */
	const TILE_GAP = 0.5;
	/** ~px advance of one label glyph; one centred label row inside the (now shallow) strip. */
	const CHAR_PX = 5;
	const LABEL_GAP = 7;
	const LANE_Y = [y + h / 2];

	interface Tile {
		key: string;
		x: number;
		w: number;
		color: string;
		/** Cleaned (parenthetical-stripped) leading service name. */
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
			if (off.has(cat)) continue;
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

	interface Label {
		key: string;
		cx: number;
		text: string;
		lane: number;
	}

	/**
	 * Labels for the ribbon, packed into two rows so adjacent names never collide. Each band shows
	 * its full leading service when it fits, an abbreviation when it's snug, and nothing when even
	 * the abbreviation would spill across more than a neighbour. Greedy left→right over the single
	 * row; a label that doesn't clear the previous one is dropped (the colour + click still carry it).
	 */
	let labels = $derived.by<Label[]>(() => {
		let laneEnd = -Infinity;
		const out: Label[] = [];
		for (const t of tiles) {
			if (t.w < LABEL_MIN_PX || !t.label) continue;
			const full = t.label;
			const abbr = abbreviateService(t.label);
			// Prefer the full name if it nearly fits; otherwise the abbreviation.
			const text = full.length * CHAR_PX <= t.w * 1.15 ? full : abbr;
			const textW = text.length * CHAR_PX;
			if (textW > t.w + 34) continue; // would spill too far past its own band → skip
			const cx = t.x + t.w / 2;
			const x0 = cx - textW / 2;
			const x1 = cx + textW / 2;
			if (x0 < laneEnd + LABEL_GAP) continue; // collides with the previous label → drop
			laneEnd = x1;
			out.push({ key: t.key, cx, text, lane: 0 });
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

<!-- Diagonal hatch marking Federal (government) bands — layered over the dimming so "government
     spectrum" reads without needing a legend. Mirrored on the Federal control-toggle segment. -->
<defs>
	<pattern
		id="fed-hatch"
		width="6"
		height="6"
		patternUnits="userSpaceOnUse"
		patternTransform="rotate(45)"
	>
		<line x1="0" y1="0" x2="0" y2="6" stroke="var(--ink)" stroke-width="1" stroke-opacity="0.12" />
	</pattern>
</defs>

<!-- Allocation substrate (bottom tier): the gap-free §2.106 service-category bands. Muted on
     purpose — it's the regulatory floor the recognizable-application markers stand on. The empty
     stretches below 8.3 kHz and above 275 GHz are real: nothing is allocated there. -->
<g class="substrate" aria-label="Allocation substrate: US Table of Frequency Allocations">
	{#each tiles as t (t.key)}
		{#if t.w >= INTERACT_MIN_PX}
			{@const gap = t.w >= 3 ? TILE_GAP : 0}
			{@const rx = t.w >= 6 ? 2.5 : 1}
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
				<rect
					x={t.x + gap}
					{y}
					width={Math.max(t.w - 2 * gap, 0.6)}
					height={h}
					{rx}
					style="fill: {t.color}"
					class="fill"
				/>
				{#if t.federal}
					<rect
						x={t.x + gap}
						{y}
						width={Math.max(t.w - 2 * gap, 0.6)}
						height={h}
						{rx}
						fill="url(#fed-hatch)"
						class="hatch"
					/>
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

	<!-- Labels in two packed rows, drawn over the tiles so a name can ride past its own band edge
	     without a neighbour's name colliding with it. -->
	{#each labels as l (l.key)}
		<text x={l.cx} y={LANE_Y[l.lane]} class="svc-label">{l.text}</text>
	{/each}
</g>

<style>
	/* The ribbon is a recessed foundation: desaturated so its per-service hues never compete with the
	   vivid spectral band above. It reads as a solid floor (not washed-out) — the rounded segments do
	   the "quiet, crafted" work; transparency was dropping the contrast too far. */
	.substrate {
		filter: saturate(0.72);
	}
	.fill {
		opacity: 0.9;
	}
	/* Federal (government) bands read dimmer — restricted spectrum the public can't use. */
	.federal .fill,
	.fill.federal {
		opacity: 0.5;
	}
	/* …plus a faint diagonal hatch so the distinction is explicit, not just "a bit darker". */
	.hatch {
		pointer-events: none;
	}
	.interactive {
		cursor: pointer;
	}
	/* Hover/focus lifts the band out of the floor so the interaction still reads clearly. */
	.interactive:hover .fill,
	.interactive:focus-visible .fill {
		opacity: 0.82;
	}
	.interactive:focus-visible {
		outline: none;
	}
	/* Service caption: the app's body (sans) face, solid white knocked out with a full dark outline
	   so it reads cleanly over any tile colour — not the faint grey it was. */
	.svc-label {
		font-family: var(--font-sans);
		font-size: 8.5px;
		letter-spacing: 0.02em;
		fill: #fff;
		text-anchor: middle;
		dominant-baseline: central;
		pointer-events: none;
		paint-order: stroke;
		stroke: var(--marker-stroke);
		stroke-width: 2.6px;
		text-transform: uppercase;
	}
</style>
