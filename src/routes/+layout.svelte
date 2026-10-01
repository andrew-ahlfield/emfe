<script lang="ts">
	// Self-hosted brand fonts (replaces the render-blocking Google Fonts <link>).
	// Variable builds: one weight axis each. Newsreader uses the opsz files so its
	// optical-size axis is preserved (matching the prototype's display@6..72 setup).
	import '@fontsource-variable/hanken-grotesk/index.css'; // sans: wght 100–900
	import '@fontsource-variable/newsreader/opsz.css'; // serif: opsz + wght, normal
	import '@fontsource-variable/newsreader/opsz-italic.css'; // serif: opsz + wght, italic
	import '@fontsource-variable/jetbrains-mono/index.css'; // mono: wght 100–800
	import '../app.css';
	import { theme } from '$lib/state/theme';

	let { children } = $props();

	// Keep the document theme attribute in sync with the store (browser only) and persist the
	// viewer's choice locally. Theme lives in localStorage, not the shareable URL, because colour
	// scheme is a personal preference; a shared link opens in the recipient's own scheme.
	$effect(() => {
		document.documentElement.dataset.theme = $theme;
		try {
			localStorage.setItem('emfe-theme', $theme);
		} catch {
			/* private mode / storage disabled: fall back to in-memory only */
		}
	});
</script>

{@render children()}
