<script lang="ts">
	// The explorer is built out in Phase 2 (Axis, SpectrumBand, Dock, Inspector).
	// Task 1 ships only the scaffold: a themed page that builds and serves.
</script>

<svelte:head>
	<title>EM Frequency Explorer</title>
	<meta
		name="description"
		content="An interactive, zoomable explorer for the electromagnetic spectrum — from below ELF through radio, light, X-ray and gamma, on one logarithmic frequency axis."
	/>
</svelte:head>

<main>
	<h1>EM Frequency Explorer</h1>
	<p>From lightning to gamma rays — coming together one phase at a time.</p>
</main>

<style>
	main {
		max-width: 1280px;
		margin: 0 auto;
		padding: 48px 28px;
	}

	h1 {
		font-family: var(--font-serif);
		font-weight: 500;
		letter-spacing: -0.01em;
	}

	p {
		color: var(--sub);
	}
</style>
