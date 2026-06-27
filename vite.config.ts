import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-netlify';
import { sveltekit } from '@sveltejs/kit/vite';
import Inspect from 'vite-plugin-inspect';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
	// Expose the package version to the app (shown in the Sources & credits modal).
	define: { __APP_VERSION__: JSON.stringify(pkg.version) },
	plugins: [
		// Dev-only module-graph + transform inspector at http://localhost:5173/__inspect/
		Inspect(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	],
	test: {
		expect: { requireAssertions: true },
		// Unit tests live in tests/ (SPEC §Project Structure); component tests are
		// colocated as *.svelte.{test,spec}.ts. Pass cleanly until Task 2 adds tests.
		passWithNoTests: true,
		coverage: {
			provider: 'v8',
			// Coverage targets the pure lib (SPEC: core lib ≥ 90%, overall pragmatic).
			include: ['src/lib/**/*.{ts,svelte}'],
			reporter: ['text', 'html']
		},
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['{src,tests}/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['{src,tests}/**/*.{test,spec}.{js,ts}'],
					exclude: ['{src,tests}/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
