<script lang="ts">
	import { theme, toggleTheme } from '$lib/state/theme';
</script>

<button
	type="button"
	class="theme-toggle"
	onclick={toggleTheme}
	title="Toggle light / dark"
	aria-label="Toggle light / dark theme"
>
	{$theme === 'dark' ? '☾' : '☀'}
</button>

<style>
	.theme-toggle {
		position: fixed;
		top: 18px;
		right: 18px;
		z-index: 60;
		width: 46px;
		height: 46px;
		border-radius: 50%;
		border: 1px solid var(--panelb);
		background: var(--chip);
		color: var(--ink);
		font-size: 18px;
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		cursor: pointer;
		transition:
			background 0.15s,
			border-color 0.15s;
	}
	.theme-toggle:hover {
		border-color: var(--sub);
	}
</style>
