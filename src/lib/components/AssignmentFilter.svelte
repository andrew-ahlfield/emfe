<script lang="ts">
	import { assignmentView, toggleAssignment } from '$lib/state/assignment';

	let on = $derived($assignmentView.show);
</script>

<div class="head">
	<div class="eyebrow"><span class="tier">Assignment</span> · designated</div>
	<button
		type="button"
		class="master"
		class:on
		role="switch"
		aria-checked={on}
		aria-label={on ? 'Hide the assignment lane' : 'Show the assignment lane'}
		title={on ? 'Hide designated frequencies' : 'Show designated frequencies'}
		onclick={toggleAssignment}
	>
		<span class="switch"><span class="knob"></span></span>
	</button>
</div>

<p class="blurb">
	Who <em>holds</em> a band nationally — carriers and satellite operators, drawn over their band —
	plus single frequencies <em>designated</em> for one job (red = emergency).
</p>
<ul class="legend" class:dim={!on}>
	<li>Verizon · AT&amp;T · T-Mobile · Dish</li>
	<li>SiriusXM · Globalstar · Iridium · GPS · Starlink</li>
	<li>121.5 / 243.0 guard · 146.52 &amp; ham calling</li>
</ul>

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
		background: color-mix(in srgb, var(--layer-navigation) 60%, var(--panelb));
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
	.blurb {
		margin: 0 4px 10px;
		font-family: var(--font-sans);
		font-size: 12px;
		line-height: 1.45;
		color: var(--sub);
	}
	.blurb em {
		color: var(--ink);
		font-style: italic;
	}
	.legend {
		list-style: none;
		margin: 0;
		padding: 0 4px;
		transition: opacity 0.15s;
	}
	.legend.dim {
		opacity: 0.4;
	}
	.legend li {
		font-family: var(--font-mono);
		font-size: 10.5px;
		color: var(--faint);
		line-height: 1.7;
	}
</style>
