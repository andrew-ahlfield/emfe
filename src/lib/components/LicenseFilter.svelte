<script lang="ts">
	import { LICENSE_RANKS, type LicenseRank } from '$lib/data/types';
	import { license, setLicense } from '$lib/state/license';

	/** Selector copy per class (label + the bands it opens), mirroring the prototype. */
	const DEFS: Record<LicenseRank, { label: string; note: string }> = {
		unlicensed: { label: 'Unlicensed', note: 'FRS · GMRS · CB · MURS' },
		technician: { label: 'Technician', note: 'VHF/UHF + a little HF' },
		general: { label: 'General', note: 'most HF bands open' },
		extra: { label: 'Amateur Extra', note: 'full privileges' }
	};
</script>

<div class="eyebrow">Operator licence</div>

<div class="rows" role="radiogroup" aria-label="Operator licence">
	{#each LICENSE_RANKS as rank (rank)}
		{@const on = $license === rank}
		<button
			type="button"
			class="row"
			class:on
			role="radio"
			aria-checked={on}
			onclick={() => setLicense(rank)}
		>
			<span class="dot"></span>
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
		font-size: 9px;
		letter-spacing: 0.14em;
		color: var(--faint);
		text-transform: uppercase;
		margin-bottom: 11px;
	}
	.rows {
		display: flex;
		flex-direction: column;
		gap: 3px;
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
		width: 9px;
		height: 9px;
		border-radius: 50%;
		flex-shrink: 0;
		background: var(--panelb);
		transition:
			background 0.15s,
			box-shadow 0.15s;
	}
	.row.on .dot {
		background: var(--layer-amateur);
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
		font-size: 8.5px;
		color: var(--sub);
		line-height: 1.3;
	}
</style>
