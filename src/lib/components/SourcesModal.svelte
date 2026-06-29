<script lang="ts">
	import { referencedSources } from '$lib/data/loader';

	const sources = referencedSources();
	const version = __APP_VERSION__;
	// Copyright spans from first publication (2026) to the current year. Show a
	// single year until we're past 2026, then an en-dash range (e.g. 2026–2027).
	const startYear = 2026;
	const year = new Date().getFullYear();
	const copyrightYears = year > startYear ? `${startYear}–${year}` : `${startYear}`;
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
			<p class="lead">
				The primary references for the whole dataset. Individual allocations may cite an additional
				source in their detail card.
			</p>
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
			<p class="credit">Built by Exagrow Studios &amp; Andrew SC Ahlfield · © {copyrightYears}.</p>
			<p class="credit">
				Open source on
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href="https://github.com/wajeemba/emfe" target="_blank" rel="noreferrer noopener"
					>GitHub</a
				>
				— code under
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a
					href="https://www.apache.org/licenses/LICENSE-2.0"
					target="_blank"
					rel="noreferrer noopener">Apache&nbsp;2.0</a
				>, data under
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a
					href="https://creativecommons.org/licenses/by/4.0/"
					target="_blank"
					rel="noreferrer noopener">CC&nbsp;BY&nbsp;4.0</a
				>.
			</p>
			<p class="credit">
				Developed using Claude Code (Opus 4.8) and the
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a
					href="https://github.com/addyosmani/agent-skills"
					target="_blank"
					rel="noreferrer noopener">Addyosmani agent skills v0.6.2</a
				>. Built with SvelteKit.
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
		font-size: 12px;
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
		font-size: 11px;
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
		font-size: 11.5px;
		color: var(--faint);
	}
	.lead {
		margin: 0 0 12px;
		font-size: 12.5px;
		line-height: 1.5;
		color: var(--sub);
	}
	.credit {
		margin: 0 0 2px;
		font-size: 12.5px;
		line-height: 1.5;
		color: var(--sub);
	}
	/* The licensing line that follows the copyright reads as one block with it (no gap). The
	   Claude-Code build note that follows gets a little air to set it apart. */
	.credit + .credit:last-child {
		margin-top: 8px;
	}
	.credit:last-child {
		margin-bottom: 0;
	}
	/* Credit links match the data-source links above for a consistent link style. */
	.credit a {
		color: var(--layer-navigation);
		text-decoration: none;
	}
	.credit a:hover {
		text-decoration: underline;
	}
	footer {
		padding-top: 14px;
		border-top: 1px solid var(--line);
		font-family: var(--font-mono);
		font-size: 11.5px;
		letter-spacing: 0.08em;
		color: var(--faint);
	}
</style>
