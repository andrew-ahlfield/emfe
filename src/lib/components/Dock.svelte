<script lang="ts">
	import type { Snippet } from 'svelte';
	import { browser } from '$app/environment';

	let { children, actions }: { children: Snippet; actions?: Snippet } = $props();

	// Collapsed by default on phones (the dock is fixed and would cover the plot); open on desktop.
	let open = $state(browser ? !window.matchMedia('(max-width: 720px)').matches : true);
	const toggle = () => (open = !open);
</script>

<section class="dock" class:open>
	<div class="handle">
		<button
			type="button"
			class="bar"
			aria-expanded={open}
			aria-controls="dock-body"
			onclick={toggle}
		>
			<span class="grip" aria-hidden="true"></span>
			<span class="label">Controls</span>
		</button>

		{#if actions}
			<div class="actions">{@render actions()}</div>
		{/if}

		<button
			type="button"
			class="chevron"
			aria-expanded={open}
			aria-controls="dock-body"
			aria-label={open ? 'Collapse controls' : 'Expand controls'}
			onclick={toggle}
		>
			{open ? '▾' : '▴'}
		</button>
	</div>

	{#if open}
		<div id="dock-body" class="body">
			{@render children()}
		</div>
	{/if}
</section>

<style>
	.dock {
		position: fixed;
		left: 18px;
		right: 18px;
		bottom: 0;
		z-index: 50;
		background: var(--panel);
		border: 1px solid var(--line);
		border-bottom: none;
		border-radius: 16px 16px 0 0;
		box-shadow: 0 -18px 50px rgba(0, 0, 0, 0.3);
	}

	.handle {
		display: flex;
		align-items: center;
		gap: 14px;
		width: 100%;
		padding: 8px 16px 8px 22px;
	}

	.bar {
		display: flex;
		align-items: center;
		gap: 12px;
		flex: 1;
		min-width: 0;
		padding: 4px 0;
		background: none;
		border: none;
		cursor: pointer;
		color: inherit;
	}

	.grip {
		width: 34px;
		height: 4px;
		border-radius: 2px;
		background: var(--panelb);
		flex-shrink: 0;
	}

	.label {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.16em;
		color: var(--sub);
		text-transform: uppercase;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.chevron {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: none;
		border-radius: 8px;
		background: none;
		font-family: var(--font-mono);
		font-size: 13px;
		color: var(--sub);
		cursor: pointer;
	}
	.chevron:hover {
		background: var(--chip);
	}

	.body {
		display: flex;
		gap: 0;
		padding: 16px 22px 22px;
		border-top: 1px solid var(--line);
	}

	@media (max-width: 720px) {
		.dock {
			left: 0;
			right: 0;
			border-radius: 0;
		}
		.body {
			flex-direction: column;
			gap: 16px;
			/* Never let the (fixed) dock cover the whole screen — scroll its contents instead. */
			max-height: 68vh;
			overflow-y: auto;
		}
	}
</style>
