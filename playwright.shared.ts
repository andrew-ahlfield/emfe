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

	// Prefer the full `chromium-<rev>` build (has chrome-linux/chrome); skip the headless_shell
	// packages, whose layout differs. Any build runs a smoke/e2e page — we just need one that works.
	for (const dir of readdirSync(root)) {
		if (!/^chromium-\d+$/.test(dir)) continue;
		const exe = `${root}/${dir}/chrome-linux/chrome`;
		if (existsSync(exe)) return exe;
	}
	return undefined;
}

/** The session's egress proxy, if outbound HTTPS is tunnelled through one (unset locally). */
export const proxyServer = process.env.HTTPS_PROXY ?? process.env.https_proxy;
