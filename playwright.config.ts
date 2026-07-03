import { defineConfig } from '@playwright/test';
import { resolveChromium } from './playwright.shared';

// In a sandboxed session (Claude Code cloud) the pinned Playwright browser usually isn't the one
// installed under PLAYWRIGHT_BROWSERS_PATH — point at whatever Chromium is actually there. No-op
// locally (returns undefined → managed browser). See docs/cloud-smoke-test.md.
const executablePath = resolveChromium();

export default defineConfig({
	webServer: { command: 'npm run build && npm run preview', port: 4173 },
	testDir: 'e2e',
	// Pin the OS color-scheme so theme assertions are deterministic (the app now defaults to
	// the OS preference; dark keeps `data-theme="dark"` as the baseline the specs expect).
	use: {
		colorScheme: 'dark',
		...(executablePath ? { launchOptions: { executablePath } } : {})
	}
});
