<script lang="ts">
	/**
	 * Shared right-hand details sheet: the single shell behind all three info cards (marker
	 * inspector, spectrum-neighbourhood explainer, substrate-band details), which used to each carry
	 * their own near-identical copy of this chrome. Non-modal: it never dims or blocks the spectrum.
	 *
	 * Desktop/landscape it's a full-height side sheet; portrait phones get a bottom sheet that rises
	 * only to just under the spectrum card (via `--card-bottom`) and scrolls internally beyond that.
	 * Pass `onpin` to add the pin/dock affordance (only the marker inspector uses it).
	 */
	import type { Snippet } from 'svelte';

	let {
		open,
		label,
		onclose,
		pinned = false,
		onpin,
		children
	}: {
		open: boolean;
		/** Accessible name for the dialog when open. */
		label: string;
		onclose: () => void;
		/** Pinned (docked) presentation: only meaningful when `onpin` is supplied. */
		pinned?: boolean;
		/** When provided, shows the pin/dock toggle button and calls this on click. */
		onpin?: () => void;
		children: Snippet;
	} = $props();

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) onclose();
	}
</script>

<svelte:window onkeydown={onKey} />

<div
	class="drawer"
	class:open
	class:pinned
	role={open ? 'dialog' : undefined}
	aria-label={open ? label : undefined}
	inert={!open}
>
	{#if onpin}
		<button
			type="button"
			class="pin"
			class:on={pinned}
			onclick={onpin}
			aria-pressed={pinned}
			aria-label={pinned ? 'Unpin details panel' : 'Pin details panel open'}
			title={pinned ? 'Unpin' : 'Pin open'}
		>
			<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
				<path
					d="M9.5 1.5l5 5-1.6 1.6-1-.3-2.7 2.7.4 2.2L7.7 14 5 11.3 1.6 13l-.6-.6 1.7-3.4L0 6.3l1.3-.9 2.2.4L6.2 3l-.3-1L7.5.5z"
					fill="currentColor"
				/>
			</svg>
		</button>
	{/if}
	<button type="button" class="close" onclick={onclose} aria-label="Close details">×</button>
	<div class="content">
		{@render children()}
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
		padding: 40px 22px 28px;
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
			/* Rise only to just under the spectrum card's bottom edge (measured into --card-bottom by
			   the page), leaving a 14px margin; taller content scrolls within. The dvh fallback keeps
			   sensible behaviour if the measurement hasn't landed yet. */
			max-height: min(80dvh, calc(100dvh - var(--card-bottom, 20dvh) - 14px));
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
