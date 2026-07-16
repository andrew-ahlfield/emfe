import { existsSync, readdirSync } from 'node:fs';

/**
 * Shared Playwright helpers for running the browser-driven suites inside a sandboxed session
 * (Claude Code cloud, CI containers). Both `playwright.config.ts` (local e2e) and
 * `playwright.smoke.config.ts` (live smoke) use these; everything here is env-gated so a normal
 * local/CI run — matched managed browser, no egress proxy — is untouched. See
 * `docs/cloud-smoke-test.md`.
 */

/**
 * Resolve a usable Chromium when the build Playwright pins isn't installed. The cloud image ships
 * a Chromium under `PLAYWRIGHT_BROWSERS_PATH` whose revision rarely matches this `@playwright/test`
 * version, so the managed launch fails with "Executable doesn't exist at
 * …chromium_headless_shell-<rev>". Playwright has no "any version is fine" switch — it resolves by
 * exact revision — so we point `executablePath` at whatever `chromium-<rev>` is actually present.
 *
 * Returns undefined locally (no browsers dir pinned, or an unreadable override) so Playwright falls
 * back to its own managed install. Force a specific binary with `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.
 */
export function resolveChromium(): string | undefined {
	const override = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
	if (override) return existsSync(override) ? override : undefined;

	const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
	if (!root || !existsSync(root)) return undefined;

	// Prefer the full `chromium-<rev>` build; skip the headless_shell packages, whose layout
	// differs. Any build runs a component/e2e/smoke page — we just need one that launches.
	//
	// Newest revision first: the directory order is filesystem-dependent, and when the image ships
	// several builds we want a deterministic pick rather than whichever readdir happened to yield.
	const builds = readdirSync(root)
		.filter((dir) => /^chromium-\d+$/.test(dir))
		.sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));

	for (const dir of builds) {
		// Playwright renamed the payload directory `chrome-linux` → `chrome-linux64` (the cloud
		// image's chromium-1194 predates the rename; every current build is post-). Try both, so a
		// browser-image bump can't silently drop us back to the managed lookup that fails here.
		for (const layout of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
			const exe = `${root}/${dir}/${layout}`;
			if (existsSync(exe)) return exe;
		}
	}
	return undefined;
}

/** The session's egress proxy, if outbound HTTPS is tunnelled through one (unset locally). */
export const proxyServer = process.env.HTTPS_PROXY ?? process.env.https_proxy;
