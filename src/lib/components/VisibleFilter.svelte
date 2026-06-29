<script lang="ts">
	import { OPTICAL_GROUPS } from '$lib/data/types';
	import { allocations } from '$lib/data/loader';
	import { visibleGroups, GROUP_LABELS, toggleGroup, setAllGroups } from '$lib/state/visible';

	// Entry counts per optical group (static — the dataset doesn't change at runtime).
	const counts = Object.fromEntries(
		OPTICAL_GROUPS.map((g) => [g, allocations.filter((a) => a.optical === g).length])
	) as Record<(typeof OPTICAL_GROUPS)[number], number>;

	// A representative swatch colour per group, just for the control (markers sample real colour).
	const SWATCH: Record<(typeof OPTICAL_GROUPS)[number], string> = {
		laser: 'var(--spectral-red)',
		led: 'var(--spectral-green)',
		gas: 'var(--spectral-cyan)',
		fireworks: 'var(--spectral-violet)'
	};

	let anyOn = $derived(OPTICAL_GROUPS.some((g) => $visibleGroups[g]));
</script>

<div class="head">
	<div class="eyebrow"><span class="tier">Visible light</span> · sources</div>
	<button
		type="button"
		class="master"
		class:on={anyOn}
		role="switch"
		aria-checked={anyOn}
		aria-label={anyOn ? 'Hide all light sources' : 'Show all light sources'}
		title={anyOn ? 'Hide all' : 'Show all'}
		onclick={() => setAllGroups(!anyOn)}
	>
		<span class="switch"><span class="knob"></span></span>
	</button>
</div>

<div class="rows">
	{#each OPTICAL_GROUPS as g (g)}
		{@const on = $visibleGroups[g]}
		<button
			type="button"
			class="row"
			class:on
			role="switch"
			aria-checked={on}
			onclick={() => toggleGroup(g)}
		>
			<span class="dot" style="--c: {SWATCH[g]}"></span>
			<span class="label">{GROUP_LABELS[g]}</span>
			<span class="count">{counts[g]}</span>
			<span class="switch" style="--c: {SWATCH[g]}"><span class="knob"></span></span>
		</button>
	{/each}
</div>

<style>
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 8px;
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
		background: color-mix(in srgb, var(--spectral-green) 55%, var(--panelb));
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
