<script lang="ts">
	import { LICENSE_RANKS, type LicenseRank } from '$lib/data/types';
	import { LICENSE_ICON } from '$lib/spectrum/license';
	import { license, setLicense } from '$lib/state/license';
	import { layers, enableLayer } from '$lib/state/layers';

	// The licence only applies to amateur bands, so the selector is dimmed when that layer is
	// hidden — but a click still registers and switches the layer back on.
	let amateurOn = $derived($layers.amateur);

	function pick(rank: LicenseRank) {
		if (!amateurOn) enableLayer('amateur');
		setLicense(rank);
	}

	/** Selector copy per class (label + the bands it opens), mirroring the prototype. */
	const DEFS: Record<LicenseRank, { label: string; note: string }> = {
		unlicensed: { label: 'Unlicensed', note: 'FRS · GMRS · CB · MURS' },
		technician: { label: 'Technician', note: 'VHF/UHF + a little HF' },
		general: { label: 'General', note: 'most HF bands open' },
		extra: { label: 'Amateur Extra', note: 'full privileges' }
	};
</script>

<div class="eyebrow">Operator licence</div>

<div class="rows" class:dimmed={!amateurOn} role="radiogroup" aria-label="Operator licence">
	{#each LICENSE_RANKS as rank (rank)}
		{@const on = $license === rank}
		<button
			type="button"
			class="row"
			class:on
			role="radio"
			aria-checked={on}
			onclick={() => pick(rank)}
		>
			<span class="dot" aria-hidden="true">{LICENSE_ICON[rank]}</span>
			<span class="text">
				<span class="label">{DEFS[rank].label}</span>
				<span class="note">{DEFS[rank].note}</span>
			</span>
		</button>
	{/each}
</div>

<style>
	.eyebrow {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.14em;
		color: var(--faint);
		text-transform: uppercase;
		margin-bottom: 11px;
	}
	.rows {
		display: flex;
		flex-direction: column;
		gap: 3px;
		transition: opacity 0.15s;
	}
	/* Amateur layer is hidden — the licence has nothing to act on, so dim it (still clickable). */
	.rows.dimmed {
		opacity: 0.4;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 9px;
		width: 100%;
		padding: 6px 9px;
		border: 1px solid transparent;
		border-radius: 8px;
		background: transparent;
		cursor: pointer;
		color: inherit;
		text-align: left;
		transition:
			background 0.15s,
			border-color 0.15s;
	}
	.row.on {
		background: color-mix(in srgb, var(--layer-amateur) 16%, transparent);
		border-color: color-mix(in srgb, var(--layer-amateur) 40%, transparent);
	}
	.dot {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		flex-shrink: 0;
		background: var(--panelb);
		color: var(--sub);
		font-size: 10px;
		line-height: 1;
		transition:
			background 0.15s,
			box-shadow 0.15s,
			color 0.15s;
	}
	.row.on .dot {
		background: var(--layer-amateur);
		color: #fff;
		box-shadow: 0 0 8px var(--layer-amateur);
	}
	.text {
		min-width: 0;
	}
	.label {
		display: block;
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 600;
		line-height: 1.2;
	}
	.note {
		display: block;
		font-family: var(--font-mono);
		font-size: 10.5px;
		color: var(--sub);
		line-height: 1.3;
	}
</style>
