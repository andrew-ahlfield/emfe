<script lang="ts">
	import { referencedSources } from '$lib/data/loader';

	const sources = referencedSources();
	const version = __APP_VERSION__;
	let dialog = $state<HTMLDialogElement>();

	function open() {
		dialog?.showModal();
	}
	function close() {
		dialog?.close();
	}
	// Close when the backdrop (the dialog element itself) is clicked, not the inner panel.
	function onDialogClick(event: MouseEvent) {
		if (event.target === dialog) close();
	}
</script>

<button type="button" class="action" onclick={open}>Sources</button>

<!-- Native <dialog> handles focus trapping, Esc-to-close, and focus return for free. -->
<dialog bind:this={dialog} class="modal" aria-labelledby="sources-title" onclick={onDialogClick}>
	<div class="panel">
		<header>
			<h2 id="sources-title">Sources &amp; credits</h2>
			<button type="button" class="close" onclick={close} aria-label="Close">×</button>
		</header>

		<section>
			<div class="eyebrow">Data sources</div>
			<ul>
				{#each sources as s (s.id)}
					<li>
						<div class="title">
							{#if s.url}
								<!-- External source URL (absolute https), not an internal SvelteKit route. -->
								<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
								<a href={s.url} target="_blank" rel="noreferrer noopener">{s.title}</a>
							{:else}
								{s.title}
							{/if}
						</div>
						{#if s.retrieved}
							<div class="meta">retrieved {s.retrieved}</div>
						{/if}
					</li>
				{/each}
			</ul>
		</section>

		<section>
			<div class="eyebrow">Credits</div>
			<p class="credit">
				An interactive, zoomable tour of the electromagnetic spectrum — from sub-ELF to gamma — on
				one continuous log-frequency axis.
			</p>
			<p class="credit">
				Design adapted from the Spectrum Atlas prototype. Built with SvelteKit. Amateur band plan
				per the ARRL / FCC Part 97.
			</p>
		</section>

		<footer>EM Frequency Explorer · v{version}</footer>
	</div>
</dialog>

<style>
	.action {
		display: flex;
		align-items: center;
		height: 32px;
		padding: 0 14px;
		border-radius: 8px;
		border: 1px solid var(--line);
		background: var(--chip);
		color: var(--ink);
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		cursor: pointer;
		transition:
			background 0.15s,
			border-color 0.15s;
	}
	.action:hover {
		border-color: var(--sub);
	}

	.modal {
		margin: auto;
		max-width: 460px;
		width: calc(100vw - 36px);
		padding: 0;
		border: 1px solid var(--line);
		border-radius: 16px;
		background: var(--panel);
		color: var(--ink);
		box-shadow: var(--softshadow);
	}
	.modal::backdrop {
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(2px);
	}

	.panel {
		padding: 22px 24px 20px;
	}
	header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 18px;
	}
	h2 {
		margin: 0;
		font-family: var(--font-serif);
		font-size: 20px;
		font-weight: 500;
	}
	.close {
		border: none;
		background: none;
		color: var(--sub);
		font-size: 24px;
		line-height: 1;
		cursor: pointer;
		padding: 0 2px;
	}
	.close:hover {
		color: var(--ink);
	}

	section {
		margin-bottom: 18px;
	}
	.eyebrow {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.14em;
		color: var(--faint);
		text-transform: uppercase;
		margin-bottom: 10px;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.title {
		font-size: 13.5px;
		font-weight: 500;
	}
	.title a {
		color: var(--layer-navigation);
		text-decoration: none;
	}
	.title a:hover {
		text-decoration: underline;
	}
	.meta {
		margin-top: 2px;
		font-family: var(--font-mono);
		font-size: 9.5px;
		color: var(--faint);
	}
	.credit {
		margin: 0 0 8px;
		font-size: 12.5px;
		line-height: 1.5;
		color: var(--sub);
	}
	.credit:last-child {
		margin-bottom: 0;
	}
	footer {
		padding-top: 14px;
		border-top: 1px solid var(--line);
		font-family: var(--font-mono);
		font-size: 9.5px;
		letter-spacing: 0.08em;
		color: var(--faint);
	}
</style>
