<script lang="ts">
	import type { Allocation, LicenseRank } from '$lib/data/types';
	import { inspectorPinned, togglePinned } from '$lib/state/inspector';
	import Inspector from './Inspector.svelte';

	let {
		allocation,
		license,
		open,
		onclose
	}: {
		allocation: Allocation;
		license: LicenseRank;
		open: boolean;
		onclose: () => void;
	} = $props();

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) onclose();
	}
</script>

<svelte:window onkeydown={onKey} />

<!-- Non-modal: the drawer never dims or blocks the spectrum. Pinning docks it beside the number
     line (the page shifts left); unpinned it's a transient right-hand overlay. -->
<div
	class="drawer"
	class:open
	class:pinned={$inspectorPinned}
	role={open ? 'dialog' : undefined}
	aria-label={open ? 'Allocation details' : undefined}
	inert={!open}
>
	<button
		type="button"
		class="pin"
		class:on={$inspectorPinned}
		onclick={togglePinned}
		aria-pressed={$inspectorPinned}
		aria-label={$inspectorPinned ? 'Unpin details panel' : 'Pin details panel open'}
		title={$inspectorPinned ? 'Unpin' : 'Pin open'}
	>
		<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
			<path
				d="M9.5 1.5l5 5-1.6 1.6-1-.3-2.7 2.7.4 2.2L7.7 14 5 11.3 1.6 13l-.6-.6 1.7-3.4L0 6.3l1.3-.9 2.2.4L6.2 3l-.3-1L7.5.5z"
				fill="currentColor"
			/>
		</svg>
	</button>
	<button type="button" class="close" onclick={onclose} aria-label="Close details">×</button>
	<div class="content">
		<Inspector {allocation} {license} />
	</div>
</div>

<style>
	.drawer {
		position: fixed;
		z-index: 61;
		background: var(--panel);
		border: 1px solid var(--line);
		box-shadow: -18px 0 50px rgba(0, 0, 0, 0.28);
		overflow: hidden auto;
		overscroll-behavior: contain;
		/* desktop / landscape: a right-hand side sheet */
		top: 0;
		right: 0;
		height: 100dvh;
		width: min(380px, 92vw);
		border-radius: 18px 0 0 18px;
		transform: translateX(102%);
		transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.drawer.open {
		transform: translateX(0);
	}

	.content {
		padding: 40px 22px 24px;
	}

	.pin {
		position: absolute;
		top: 10px;
		left: 12px;
		width: 30px;
		height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		border-radius: 8px;
		background: var(--chip);
		color: var(--sub);
		cursor: pointer;
		z-index: 1;
		transition:
			background 0.15s,
			color 0.15s,
			transform 0.15s;
	}
	.pin:hover {
		background: var(--panelb);
		color: var(--ink);
	}
	.pin.on {
		background: color-mix(in srgb, var(--layer-navigation) 22%, transparent);
		color: var(--layer-navigation);
		transform: rotate(45deg);
	}
	.close {
		position: absolute;
		top: 10px;
		right: 12px;
		width: 30px;
		height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		border-radius: 8px;
		background: var(--chip);
		color: var(--sub);
		font-size: 20px;
		line-height: 1;
		cursor: pointer;
		z-index: 1;
	}
	.close:hover {
		background: var(--panelb);
		color: var(--ink);
	}

	/* Portrait phones: a bottom sheet instead of a side sheet. Pinning (a desktop side-by-side
	   affordance) doesn't apply here, so hide the pin. */
	@media (max-width: 720px) {
		.drawer {
			top: auto;
			bottom: 0;
			left: 0;
			right: 0;
			width: auto;
			height: auto;
			max-height: 78dvh;
			border-radius: 18px 18px 0 0;
			box-shadow: 0 -18px 50px rgba(0, 0, 0, 0.3);
			transform: translateY(102%);
		}
		.drawer.open {
			transform: translateY(0);
		}
		.pin {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.drawer {
			transition: none;
		}
	}
</style>
