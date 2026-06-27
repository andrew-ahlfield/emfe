<script lang="ts">
	import { referencedSources } from '$lib/data/loader';

	const sources = referencedSources();
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

<button type="button" class="trigger" onclick={open}>Sources</button>

<!-- Native <dialog> handles focus trapping, Esc-to-close, and focus return for free. -->
<dialog
	bind:this={dialog}
	class="modal"
	aria-labelledby="sources-title"
	onclick={onDialogClick}
>
	<div class="panel">
		<header>
			<h2 id="sources-title">Sources &amp; provenance</h2>
			<button type="button" class="close" onclick={close} aria-label="Close">×</button>
		</header>
		<p class="lead">Every data origin referenced by the allocations on the spectrum.</p>
		<ul>
			{#each sources as s (s.id)}
				<li>
					<div class="title">
						{#if s.url}
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
	</div>
</dialog>

<style>
	.trigger {
		position: fixed;
		top: 18px;
		left: 18px;
		z-index: 60;
		height: 46px;
		padding: 0 18px;
		border-radius: 23px;
		border: 1px solid var(--panelb);
		background: var(--chip);
		color: var(--ink);
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		cursor: pointer;
		transition: border-color 0.15s;
	}
	.trigger:hover {
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
		padding: 22px 24px 24px;
	}
	header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
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
	.lead {
		margin: 4px 0 16px;
		font-size: 13px;
		color: var(--sub);
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 14px;
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
</style>
