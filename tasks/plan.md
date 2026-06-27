# Implementation Plan: EM Frequency Explorer (`emfe`)

> Companion to [SPEC.md](../SPEC.md). Task checklist lives in [todo.md](todo.md).
> Status: **draft — awaiting human review.**

## Overview

Rebuild the static prototype (`moodboards/spectrum-atlas-prototype.html`) as a real
**SvelteKit + Vite + TypeScript** application: a single continuous **log-frequency axis**
(~3 Hz → ≥10²⁴ Hz) with **semantic zoom** across ≥4 LOD tiers (Regions → ITU bands →
Allocations → Channels). The work is greenfield — nothing is scaffolded yet. We build
foundations bottom-up (scaffold → pure math → data), then deliver vertical slices that each
leave a working, demoable explorer.

The prototype already pins down the _visual design and idioms_ we must match (`fmtFreq`,
`fmtLambda`, region/layer color palettes, the dock layout, the inspector, the CSS-variable
theme). This plan translates those idioms into the spec's architecture: **logic in pure
`.ts` under `src/lib`, `.svelte` files presentational, D3 owns the SVG.**

## Architecture Decisions

- **Bottom-up foundation, then vertical slices.** A visualization can't be sliced purely
  vertically — the scale math, data schema, and scaffold are shared prerequisites. Phase 1
  builds those; Phases 2–5 are vertical (each adds a complete user-facing capability).
- **Progressive stores, not a monolithic state layer.** Each Svelte store (`view`, `theme`,
  `selection`, `layers`, `license`) is introduced in the slice that first needs it, rather
  than building all of `src/lib/state` up front (avoids horizontal slicing).
- **Single source of truth = `view` store (center exponent + zoom).** d3-zoom drives it;
  LOD is _derived_ from zoom; the URL serializes it. One state shape feeds rendering,
  semantic zoom, and deep-linking so they can't drift.
- **Seed data early, full breadth late.** Task 3 ships a representative dataset (≈ the
  prototype's 20 markers) so rendering/zoom can be built and tested immediately. Expanding to
  the full ELF→gamma curation (Task 14) is content-heavy and partly blocked on Open Question
  #1, so it is deliberately deferred and isolated.
- **SVG rendering** (markers sparse; per-element hit-testing + CSS-var theming + a11y).
  Canvas stays reserved for a hypothetical future dense layer only.
- **FCC live data is additive and fail-safe.** The curated JSON renders everything; the FCC
  proxy enriches only the 225–3700 MHz slice and falls back to a committed snapshot.

## Dependency Graph

```
Task 1  Scaffold (SvelteKit + Vite + TS + tooling + CI skeleton)
   │
   ├── Task 2  Pure spectrum math (scale/pos, LOD, fmtFreq, fmtLambda)   [unit-tested]
   │      │
   │      └── Task 3  Data: schema + types + loader + seed JSON + validate
   │             │
   │             ├── Task 4  Axis + region band + ITU row  (view+theme stores) ── render the ruler
   │             │      │
   │             │      ├── Task 5  Markers + LOD filtering (selection store)
   │             │      │      │
   │             │      │      ├── Task 6  Dock shell + Inspector (provenance)
   │             │      │      │      └── Task 9  License filter + amateur eligibility
   │             │      │      │      └── Task 10 Sources & provenance modal
   │             │      │      └── Task 8  Layer toggles + counts
   │             │      └── Task 7  Zoom + pan → semantic zoom (HIGH RISK)
   │             │             └── Task 11 Deep-link URL round-trip
   │             │             └── Task 13 Mobile / touch / responsive
   │             └── Task 12 FCC proxy endpoint + cache + snapshot fallback
   │                    └── Task 14 Full ELF→gamma curation + annotations (Open Q #1)
   │
   └── Task 15 a11y pass · Task 16 e2e suite · Task 17 Netlify deploy + CI + drift-check
```

Implementation order follows this graph top-to-bottom. Task 7 (zoom) is the highest-risk
integration and is scheduled as early as its dependencies allow so it fails fast.

---

## Task List

### Phase 1 — Foundation

## Task 1: Scaffold SvelteKit project + tooling

**Description:** Initialize the SvelteKit + Vite + TypeScript project with the structure,
commands, and config from SPEC.md (§Project Structure, §Commands). Wire the package scripts,
strict TS, adapter-netlify, Vitest, Playwright, lint/format, and the code-visibility tooling
hooks (dependency-cruiser config). No app logic yet — just a project that builds and serves a
blank page.

**Acceptance criteria:**

- [ ] `package.json` exists with all scripts from SPEC §Commands (`dev`, `build`, `preview`,
      `check`, `test`, `test:e2e`, `lint`, `format`, `data:validate`, `graph`).
- [ ] TypeScript `strict: true`; `@sveltejs/adapter-netlify` configured; `netlify.toml` present.
- [ ] Directory skeleton matches SPEC §Project Structure (`src/lib/{spectrum,data,state,components}`, `data/`, `scripts/sync/`, `tests/`, `e2e/`).
- [ ] `app.css` seeded with the prototype's CSS custom properties (light + dark `:root`).

**Verification:**

- [ ] `npm run dev` serves a page; `npm run build` succeeds; `npm run check` is clean.
- [ ] `npm run lint` and `npm run format` run without error.

**Dependencies:** None
**Files likely touched:** `package.json`, `svelte.config.js`, `vite.config.ts`,
`tsconfig.json`, `netlify.toml`, `.dependency-cruiser.cjs`, `src/app.css`, `src/routes/+page.svelte`
**Estimated scope:** M

---

## Task 2: Pure spectrum math module

**Description:** Implement the pure, DOM-free math in `src/lib/spectrum/`: the `FreqDomain`
type and `logPos`/inverse, the zoom-transform ↔ visible-domain mapping, LOD derivation, and
`fmtFreq` / `fmtLambda` formatters (ported from the prototype, extended to the full
~3 Hz→10²⁴ Hz range). This is the most reused, most testable code — build and prove it first.

**Acceptance criteria:**

- [ ] `logPos(hz, domain)` returns normalized [0,1]; round-trips with its inverse.
- [ ] `fmtFreq` and `fmtLambda` match prototype output across Hz→ZHz / km→fm; an out-of-table value degrades gracefully.
- [ ] LOD derivation maps a zoom level to a `Lod` tier (Regions/ITU/Allocations/Channels).

**Verification:**

- [ ] `npm run test -- spectrum` passes; core `lib` coverage ≥ 90% for this module.

**Dependencies:** Task 1
**Files likely touched:** `src/lib/spectrum/scale.ts`, `src/lib/spectrum/format.ts`,
`src/lib/spectrum/lod.ts`, `tests/spectrum/*.test.ts`
**Estimated scope:** M

---

## Task 3: Data schema, types, loader + seed dataset

**Description:** Define the `Allocation` / `SourceRef` / `LayerId` / `RegionId` / `Lod` /
`LicenseRank` types (SPEC §Code Style), a JSON schema, a typed loader, and the
`data:validate` script enforcing invariants (no overlapping bands within a layer, monotonic
frequencies, valid layer/region/source). Seed `data/allocations/` with a representative
dataset (≈ the prototype's 20 markers, each with a real `source`).

**Acceptance criteria:**

- [ ] Schema + types compile under strict TS; loader returns typed `Allocation[]`.
- [ ] `npm run data:validate` passes on seed data and _fails_ on a deliberately broken fixture (overlap / non-monotonic / bad enum).
- [ ] Every seed allocation carries a `source` provenance ref.

**Verification:**

- [ ] `npm run data:validate` exits 0 on real data; `npm run test -- data` covers invariant checks (incl. negative cases).

**Dependencies:** Task 1 (Task 2 helpful, not required)
**Files likely touched:** `src/lib/data/types.ts`, `src/lib/data/schema/allocation.schema.json`,
`src/lib/data/loader.ts`, `data/allocations/seed.json`, `scripts/data-validate.ts`, `tests/data/*.test.ts`
**Estimated scope:** M

### ✅ Checkpoint: Foundation (after Tasks 1–3)

- [ ] `npm run build`, `npm run check`, `npm run test`, `npm run data:validate` all green.
- [ ] Pure math + data layers are tested in isolation; no UI yet.
- [ ] **Human review before starting Phase 2.**

---

### Phase 2 — The spectrum renders (static)

## Task 4: Axis, region band & ITU row

**Description:** Build the SVG visualization shell: continuous log axis with major/minor
ticks, always-visible region labels (Radio…Gamma), the blended gradient band + glow underlay,
and the ITU band row — all positioned via `logPos`. Introduce the `view` store (center
exponent + zoom, initialized to full-spectrum) and `theme` store. D3 computes the scale;
Svelte renders the SVG; every color from a CSS variable.

**Acceptance criteria:**

- [ ] Full axis renders ~3 Hz→10²⁴ Hz with correct tick labels (and λ-ready tick data).
- [ ] All 7 region labels + 12 ITU bands render at correct positions; region labels always visible.
- [ ] Visual parity with the prototype's plot area (dark theme).
- [ ] The gradient band fades to transparent at **both** ends (low/sub-ELF and high/gamma),
      not just the high end as in the prototype.

**Verification:**

- [ ] `npm run dev` shows the ruler; `npm run check` clean; component unit test asserts tick/region positions.

**Dependencies:** Tasks 2, 3
**Files likely touched:** `src/lib/components/Axis.svelte`, `SpectrumBand.svelte`,
`RegionLabels.svelte`, `src/lib/state/view.ts`, `src/lib/state/theme.ts`, `src/routes/+page.svelte`
**Estimated scope:** M

---

## Task 5: Allocation markers + LOD filtering

**Description:** Render allocation markers (line + dot + label, staggered like the prototype)
positioned by `logPos`, filtered by the current LOD tier (`minLod`). Clicking a marker sets
the `selection` store. Detail emerges as LOD descends.

**Acceptance criteria:**

- [ ] Markers render at correct x-positions; only those with `minLod ≤ current LOD` show.
- [ ] Clicking a marker selects it (visual highlight + selection store updates).
- [ ] Visible-light marker uses the spectral gradient swatch (prototype idiom).

**Verification:**

- [ ] Component test: given a LOD + dataset, the expected marker set renders. `npm run check` clean.

**Dependencies:** Task 4
**Files likely touched:** `src/lib/components/SpectrumBand.svelte` (markers), `Marker.svelte`,
`src/lib/state/selection.ts`, `tests/components/*.test.ts`
**Estimated scope:** M

---

## Task 6: Dock shell + Inspector

**Description:** Build the collapsible bottom dock and the Inspector panel showing the
selected allocation — name, frequency, band/region/note, description, and its **provenance**
(source surfaced). Layer/license/axis sub-panels are placeholders here; filled in Phase 3.

**Acceptance criteria:**

- [ ] Dock opens/collapses; Inspector reflects the current selection reactively.
- [ ] Inspector shows the selected allocation's `source` provenance.
- [ ] Falls back to a sensible default selection when none is set.

**Verification:**

- [ ] `npm run dev` end-to-end: click marker → Inspector updates. `npm run check` clean.

**Dependencies:** Task 5
**Files likely touched:** `src/lib/components/Dock.svelte`, `Inspector.svelte`, `src/routes/+page.svelte`
**Estimated scope:** M

### ✅ Checkpoint: Static explorer (after Tasks 4–6)

- [ ] App visually matches the prototype at a fixed detail level; click-to-inspect works.
- [ ] All tests + typecheck green. **Human review before Phase 3.**

---

### Phase 3 — Interaction & filters

## Task 7: Zoom + pan → semantic zoom ⚠ highest risk

**Description:** Wire `d3-zoom` to the SVG: **scroll = zoom**, **shift+scroll = pan**. The
zoom transform updates the `view` store, the visible domain re-derives, and the LOD tier
changes with zoom depth so detail emerges on descent while region labels stay visible. Target
~60 fps on a mid-tier laptop. **Resolve the Svelte↔D3 DOM-ownership boundary here** (D3 owns
zoom behavior + SVG transforms; Svelte owns chrome).

**Acceptance criteria:**

- [ ] Scroll zooms about the cursor; shift+scroll pans; view store stays the single source of truth.
- [ ] Crossing zoom thresholds changes LOD (markers/bands appear/disappear); region labels persist.
- [ ] No visible jank during continuous zoom on a mid-tier laptop.

**Verification:**

- [ ] e2e (Playwright): scroll changes zoom; shift+scroll pans; LOD label updates. `npm run check` clean.
- [ ] Manual: smooth pan/zoom, no DOM-ownership flicker.

**Dependencies:** Task 4 (markers from Task 5 make it meaningful)
**Files likely touched:** `src/lib/spectrum/zoom.ts`, `src/lib/state/view.ts`,
`src/lib/components/SpectrumBand.svelte`, `e2e/zoom.spec.ts`
**Estimated scope:** M

---

## Task 8: Content-layer toggles + counts

**Description:** Implement the 5 content-layer toggles (consumer, amateur+ISM,
navigation/aviation, gov/satellite, physical science) in the dock; toggling filters visible
markers and updates per-layer counts. Introduce the `layers` store.

**Acceptance criteria:**

- [ ] Five toggles control marker visibility; counts reflect currently-eligible markers.
- [ ] Layer colors come from CSS variables matching the prototype palette.

**Verification:**

- [ ] e2e: toggling a layer adds/removes its markers. Unit test on the filter selector.

**Dependencies:** Task 5, Task 6
**Files likely touched:** `src/lib/components/LayerToggles.svelte`, `src/lib/state/layers.ts`,
`src/lib/spectrum/filter.ts`, `tests/...`, `e2e/layers.spec.ts`
**Estimated scope:** S

---

## Task 9: License filter + amateur eligibility

**Description:** Add the operator-license selector (Unlicensed → Technician → General →
Extra). The Inspector reflects eligibility for amateur allocations, and ham bands render the
sub-band privilege strip keyed to license rank (prototype idiom). Introduce the `license` store.

**Acceptance criteria:**

- [ ] Changing license updates the Inspector's eligibility pill (✓/✗ with required class).
- [ ] Ham allocations show the per-rank sub-band segments correctly.

**Verification:**

- [ ] Unit: license-eligibility logic (all rank × requirement combos). e2e: license change updates Inspector.

**Dependencies:** Task 6
**Files likely touched:** `src/lib/components/LicenseFilter.svelte`, `src/lib/state/license.ts`,
`src/lib/spectrum/license.ts`, `tests/spectrum/license.test.ts`, `e2e/license.spec.ts`
**Estimated scope:** M

---

## Task 10: Axis toggles + theme

**Description:** Add the dock's Axis & scale toggles — scientific notation (10ⁿ) and
wavelength λ (metres) — plus the light/dark theme toggle, all reflecting in the axis ticks and
`:root` CSS variables.

**Acceptance criteria:**

- [ ] Scientific-notation toggle adds 10ⁿ labels; λ toggle adds wavelength rows on ticks.
- [ ] Theme toggle flips `data-theme`; all colors update via CSS variables (no hard-coded hex).

**Verification:**

- [ ] e2e: each toggle changes the rendered axis/theme. `npm run check` clean.

**Dependencies:** Task 4
**Files likely touched:** `src/lib/components/ThemeToggle.svelte`, `AxisOptions.svelte`,
`src/lib/state/theme.ts`, `src/lib/components/Axis.svelte`, `e2e/axis-toggles.spec.ts`
**Estimated scope:** S

---

## Task 11: Sources & provenance modal

**Description:** Build the Sources modal listing every data origin (`SourceRef`) used,
opened from the chrome. Accessible dialog (focus trap, Esc to close).

**Acceptance criteria:**

- [ ] Modal lists all distinct sources referenced by loaded allocations.
- [ ] Opens/closes via button + Esc; focus trapped while open, returned on close.

**Verification:**

- [ ] e2e: open/close round-trip; sources present. a11y: dialog semantics correct.

**Dependencies:** Task 3, Task 6
**Files likely touched:** `src/lib/components/SourcesModal.svelte`, `src/routes/+page.svelte`, `e2e/sources.spec.ts`
**Estimated scope:** S

### ✅ Checkpoint: Full interactive explorer (after Tasks 7–11)

- [ ] Zoom/pan + semantic zoom + all filters + theme + sources work on curated data.
- [ ] All unit + e2e tests green. **Human review before Phase 4.**

---

### Phase 4 — Deep-linking, live data, mobile

## Task 12: Deep-link URL round-trip

**Description:** Serialize view state (center ν, zoom, active layers, license, theme) into the
URL query string and restore it on load — exact round-trip. SvelteKit routing owns the URL;
the stores sync to it.

**Acceptance criteria:**

- [ ] State → URL → reload → identical view; back/forward navigates view history.
- [ ] Malformed/partial query params degrade to safe defaults.

**Verification:**

- [ ] e2e deep-link round-trip (set state, read URL, reload, assert equality). Unit on the (de)serializer.

**Dependencies:** Tasks 7–10
**Files likely touched:** `src/lib/state/url.ts`, `src/routes/+page.svelte`, `tests/state/url.test.ts`, `e2e/deeplink.spec.ts`
**Estimated scope:** M

---

## Task 13: FCC proxy endpoint + snapshot fallback

**Description:** Implement `src/routes/api/fcc/+server.ts` proxying + caching the FCC Spectrum
Dashboard API (225–3700 MHz), sending `FCC_API_KEY` only when present, and falling back to a
committed snapshot when upstream is unavailable. Surface the live slice in the view. Add the
`scripts/sync/` drift-check transform. **Per SPEC §Boundaries, confirm before changing
source/proxy behavior.**

**Acceptance criteria:**

- [ ] Endpoint returns FCC data (cached); with no key / upstream down, serves the committed snapshot.
- [ ] Live 225–3700 MHz slice renders alongside curated data without breaking other regions.
- [ ] No secrets committed; `.env` honored.

**Verification:**

- [ ] Unit/integration: cache hit, upstream-failure fallback path. Manual: live slice appears.

**Dependencies:** Task 3 (data model), Task 5 (rendering)
**Files likely touched:** `src/routes/api/fcc/+server.ts`, `src/lib/data/fcc.ts`,
`data/allocations/fcc-snapshot.json`, `scripts/sync/fcc-drift.ts`, `tests/...`
**Estimated scope:** M

---

## Task 14: Mobile / touch / responsive

**Description:** Make the explorer responsive: pinch-to-zoom, drag-to-pan on touch; the dock
and layout adapt to mobile widths; touch targets ≥ 44×44px.

**Acceptance criteria:**

- [ ] Pinch zooms, drag pans on touch; gestures map to the same `view` store.
- [ ] Dock + plot reflow cleanly at mobile widths; no horizontal overflow.

**Verification:**

- [ ] Playwright mobile viewport: pinch/drag + responsive layout. Manual on a real device or emulation.

**Dependencies:** Task 7
**Files likely touched:** `src/lib/components/Dock.svelte`, `SpectrumBand.svelte`,
`src/lib/spectrum/zoom.ts`, `src/app.css`, `e2e/mobile.spec.ts`
**Estimated scope:** M

### ✅ Checkpoint: Feature-complete (after Tasks 12–14)

- [ ] Deep-link round-trips; live FCC slice + fallback works; mobile usable.
- [ ] All tests green. **Human review before Phase 5.**

---

### Phase 5 — Content, hardening & launch

## Task 15: Full ELF→gamma curation + annotations

**Description:** Expand `data/allocations/` to the full breadth: all 12 ITU radio bands
(ELF→THF) plus IR/Visible/UV/X-ray/Gamma curated **annotations** (phenomena, applications,
named spectral lines), each provenance-backed. **Blocked on Open Question #1** (authoritative
non-radio sources) — resolve sources first.

**Acceptance criteria:**

- [ ] Continuous coverage ~3 Hz→≥10²⁴ Hz; all 12 ITU bands + 5 non-radio regions populated.
- [ ] `npm run data:validate` passes on the full dataset; every entry has a `source`.

**Verification:**

- [ ] `npm run data:validate` 0; spot-check at each LOD that detail emerges across the whole axis.

**Dependencies:** Task 3; **Open Question #1**
**Files likely touched:** `data/allocations/*.json`, possibly `src/lib/data/loader.ts`
**Estimated scope:** L → split per region once sources are known

---

## Task 16: Accessibility pass (WCAG AA)

**Description:** Keyboard navigation for all controls and markers, visible focus, ARIA for the
custom widgets, live-region announcements for view/LOD changes, and WCAG AA contrast in both
themes. Drive against `.claude/references/accessibility-checklist.md`.

**Acceptance criteria:**

- [ ] All interactive elements keyboard-reachable; focus visible; no keyboard traps.
- [ ] Contrast ≥ AA in light + dark; color never the sole information channel.

**Verification:**

- [ ] axe/pa11y clean on key states; Playwright keyboard-nav test; manual screen-reader pass.

**Dependencies:** Tasks 6–11
**Files likely touched:** most `src/lib/components/*.svelte`, `src/app.css`, `e2e/a11y.spec.ts`
**Estimated scope:** M

---

## Task 17: e2e suite consolidation

**Description:** Consolidate/complete the Playwright suite from SPEC §Testing Strategy: zoom +
pan, layer toggles, license filter → inspector eligibility, deep-link round-trip, theme
toggle, sources modal — as a coherent regression suite.

**Acceptance criteria:**

- [ ] All SPEC §Testing-Strategy e2e scenarios covered and passing.
- [ ] Core `lib` coverage ≥ 90%; overall pragmatic.

**Verification:**

- [ ] `npm run test` + `npm run test:e2e` green in CI.

**Dependencies:** Tasks 7–14
**Files likely touched:** `e2e/*.spec.ts`, coverage config
**Estimated scope:** M

---

## Task 18: Netlify deploy + CI + scheduled drift-check

**Description:** GitHub Actions CI (typecheck, unit, e2e, lint, `data:validate`,
dependency-cruiser boundary rules) + Netlify deploy with per-PR previews + the scheduled FCC
drift-check workflow that opens a PR on upstream change. **Per SPEC §Boundaries, confirm
deploy-config changes.**

**Acceptance criteria:**

- [ ] CI runs all gates on PR; merge blocked on failure; dep-cruiser enforces `.svelte`-stays-presentational.
- [ ] Netlify builds with adapter-netlify; per-PR deploy previews work; scheduled drift-check opens a PR on change.

**Verification:**

- [ ] A test PR shows green CI + a working deploy preview. Drift-check dry-run produces a diff PR.

**Dependencies:** Task 1; all features for a meaningful deploy
**Files likely touched:** `.github/workflows/ci.yml`, `.github/workflows/fcc-drift.yml`, `netlify.toml`
**Estimated scope:** M

### ✅ Checkpoint: Launch-ready (after Tasks 15–18)

- [ ] All Success Criteria in SPEC met; live on Netlify with previews; CI green.
- [ ] **Final human review / go-no-go.**

---

## Risks and Mitigations

| Risk                                          | Impact | Mitigation                                                                                                         |
| --------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| Svelte↔D3 DOM-ownership conflict on zoom      | High   | Isolate in Task 7; D3 owns zoom+transforms, Svelte owns chrome; spike early since it's foundational.               |
| 24-decade log scale + zoom precision/perf     | Med    | Work in log-space (domain ≈ 0.5–24, not raw Hz); SVG with sparse markers; perf-check in Task 7.                    |
| Non-radio data sources unresolved (Open Q #1) | Med    | Seed dataset unblocks all rendering/zoom work; full curation (Task 15) isolated and deferred until sources chosen. |
| FCC upstream API unreliable / key-gated       | Med    | Committed snapshot fallback (Task 13); proxy sends key only when present.                                          |
| Semantic-zoom LOD thresholds feel wrong       | Med    | LOD math is pure + unit-tested (Task 2); tune thresholds with manual review at the Phase 3 checkpoint.             |
| Mobile gesture conflicts (pinch vs scroll)    | Low    | Dedicated Task 14 with Playwright mobile-viewport tests.                                                           |
| Scope creep in data breadth                   | Low    | Task 15 explicitly split per region; everything else works on seed data.                                           |

## Open Questions (need human input)

1. **Non-radio data sources (SPEC Open Q #1):** which authoritative references for visible
   spectral lines, X-ray, gamma, and the editorial annotations? Blocks Task 15 only.
2. **LOD tier count & thresholds:** spec says ≥4 (Regions/ITU/Allocations/Channels) — confirm
   the zoom-depth boundaries during the Phase 3 checkpoint.
3. **FCC_API_KEY availability for CI/preview:** is a key provisioned, or do we rely on the
   snapshot in CI? (Affects Task 13 + Task 18.)

## Parallelization Opportunities

- **Sequential (dependency chain):** Tasks 1 → 2 → 3 → 4 → 5 → 6, then 7.
- **Safe to parallelize after Task 6:** Task 8 (layers), Task 9 (license), Task 10 (axis/theme),
  Task 11 (sources) are independent feature slices over the same data/store contracts.
- **Independent track:** Task 13 (FCC proxy) can proceed in parallel with Phase 3 once Task 3 +
  Task 5 land. Task 15 (curation) is pure content — parallel once sources are resolved.
- **Last:** Tasks 16–18 (a11y, e2e consolidation, deploy) gate on features being in place.
