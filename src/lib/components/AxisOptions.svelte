<script lang="ts">
	import { axisOptions, toggleExp, toggleLambda, toggleAccurateVisible } from '$lib/state/axis';
</script>

<div class="eyebrow">Axis &amp; scale</div>

<div class="rows">
	<button
		type="button"
		class="row"
		class:on={$axisOptions.showExp}
		role="switch"
		aria-checked={$axisOptions.showExp}
		onclick={toggleExp}
	>
		<span class="box" aria-hidden="true">{$axisOptions.showExp ? '✓' : ''}</span>
		<span class="label">Scientific notation (10ⁿ)</span>
	</button>
	<button
		type="button"
		class="row"
		class:on={$axisOptions.showLambda}
		role="switch"
		aria-checked={$axisOptions.showLambda}
		onclick={toggleLambda}
	>
		<span class="box" aria-hidden="true">{$axisOptions.showLambda ? '✓' : ''}</span>
		<span class="label">Wavelength λ (metres)</span>
	</button>
	<button
		type="button"
		class="row"
		class:on={$axisOptions.accurateVisible}
		role="switch"
		aria-checked={$axisOptions.accurateVisible}
		onclick={toggleAccurateVisible}
	>
		<span class="box" aria-hidden="true">{$axisOptions.accurateVisible ? '✓' : ''}</span>
		<span class="label">Accurate visible band</span>
	</button>
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
		gap: 2px;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 9px;
		width: 100%;
		padding: 6px 2px;
		border: none;
		background: transparent;
		cursor: pointer;
		color: var(--sub);
		font-family: var(--font-sans);
		font-size: 13.5px;
		text-align: left;
		transition: color 0.15s;
	}
	.row.on {
		color: var(--ink);
	}
	.box {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 15px;
		height: 15px;
		border-radius: 4px;
		border: 1.5px solid var(--panelb);
		background: transparent;
		color: #fff;
		font-size: 12px;
		line-height: 1;
		flex-shrink: 0;
		transition:
			background 0.15s,
			border-color 0.15s;
	}
	.row.on .box {
		background: var(--layer-science);
		border-color: var(--layer-science);
	}
</style>
