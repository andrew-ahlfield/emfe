# emfe — working notes for Claude

Interactive, zoomable explorer for the electromagnetic spectrum. SvelteKit + TypeScript, SVG
plot, CSS-variable theming (dark default, `html[data-theme='light']`). See `SPEC.md` for intent.

## Visual verification — REQUIRED for any UI change

This app is almost entirely visual. **You must confirm UI changes by looking at a real rendered
screenshot, not by inspecting the DOM.** DOM/computed-style checks miss exactly the things that
matter here (overlap, spacing, legibility over the gradient, brace/label collisions).

The built-in `preview_screenshot` MCP tool **freezes/timeouts when its window is backgrounded**, so
do not rely on it. Instead use the standalone Playwright helper, which always works headless:

```bash
# 1. Make sure a dev server is up (vite dev = port 5173), or use the preview server's port.
npm run dev            # http://localhost:5173

# 2. Capture. Args: "<url-path>" <out.png> [width] [height] [light|dark]
EMFE_BASE=http://localhost:5173 node scripts/shot.mjs "/?z=5.37&c=13.51" /tmp/shot.png 1440 900 dark

# 3. Read the PNG with the Read tool. To inspect a detail, crop first (the plot is wide):
convert /tmp/shot.png -crop 520x90+20+218 +repage /tmp/crop.png   # WxH+X+Y
```

`scripts/shot.mjs` defaults `EMFE_BASE` to the preview tool's port (5180); override it as above.
Always check **both themes** (`dark`/`light`) and a **narrow width** (e.g. 760) — label collisions
appear at narrow widths and one theme but not the other. Deep-link state lives in the query string
(`z`=zoom, `c`=centre exp, `lic`=licence, `layers`, …; see `src/lib/state/url.ts`).

## Plot geometry

All vertical coordinates are SVG user units defined once in `src/lib/components/plot-layout.ts`
(`PLOT`). The SVG is stretched horizontally only (viewBox width = pixel width), so **1 vertical unit
= 1 px** but horizontal scaling varies. The above-band gap (region labels y≈100 → band top y=118) is
tight — region labels, group braces, and annotations all compete there; prefer the band's upper
strip (y 118→141, above the marker mid-line at 147) for in-band captions.

## Data

Allocations are JSON in `data/allocations/*.json`, glob-imported at build (`src/lib/data/loader.ts`)
— edits hot-reload. Dual-membership ("dual licence") is `altLayer` on an entry: it then shows when
*either* layer is on and colours by `effectiveLayer` (primary wins when its toggle is on).

## Checks

`npm run check` (svelte-check), `npm run test:unit -- --run` (vitest), `npm run test:e2e`
(Playwright, builds + serves on 4173).

## Release process

The deploy *topology* — which branches map to which Netlify environments and URLs — lives in the
[README's Deploy section](README.md#deploy). The *procedure* below is the loop you run to ship a
change; it lives here so it's always in your working context.

**Where the human gate is.** `dev` is an agent-owned staging branch: **landing work on `dev` does
not need approval — that's the whole point of it.** Merge to `dev` yourself, let it deploy, then
smoke-test the deploy. The review gate is *your report* (step 5), not a pre-merge ask: a human
reads your summary of what changed and how every check went — including the smoke test against the
live dev deployment — and decides whether to promote. Approval is required **only** to promote to
production (`main` → `prod`), never to reach `dev`. So don't stop to ask before merging to `dev`;
stop to *report* after the dev deploy is smoke-tested.

1. Commit work on a `feature/…` (or `claude/…`) branch.
2. Get all checks green (`npm run check`, `npm run test:unit -- --run`, `npm run test:e2e`) —
   rework until clean.
3. **Merge it into `dev`** (open the PR and merge — no approval needed). This publishes to the dev
   Netlify deploy.
4. Run the live smoke test against the **deployed** dev site: `npm run test:smoke` (point elsewhere
   with `SMOKE_URL=…`). It loads the real deployment and checks it comes up clean, a deep-link
   reproduces the view, and controls respond. **In a sandboxed session** the browser needs the
   proxy/CA accommodations in [`docs/cloud-smoke-test.md`](docs/cloud-smoke-test.md); if the CA gap
   there is still open, run it from a machine with normal egress, and at minimum confirm the deploy
   is reachable with `curl` so the report is honest about what actually ran.
5. **Report — this is the review gate.** Summarise what you changed and the state of every check:
   `npm run check`, unit, e2e, and the dev-deployment smoke test, calling out any anomaly (and, if
   the sandbox CA gap blocked the smoke run, exactly how you verified the deploy instead). The
   human reviews this against the live dev deploy and decides whether to promote. End your turn
   here — do not promote on your own.
6. **On approval only:** bump the version (semver) and merge `dev` → `main`.
7. Cut the official GitHub release from `main`.
8. Push `main` → `prod` to go live.
