<script lang="ts">
	import { theme, toggleTheme } from '$lib/state/theme';

	// The back affordance is driven by the page's history depth (see +page.svelte): it only shows
	// once there's a prior view to return to, so it never dead-ends into leaving the site. `shift`
	// slides the cluster clear of an open desktop side-drawer (which otherwise covers this corner) so
	// Share/Back stay reachable for the very view a card describes.
	let {
		canGoBack = false,
		shift = false,
		onback
	}: { canGoBack?: boolean; shift?: boolean; onback: () => void } = $props();

	// Show the state you'll switch *to* (click-to-toggle): a sun in dark, a moon in light.
	let themeIcon = $derived($theme === 'dark' ? '☀' : '☾');
	let themeLabel = $derived($theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');

	// Transient "Link copied" confirmation after the clipboard fallback (native share needs none).
	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;

	// Share the current view. The URL already mirrors the whole view state (state/url.ts), so the
	// recipient lands exactly where the sharer is. Prefer the OS share sheet (mobile); otherwise copy
	// the link to the clipboard and flash a confirmation.
	async function share() {
		const url = window.location.href;
		if (typeof navigator !== 'undefined' && navigator.share) {
			try {
				await navigator.share({ title: document.title, url });
				return;
			} catch {
				// User dismissed the sheet, or it's unavailable — fall through to the clipboard copy.
			}
		}
		try {
			await navigator.clipboard.writeText(url);
			copied = true;
			clearTimeout(copyTimer);
			copyTimer = setTimeout(() => (copied = false), 1600);
		} catch {
			// Clipboard blocked (e.g. insecure context) — nothing more we can do silently.
		}
	}
</script>

<div class="corner-actions" class:shifted={shift}>
	{#if canGoBack}
		<button
			type="button"
			class="corner-btn"
			onclick={onback}
			title="Back — undo the last thing you opened"
			aria-label="Back — undo the last thing you opened"
		>
			<svg viewBox="0 0 24 24" aria-hidden="true" class="icon">
				<path
					d="M14 6l-6 6 6 6"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>
	{/if}

	<div class="share-wrap">
		<button
			type="button"
			class="corner-btn"
			onclick={share}
			title="Share this view"
			aria-label="Share this view"
		>
			<svg viewBox="0 0 24 24" aria-hidden="true" class="icon">
				<g
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="18" cy="5" r="2.6" />
					<circle cx="6" cy="12" r="2.6" />
					<circle cx="18" cy="19" r="2.6" />
					<line x1="8.3" y1="10.8" x2="15.7" y2="6.2" />
					<line x1="8.3" y1="13.2" x2="15.7" y2="17.8" />
				</g>
			</svg>
		</button>
		{#if copied}
			<span class="toast" role="status" aria-live="polite">Link copied</span>
		{/if}
	</div>

	<button
		type="button"
		class="corner-btn theme"
		onclick={toggleTheme}
		title={themeLabel}
		aria-label={themeLabel}
	>
		<span aria-hidden="true">{themeIcon}</span>
	</button>
</div>

<style>
	.corner-actions {
		position: absolute;
		top: 1rem;
		right: 1rem;
		z-index: 5;
		display: flex;
		align-items: center;
		gap: 8px;
	}
	/* Desktop only: an open side-drawer (z 61, pinned to the right edge) would otherwise sit over
	   this cluster. Slide it left to just clear the drawer, and lift it above so it stays clickable
	   through the slide. On phones the drawer is a bottom sheet, so the corner is never covered. */
	@media (min-width: 721px) {
		.corner-actions.shifted {
			right: calc(1rem + min(380px, 92vw) + 12px);
			z-index: 62;
			transition: right 0.28s cubic-bezier(0.22, 1, 0.36, 1);
		}
	}
	.corner-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 38px;
		height: 38px;
		border-radius: 50%;
		border: 1px solid var(--panelb);
		background: var(--chip);
		color: var(--ink);
		padding: 0;
		line-height: 1;
		cursor: pointer;
		transition:
			background 0.15s,
			border-color 0.15s;
	}
	.corner-btn:hover {
		border-color: var(--sub);
	}
	.corner-btn.theme {
		font-size: 18px;
	}
	.icon {
		width: 19px;
		height: 19px;
		display: block;
	}
	.share-wrap {
		position: relative;
		display: flex;
	}
	/* The "Link copied" flash hangs just below its button so it never covers the other actions. */
	.toast {
		position: absolute;
		top: calc(100% + 6px);
		right: 0;
		white-space: nowrap;
		padding: 4px 8px;
		border-radius: 7px;
		background: var(--chip);
		border: 1px solid var(--panelb);
		color: var(--ink);
		font-family: var(--font-mono);
		font-size: 11px;
		box-shadow: var(--softshadow);
	}
	@media (max-width: 720px), (max-height: 600px) {
		.corner-actions {
			top: 0.7rem;
			right: 0.7rem;
			gap: 6px;
		}
		.corner-btn {
			width: 34px;
			height: 34px;
		}
		.corner-btn.theme {
			font-size: 16px;
		}
		.icon {
			width: 17px;
			height: 17px;
		}
	}
</style>
