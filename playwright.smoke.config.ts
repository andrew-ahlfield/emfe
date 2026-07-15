import { defineConfig } from '@playwright/test';
import { resolveChromium, proxyServer } from './playwright.shared';

/**
 * Live smoke test config — runs against a **deployed** environment (default: the `dev` staging
 * deploy), not a local build. This is the "close the loop" check in the release process
 * (README §Deploy step 4): after a branch lands on `dev`, verify the real deployment loads clean
 * and its core functionality works before promoting.
 *
 * Override the target with SMOKE_URL, e.g. to smoke-test production or a Netlify deploy-preview:
 *   SMOKE_URL=https://emfe.exagrow.com npm run test:smoke
 *
 * Deliberately separate from `playwright.config.ts` (which builds + serves locally on 4173): that
 * config has a `webServer`; this one has none, so `npm run test:e2e` never reaches out to the
 * network and this never spins up a local server.
 *
 * ## Running inside a sandboxed session (Claude Code cloud, CI containers)
 *
 * Two accommodations, both env-gated (via `playwright.shared.ts`) so a normal local/CI run is
 * untouched — see `docs/cloud-smoke-test.md` for the full story and the CA step the browser needs.
 *
 *  1. **Any installed Chromium build, not just the one Playwright pins** — {@link resolveChromium}.
 *  2. **Egress proxy.** When `HTTPS_PROXY` is set the browser is routed through it too.
 */
const executablePath = resolveChromium();

export default defineConfig({
	testDir: 'smoke',
	// A live target over the public internet: allow a couple of retries and generous timeouts so a
	// transient hiccup doesn't fail the gate.
	retries: 2,
	timeout: 30_000,
	expect: { timeout: 10_000 },
	use: {
		baseURL: process.env.SMOKE_URL ?? 'https://dev--emfe.netlify.app',
		// Pin the OS colour-scheme so the theme baseline is deterministic (matches the local e2e).
		colorScheme: 'dark',
		trace: 'on-first-retry',
		// Route the browser through the session's egress proxy and accept its re-terminated TLS when
		// present; both no-ops when HTTPS_PROXY is unset (the normal local/CI path).
		...(proxyServer ? { proxy: { server: proxyServer }, ignoreHTTPSErrors: true } : {}),
		launchOptions: {
			...(executablePath ? { executablePath } : {}),
			args: [
				...(proxyServer ? [`--proxy-server=${proxyServer}`, '--ignore-certificate-errors'] : []),
				// Chromium's component/telemetry fetches go out as plain HTTP, which the CONNECT-only
				// egress proxy rejects — noise in a proxied session, so switch them off.
				'--disable-background-networking',
				'--disable-component-update'
			]
		}
	}
});
