<script lang="ts">
	import { theme, toggleTheme } from '$lib/state/theme';
</script>

<button
	type="button"
	class="action"
	onclick={toggleTheme}
	title="Toggle light / dark"
	aria-label="Toggle light / dark theme"
>
	<span aria-hidden="true">{$theme === 'dark' ? '☾' : '☀'}</span>
</button>

<style>
	.action {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		border: 1px solid var(--line);
		background: var(--chip);
		color: var(--ink);
		font-size: 15px;
		line-height: 1;
		padding: 0;
		cursor: pointer;
		transition:
			background 0.15s,
			border-color 0.15s;
	}
	.action:hover {
		border-color: var(--sub);
	}
</style>
