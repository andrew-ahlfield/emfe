<script lang="ts">
	import { LAYERS } from '$lib/data/types';
	import { layerCounts } from '$lib/spectrum/filter';
	import { allocations } from '$lib/data/loader';
	import { LAYER_LABELS, layers, toggleLayer, setAllLayers } from '$lib/state/layers';

	// LOD detail-tiers are disabled for now, so counts reflect every allocation in the layer
	// (max detail = 3). Restore per-zoom counts by taking a `lod` prop and passing it here.
	let counts = $derived(layerCounts(allocations, 3));

	let anyOn = $derived(LAYERS.some((l) => $layers[l]));
	let allOn = $derived(LAYERS.every((l) => $layers[l]));
</script>

<div class="head">
	<div class="eyebrow">Content layers</div>
	<button
		type="button"
		class="master"
		class:on={anyOn}
		role="switch"
		aria-checked={allOn}
		aria-label={anyOn ? 'Hide all content layers' : 'Show all content layers'}
		title={anyOn ? 'Hide all' : 'Show all'}
		onclick={() => setAllLayers(!anyOn)}
	>
		<span class="switch"><span class="knob"></span></span>
	</button>
</div>

<div class="rows">
	{#each LAYERS as id (id)}
		{@const on = $layers[id]}
		<button
			type="button"
			class="row"
			class:on
			role="switch"
			aria-checked={on}
			onclick={() => toggleLayer(id)}
		>
			<span class="dot" style="--c: var(--layer-{id})"></span>
			<span class="label">{LAYER_LABELS[id]}</span>
			<span class="count">{counts[id]}</span>
			<span class="switch" style="--c: var(--layer-{id})"><span class="knob"></span></span>
		</button>
	{/each}
</div>

<style>
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		/* Match the rows' inner padding so the eyebrow lines up with the labels and the master
		   switch lines up with the per-row switches on the right. */
		padding: 0 8px;
		margin-bottom: 11px;
	}
	.eyebrow {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.14em;
		color: var(--faint);
		text-transform: uppercase;
	}
	.master {
		/* inline-flex so the .switch (a span) is a flex item; otherwise width/height don't apply
		   to it as an inline element and the pill collapses to zero width. */
		display: inline-flex;
		border: none;
		background: transparent;
		padding: 0;
		cursor: pointer;
	}
	/* Off = the same dark track as the per-row switches; On = a toned-down "everyday" accent so it
	   reads as active rather than a bright disabled grey. The knob position carries the state. */
	.master .switch {
		background: var(--panelb);
	}
	.master.on .switch {
		background: color-mix(in srgb, var(--layer-consumer) 55%, var(--panelb));
	}
	.master.on .knob {
		left: 15px;
	}
	.rows {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 9px;
		width: 100%;
		padding: 6px 8px;
		border: none;
		border-radius: 8px;
		background: transparent;
		cursor: pointer;
		color: inherit;
		opacity: 0.5;
		transition: opacity 0.15s;
	}
	.row.on {
		background: var(--chip);
		opacity: 1;
	}
	.dot {
		width: 12px;
		height: 12px;
		border-radius: 4px;
		background: var(--c);
		flex-shrink: 0;
	}
	.row.on .dot {
		box-shadow: 0 0 7px var(--c);
	}
	.label {
		flex: 1;
		text-align: left;
		font-family: var(--font-sans);
		font-size: 12.5px;
		font-weight: 500;
	}
	.count {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--faint);
	}
	.switch {
		position: relative;
		width: 30px;
		height: 17px;
		border-radius: 9px;
		background: var(--panelb);
		flex-shrink: 0;
		transition: background 0.15s;
	}
	.row.on .switch {
		background: var(--c);
	}
	.knob {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 13px;
		height: 13px;
		border-radius: 50%;
		background: #fff;
		transition: left 0.15s;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
	}
	.row.on .knob {
		left: 15px;
	}
</style>
