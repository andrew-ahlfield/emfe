# Spec: EM Frequency Explorer (`emfe`)

> An interactive, zoomable explorer for the electromagnetic spectrum — from below ELF
> (lightning, the magnetosphere) through radio, microwave, IR, visible light, UV, X-ray,
> and gamma — on a single continuous logarithmic frequency axis.

**Status:** Specify phase (pre-implementation). This is a living document.

---

## Objective

Turn the static NTIA/FCC frequency-allocation poster into something you can actually
_explore_. A single continuous **log-frequency axis** (~24 decades) with **semantic zoom**:
zoom out to the seven great regions; zoom in to ITU bands, then to real allocations
(AM/FM/TV, Wi-Fi, cellular, GPS, ADS-B, the ham bands, ISM, …), down to channels.

- **Who it's for:** technically curious hobbyists, makers, ham-radio operators, students,
  and educators. _Not_ RF engineers needing instrument-grade precision; _not_ a pure lay
  audience with no interest in the underlying physics.
- **What success looks like:** the full spectrum, end to end, on one ruler — explorable,
  filterable by interest, accurate, provenance-backed, deep-linkable, and deployed live.

---

## The three tiers: allocation · assignment · application

The spectrum is governed at three different altitudes, and a chart that wants to be _real_ (not
a novelty poster) has to show all three without conflating them. The federal regulation itself is
organized this way — 47 CFR Part 2, Subpart B is literally titled _"Allocation, Assignment, and
Use of Radio Frequencies."_ We adopt that exact framing as the product's spine:

| Tier            | Question it answers                          | Example                                             | Source                               |
| --------------- | -------------------------------------------- | --------------------------------------------------- | ------------------------------------ |
| **Allocation**  | What is this band legally _for_?             | 88–108 MHz → `BROADCASTING` (primary)               | FCC/NTIA Table of Allocations §2.106 |
| **Assignment**  | Which specific frequencies are _designated_? | 121.5 MHz aircraft emergency; Marine Ch 16 distress | FCC rule parts, channel plans        |
| **Application** | What recognizable thing actually _uses_ it?  | FM radio, Wi-Fi, GPS, ADS-B                         | curated (the existing 134 entries)   |

**Why this matters.** The chart's gaps were an artifact of only ever plotting tier 3
(applications). The **allocation** table has no gaps — every band from 8.3 kHz to 275 GHz is
allocated to one or more of ~30 radio services, usually several stacked (primary in CAPS,
secondary in sentence case). Adding the allocation tier as a continuous **substrate** is what
makes the chart honest: "empty" space becomes "allocated to FIXED/MOBILE, just nothing a
layperson would recognize." Application-first remains the editorial voice; allocation is the
floor it stands on.

### Vertical layout (the staggering)

Overlaps are everywhere, so entries stagger vertically by tier — and the tier order is
meaningful, foundation at the bottom:

```
┌─ application markers ─────────────┐  ← top: recognizable uses (Wi-Fi, GPS) — existing markers
│  region labels + spectrum gradient │  ← the physical reference band (rainbow at visible)
├─ assignment lane ─────────────────┤  ← middle: specific designated frequencies / channels
├─ allocation substrate ribbon ─────┤  ← bottom: gap-free service-category bands, on the ruler
└─ frequency axis ──────────────────┘
```

The allocation substrate sits closest to the axis because it _is_ the ruler's legal meaning.
Each tier has its own LOD behaviour: the substrate coarsens to broad service blocks when zoomed
out and resolves to individual allocations when zoomed in; applications keep their group→leaf
mechanic.

### Control panel

The dock makes the paradigm explicit by mirroring the three tiers left→right:

1. **Application** — the existing content-layer toggles (consumer, amateur, navigation, gov,
   science) + the amateur license filter. _Unchanged._
2. **Allocation** — _new._ Filter the substrate by radio-service category and by
   **Federal vs Non-Federal** (government vs civilian spectrum — a first-class axis the §2.106
   table draws explicitly).
3. **Assignment** — _new._ Toggle the designated-frequency lane.

### Data model & sourcing

- A `tier` discriminator is added to the allocation model; all existing entries default to
  `application` (we keep "application-first" — no aggressive reclassification of curated data).
- The **allocation substrate** is a distinct data kind (`ServiceAllocation`: `lo`, `hi`,
  `federal`, `primary[]`, `secondary[]`, `footnotes[]`) in `data/allocation-table/us-table.json`
  (its own directory so the application loader's `data/allocations/*.json` glob never picks it up).
- Substrate data is **curated from §2.106 and verified against the FCC Online Table PDF**
  (`transition.fcc.gov/oet/spectrum/table/fcctable.pdf`, the column-ruled table — _not_ the wall
  poster). The eCFR API (`…/api/versioner/v1/full/{date}/title-47.xml?part=2&subpart=B`) is the
  canonical machine-readable source for the **footnotes**; the band→service _grid_ only exists in
  the PDF, whose 180-page multi-column / continuation-page layout defeats a clean unattended
  parse — so the grid is authored and cited rather than scraped. A robust automated regeneration
  is future work; correctness today comes from curation, not a fragile transform.
- Provenance stays `fcc-tofa`, now repointed at the canonical eCFR §2.106 citation.

---

## Tech Stack

| Concern             | Choice                                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Framework           | **SvelteKit** + **Vite** + **TypeScript**                                                                                                                          |
| Axis / zoom         | **D3** — `d3-scale` (log), `d3-zoom`, `d3-axis`                                                                                                                    |
| Rendering           | **SVG** (markers are sparse; Canvas reserved only if a future dense layer needs it)                                                                                |
| Styling             | Plain CSS + **CSS custom properties** (theming, per the prototype)                                                                                                 |
| Data (full breadth) | Curated JSON in the repo — the source of truth, ELF→gamma                                                                                                          |
| Data (live slice)   | ~~FCC Spectrum Dashboard API proxy~~ — **dropped**: that API is decommissioned (503; its data was frozen at 2014). Curated JSON is fresher and is the sole source. |
| Tests               | **Vitest** (unit) + **Playwright** (e2e)                                                                                                                           |
| Host                | **Netlify** (`@sveltejs/adapter-netlify`)                                                                                                                          |
| Package manager     | **npm**                                                                                                                                                            |

**Why these:** the heavy lifting (log axis, semantic zoom) is a custom visualization, so we
use D3's low-level modules directly rather than a charting library. Because we work in
**log-space** (domain ≈ 0–24), the ~24-orders-of-magnitude range is _not_ a rendering or
precision problem, and markers are sparse — so SVG wins (keeps per-element hit-testing,
CSS-variable theming, and accessibility). SvelteKit gives a tiny runtime, clean D3
integration (Svelte owns the chrome, D3 owns the SVG — no DOM-ownership fight), routing for
**deep-linkable URLs**, and **server endpoints** to host the FCC proxy without separate
function infra.

### Code-visibility tooling

Chosen partly so the codebase stays legible without reading it line by line:

- **Codemap** — function call graph
- **dependency-cruiser** — module/architecture dependency graph + enforce boundary rules in CI
- **vite-plugin-inspect** / Vite DevTools — live module graph during dev
- **typescript-graph** — Mermaid dep graphs + complexity metrics
- **ikun-svelte-devtools** — Svelte component relationship graph

### Environment

No runtime secrets required. (The `FCC_API_KEY` slot in `.env.example` is now vestigial — the
FCC Spectrum Dashboard API it was for is decommissioned, see below — and can be ignored.)

> **FCC live data — retired.** The "live slice" was to proxy the FCC Spectrum Dashboard API
> (`data.fcc.gov/api/spectrum-view/.../getSpectrumBands`). As of June 2026 that endpoint returns
> a persistent `503`, the entire `data.fcc.gov` API host 301-redirects to a dead `www.fcc.gov`,
> and even its last working (2022) responses were frozen at 2014 data. The curated JSON is
> fresher and more accurate, so the proxy and the scheduled drift-check were dropped. If live
> data is ever wanted, `opendata.fcc.gov` (Socrata ULS license records) is the live successor.

---

## Commands

> Finalized at scaffold; listed here as the intended interface.

```
Dev:           npm run dev          # Vite dev server
Build:         npm run build        # production build (adapter-netlify)
Preview:       npm run preview
Typecheck:     npm run check        # svelte-check
Unit tests:    npm run test         # vitest
E2E tests:     npm run test:e2e     # playwright
Lint:          npm run lint
Format:        npm run format
Validate data: npm run data:validate   # JSON schema + invariants
Dep graph:     npm run graph           # dependency-cruiser → SVG
```

---

## Project Structure

```
emfe/
├── src/
│   ├── lib/
│   │   ├── spectrum/    → pure .ts: log scale, zoom transform, LOD, fmtFreq / fmtLambda
│   │   ├── data/        → loaders, types, schema for allocation data
│   │   ├── state/       → Svelte stores: view (center ν, zoom), layers, license, theme, selection
│   │   └── components/  → presentational .svelte (Axis, SpectrumBand, Dock, Inspector,
│   │                       LayerToggles, LicenseFilter, SourcesModal, ThemeToggle)
│   ├── routes/
│   │   └── +page.svelte     → the explorer  (FCC proxy route dropped — API decommissioned)
│   └── app.css              → CSS custom properties / theme (from the prototype)
├── data/
│   ├── allocations/*.json   → curated source-of-truth data (committed, full breadth)
│   └── schema/              → JSON schema
├── tests/                   → Vitest unit tests
├── e2e/                     → Playwright tests
├── static/
├── .github/workflows/       → CI (lint · check · test · build · e2e)
├── netlify.toml
└── svelte.config.js
```

**Hard rule:** logic lives in plain `.ts` modules under `src/lib`; `.svelte` files stay
presentational. This keeps the code testable, keeps D3 in charge of the SVG, and keeps the
call/dependency graphs legible for the visibility tooling above.

---

## Code Style

```ts
// src/lib/spectrum/scale.ts

/** Normalized [0,1] position of a frequency on the log axis. */
export function logPos(hz: number, d: FreqDomain): number {
	return (Math.log10(hz) - d.minExp) / (d.maxExp - d.minExp);
}

export interface Allocation {
	id: string;
	name: string;
	hz: number; // representative frequency
	band?: [number, number]; // [low, high] in Hz, when it's a range
	layer: LayerId; // 'consumer' | 'amateur' | 'navigation' | 'gov' | 'science'
	region: RegionId; // 'radio' | 'microwave' | 'infrared' | ... | 'gamma'
	minLod: Lod; // detail level at which this first appears
	reqLicense?: LicenseRank;
	note: string;
	source: SourceRef; // provenance — surfaced in the Sources modal
}
```

- TypeScript `strict`; **named exports**; **pure functions** in `lib` (no DOM, no Svelte).
- Files `kebab-case`; components `PascalCase`.
- **Every color** comes from a CSS custom property — never a hard-coded hex in markup.
- Match the prototype's idioms (`fmtFreq`, `fmtLambda`, region/layer palettes).

---

## Testing Strategy

- **Vitest (unit):** scale/position math, frequency + wavelength formatting, LOD filtering,
  license-eligibility logic, and **data-schema validation** (no overlapping bands within a
  layer, monotonic frequencies, valid `layer`/`region`/`source`).
- **Playwright (e2e):** zoom (scroll) + pan (shift+scroll); layer toggles update visible
  markers; license filter changes inspector eligibility; **deep-link round-trip** (URL ↔ view
  state); theme toggle; sources modal open/close.
- **Coverage:** core `lib` ≥ 90%; overall pragmatic.
- **a11y:** keyboard navigation + WCAG AA contrast — see
  `.claude/references/accessibility-checklist.md`.
- **Visual inspection (required):** before shipping any UI change, render the affected
  states in the browser preview and _look_ at them — desktop and mobile, light and dark, and
  at representative zoom levels. Treat overlapping or colliding elements (labels over labels,
  chrome over content, controls crowding the title) as defects, not cosmetics. Iterate on
  layout until there is **deliberate, even spacing** between elements and nothing overlaps;
  prefer integrating floating controls into a container (e.g. the dock) over absolutely
  positioning them over the canvas. Capture a screenshot as evidence.

---

## Boundaries

- **Always:** validate data against the schema before build/commit; run typecheck + unit
  tests before commit; keep region labels persistently visible; record `source` provenance
  for every allocation; keep logic in `.ts` modules.
- **Ask first:** adding dependencies; changing the data schema; changing the FCC
  source/proxy behavior; changing deploy config; introducing a backend or database.
- **Never:** commit secrets/API keys; hand-edit generated/synced data (edit the sync
  transform instead); remove failing tests without approval; vendor the commercial PerCon
  dataset or any third-party proprietary data.

### Workflow

Solo developer, greenfield project — optimize for momentum, not ceremony.

- **Commit straight to `main`.** No feature-branch / PR dance. Keep each commit green
  (typecheck + unit tests + `data:validate` before committing).
- **Versioning:** semantic versioning, 3-part `MAJOR.MINOR.PATCH`.
- **Releases:** every push to production cuts a **true GitHub Release** tagged with the
  current semver (e.g. `gh release create vX.Y.Z`). Bump `package.json` `version` to match.
- **Deploy to prod:** push `main` onto the **`prod` branch** — `git push origin main:prod`.
  Netlify CD watches `prod` and builds/publishes it. Do **not** run `netlify deploy` from the
  CLI; the `prod` branch is the deploy trigger.

**Ship sequence:** bump `package.json` → commit on `main` → `git push origin main` →
`gh release create vX.Y.Z` → `git push origin main:prod`.

---

## Success Criteria

- Continuous log axis from **~3 Hz** (below ELF — lightning/Schumann ≈ 7.83 Hz and
  solar/magnetosphere annotations at the floor) to **≥ 10²⁴ Hz** (gamma); all 12 ITU radio
  bands (ELF→THF) plus IR / Visible / UV / X-ray / Gamma regions rendered.
- **Semantic zoom** with ≥ 4 LOD tiers (Regions → ITU bands → Allocations → Channels);
  region labels always visible; detail emerges on descent; smooth (~60 fps) pan/zoom on a
  mid-tier laptop.
- **Interaction:** scroll = zoom, **shift**+scroll = pan left/right. On touch: pinch to zoom,
  drag to pan; layout and dock are **responsive for mobile**.
- **5 content-layer toggles** (consumer, amateur+ISM, navigation/aviation, gov/satellite,
  physical science) + **amateur license filter** (Unlicensed → Technician → General → Extra).
- **Inspector** shows the selected allocation with provenance; a **Sources & provenance
  modal** lists all data origins.
- **Light/dark theme**; scientific-notation (10ⁿ) and wavelength-λ toggles.
- **Deep-linkable:** the URL query string serializes view state (center ν, zoom, active
  layers, license, theme) and round-trips exactly.
- ~~Live data for 225 MHz–3700 MHz via the cached FCC proxy~~ — dropped (the FCC Spectrum
  Dashboard API is decommissioned). Curated JSON is the single source across the whole spectrum.
- Deployed on **Netlify** with working per-PR deploy previews.
- Keyboard-navigable; **WCAG AA** contrast.

---

## Resolved Decisions

- **Package manager:** npm.
- **Live FCC proxy:** in v1, with a committed snapshot fallback.
- **"Full depth" beyond radio:** confirmed — IR/UV/X-ray/gamma have no formal frequency
  _allocations_, so depth there is curated **annotations** (phenomena, applications, named
  spectral lines).
- **Mobile / touch:** in v1 — pinch-to-zoom, drag-to-pan, responsive layout.
- **Repo:** GitHub repo renamed to `emfe`; the working directory stays `spectrum-atlas`.
- **Geographic scope:** **USA-scoped** for now — allocations follow US regulators (FCC Table
  of Frequency Allocations, FCC Part 97 / ARRL). Physics is universal; other ITU regions later.
- **Brand / style:** headings **Newsreader** (serif); body & UI **Hanken Grotesk** (sans);
  technical readouts **JetBrains Mono** (self-hosted; replaces IBM Plex Mono, which has no
  variable build). Icon set: **Lucide** (`lucide-svelte`). Colors are
  CSS custom properties only (see `src/app.css`). See README §Brand & style guide.
- **Spectrum band rendering:** the continuous gradient fades to transparent at **both** ends
  (below ELF and above gamma) — asymptotically there is always a lower / higher frequency.

## Open Questions

1. **Non-radio data sources** — still to research: which authoritative references for visible
   spectral lines, X-ray, and gamma (and the editorial annotations). Tracked for the Plan phase;
   does not block planning.

```

```
