# EM Frequency Explorer — Task List

Concise checklist. Full detail (acceptance criteria, verification, files) in [plan.md](plan.md).

## Phase 1 — Foundation

- [x] **Task 1** — Scaffold SvelteKit + Vite + TS + tooling + CI skeleton _(M)_ ✅
- [x] **Task 2** — Pure spectrum math: scale/pos, LOD, `fmtFreq`, `fmtLambda` _(M, dep: 1)_ ✅
- [x] **Task 3** — Data schema + types + loader + seed JSON + `data:validate` _(M, dep: 1)_ ✅
- [x] **Checkpoint: Foundation** — build/check/test/data:validate green ✅ · _awaiting human review_

## Phase 2 — Static render

- [x] **Task 4** — Axis + region band + ITU row (view + theme stores) _(M, dep: 2,3)_ ✅
- [x] **Task 5** — Allocation markers + LOD filtering (selection store) _(M, dep: 4)_ ✅
- [x] **Task 6** — Dock shell + Inspector (provenance) _(M, dep: 5)_ ✅
- [x] **Checkpoint: Static explorer** — matches prototype, click-to-inspect ✅

## Phase 3 — Interaction & filters

- [x] **Task 7** — ⚠ Zoom + pan → semantic zoom (HIGH RISK) _(M, dep: 4)_ ✅ _(scroll-zoom about cursor, shift-scroll pan; LOD emerges on descent)_
- [x] **Task 8** — Content-layer toggles + counts _(S, dep: 5,6)_ ✅
- [x] **Task 9** — License filter + amateur eligibility _(M, dep: 6)_ ✅
- [x] **Task 10** — Axis toggles (sci-notation, λ) + theme _(S, dep: 4)_ ✅
- [x] **Task 11** — Sources & provenance modal _(S, dep: 3,6)_ ✅
- [ ] **Checkpoint: Interactive explorer** — zoom + filters + theme + sources · human review

## Phase 4 — Deep-linking, live data, mobile

- [ ] **Task 12** — Deep-link URL round-trip _(M, dep: 7–10)_
- [ ] **Task 13** — FCC proxy endpoint + cache + snapshot fallback _(M, dep: 3,5)_
- [ ] **Task 14** — Mobile / touch / responsive _(M, dep: 7)_
- [ ] **Checkpoint: Feature-complete** — deep-link + live FCC + mobile · human review

## Phase 5 — Content, hardening & launch

- [ ] **Task 15** — Full ELF→gamma curation + annotations _(L, dep: 3 + Open Q #1)_
- [ ] **Task 16** — Accessibility pass (WCAG AA) _(M, dep: 6–11)_
- [ ] **Task 17** — e2e suite consolidation _(M, dep: 7–14)_
- [ ] **Task 18** — Netlify deploy + CI + scheduled drift-check _(M, dep: 1 + all)_
- [ ] **Checkpoint: Launch-ready** — all SPEC success criteria met · final go/no-go

## Resolved questions

- [x] **Q #1** — non-radio sources: treat as a **research task** within Task 15 (not a blocker).
- [x] **Q #2** — LOD thresholds: **iterate as we go** (tune during Phase 3).
- [x] **Q #3** — FCC_API_KEY: **present in `.env`** (used by proxy + CI/preview).
