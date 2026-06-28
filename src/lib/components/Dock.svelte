<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children, actions }: { children: Snippet; actions?: Snippet } = $props();

	/** "Compact" = a phone in portrait (narrow) OR landscape (short): the dock must not eat the
	 *  screen, so it starts collapsed there and opens on demand. Desktop starts open. */
	const COMPACT = '(max-width: 720px), (max-height: 600px)';
	// Start collapsed so SSR (which can't measure the viewport) never renders the dock open over a
	// phone; a mount-time effect opens it on roomy viewports. This keeps the initial state correct
	// on touch devices without a desktop-versus-mobile guess on the server.
	let open = $state(false);
	$effect(() => {
		if (!window.matchMedia(COMPACT).matches) open = true;
	});
	let dragY = $state(0);
	let dragging = $state(false);

	let pointerId: number | null = null;
	let startY = 0;
	let moved = 0;

	function onPointerDown(e: PointerEvent) {
		if (e.pointerType === 'mouse') return; // mouse uses the buttons; drag is a touch affordance
		pointerId = e.pointerId;
		startY = e.clientY;
		moved = 0;
		dragging = true;
	}
	function onPointerMove(e: PointerEvent) {
		if (pointerId !== e.pointerId) return;
		const dy = e.clientY - startY;
		moved = Math.max(moved, Math.abs(dy));
		// Only the open dock drags down to dismiss; a closed dock doesn't drag up (use the button).
		dragY = open ? Math.max(0, dy) : 0;
	}
	function onPointerUp(e: PointerEvent) {
		if (pointerId !== e.pointerId) return;
		pointerId = null;
		dragging = false;
		if (open && dragY > 56) open = false; // dragged past the close threshold
		dragY = 0;
	}

	function toggle() {
		if (moved > 6) return; // that was a drag, not a tap
		open = !open;
	}
</script>

<section
	class="dock"
	class:open
	class:dragging
	style="--dragY: {dragY}px"
	aria-label="Explorer controls"
>
	<!-- The grip is a drag-to-dismiss affordance; the buttons are the accessible controls. -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="handle"
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerUp}
		onpointercancel={onPointerUp}
	>
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

	<div class="sheet">
		<div id="dock-body" class="body" inert={!open}>
			{@render children()}
		</div>
	</div>
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
		transform: translateY(var(--dragY));
		transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.dock.dragging {
		transition: none; /* follow the finger 1:1 while dragging */
	}

	.handle {
		display: flex;
		align-items: center;
		gap: 14px;
		width: 100%;
		padding: 8px 16px 8px 22px;
		touch-action: none; /* let us own the vertical drag gesture */
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
		transition: background 0.15s;
	}
	.dock.dragging .grip {
		background: var(--sub);
	}

	.label {
		font-family: var(--font-mono);
		font-size: 12px;
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

	/* Animated open/close: collapse the sheet's row track from 0fr → 1fr. */
	.sheet {
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows 0.28s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.dock.open .sheet {
		grid-template-rows: 1fr;
	}
	.dock.dragging .sheet {
		transition: none;
	}

	.body {
		display: flex;
		gap: 0;
		min-height: 0;
		overflow-x: auto;
		overflow-y: hidden;
		padding: 0 22px;
		border-top: 1px solid transparent;
		/* The grid collapse clips the body to zero height, but its children keep their own boxes —
		   so hide it outright once collapsed (after the slide finishes), both for assistive tech and
		   so it's genuinely gone, not just visually clipped. */
		visibility: hidden;
		transition: visibility 0s 0.28s;
	}
	.dock.open .body {
		padding: 16px 22px 22px;
		border-top-color: var(--line);
		visibility: visible;
		transition: visibility 0s 0s;
	}

	@media (prefers-reduced-motion: reduce) {
		.dock,
		.sheet {
			transition: none;
		}
	}

	/* Compact (phone portrait or landscape): full-bleed, controls scroll horizontally so the
	   sheet stays short and never buries the explorer. */
	@media (max-width: 720px), (max-height: 600px) {
		.dock {
			left: 0;
			right: 0;
			border-radius: 0;
		}
		.body {
			gap: 14px;
			scroll-snap-type: x proximity;
			-webkit-overflow-scrolling: touch;
		}
	}
</style>
