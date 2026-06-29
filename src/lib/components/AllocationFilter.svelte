<script lang="ts">
	import { SERVICE_CATEGORIES, SERVICE_LABELS, serviceColorVar } from '$lib/spectrum/services';
	import {
		substrateView,
		toggleSubstrate,
		setAdmin,
		toggleCategory,
		type Admin
	} from '$lib/state/substrate';

	const ADMINS: { id: Admin; label: string; title: string }[] = [
		{ id: 'all', label: 'All', title: 'Both Federal and Non-Federal allocations' },
		{ id: 'non-federal', label: 'Civilian', title: 'Non-Federal (FCC) allocations only' },
		{ id: 'federal', label: 'Federal', title: 'Federal (government) allocations only' }
	];

	let on = $derived($substrateView.show);
</script>

<div class="head">
	<div class="eyebrow"><span class="tier">Allocation</span> · §2.106 services</div>
	<button
		type="button"
		class="master"
		class:on
		role="switch"
		aria-checked={on}
		aria-label={on ? 'Hide the allocation substrate' : 'Show the allocation substrate'}
		title={on ? 'Hide substrate' : 'Show substrate'}
		onclick={toggleSubstrate}
	>
		<span class="switch"><span class="knob"></span></span>
	</button>
</div>

<div class="seg" role="group" aria-label="Administration filter" class:dim={!on}>
	{#each ADMINS as a (a.id)}
		<button
			type="button"
			class="seg-btn"
			class:active={$substrateView.admin === a.id}
			title={a.title}
			aria-pressed={$substrateView.admin === a.id}
			onclick={() => setAdmin(a.id)}
		>
			{a.label}
		</button>
	{/each}
</div>

<div class="chips" class:dim={!on}>
	{#each SERVICE_CATEGORIES as c (c)}
		{@const hidden = $substrateView.off.has(c)}
		<button
			type="button"
			class="chip"
			class:off={hidden}
			role="switch"
			aria-checked={!hidden}
			title={SERVICE_LABELS[c]}
			onclick={() => toggleCategory(c)}
		>
			<span class="dot" style="--c: {serviceColorVar(c)}"></span>
			<span class="lbl">{SERVICE_LABELS[c]}</span>
		</button>
	{/each}
</div>

<style>
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 4px;
		margin-bottom: 11px;
	}
	.eyebrow {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.1em;
		color: var(--faint);
		text-transform: uppercase;
	}
	.tier {
		color: var(--sub);
		font-weight: 600;
	}
	.master {
		display: inline-flex;
		border: none;
		background: transparent;
		padding: 0;
		cursor: pointer;
	}
	.master .switch {
		background: var(--panelb);
	}
	.master.on .switch {
		background: color-mix(in srgb, var(--svc-fixed) 70%, var(--panelb));
	}
	.master.on .knob {
		left: 15px;
	}
	.switch {
		position: relative;
		width: 30px;
		height: 17px;
		border-radius: 9px;
		background: var(--panelb);
		flex-shrink: 0;
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

	.seg {
		display: flex;
		gap: 3px;
		padding: 3px;
		margin: 0 0 11px;
		background: var(--chip);
		border-radius: 9px;
		transition: opacity 0.15s;
	}
	.seg-btn {
		flex: 1;
		padding: 4px 6px;
		border: none;
		border-radius: 6px;
		background: transparent;
		color: var(--sub);
		font-family: var(--font-sans);
		font-size: 11.5px;
		font-weight: 500;
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s;
	}
	.seg-btn.active {
		background: var(--panelb);
		color: var(--ink);
	}

	.chips {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2px 4px;
		transition: opacity 0.15s;
	}
	.dim {
		opacity: 0.4;
	}
	.chip {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 4px 6px;
		border: none;
		border-radius: 7px;
		background: transparent;
		color: inherit;
		cursor: pointer;
		opacity: 1;
		transition: opacity 0.12s;
	}
	.chip.off {
		opacity: 0.38;
	}
	.dot {
		width: 10px;
		height: 10px;
		border-radius: 3px;
		background: var(--c);
		flex-shrink: 0;
	}
	.chip.off .dot {
		background: var(--panelb);
		box-shadow: inset 0 0 0 1.5px var(--c);
	}
	.lbl {
		font-family: var(--font-sans);
		font-size: 11.5px;
		font-weight: 500;
		text-align: left;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
