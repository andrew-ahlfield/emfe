# EM Frequency Explorer

**From lightning to gamma rays.** More than twenty orders of magnitude on a
single logarithmic ruler. Everything we broadcast, navigate by, cook with, and
see falls somewhere along this line.

EM Frequency Explorer (`emfe`) is an interactive, zoomable explorer for the
electromagnetic spectrum — the "make the static NTIA/FCC frequency-allocation
poster actually _fun_ to explore" idea, taken end to end from below ELF
(lightning, the magnetosphere) through radio, microwave, infrared, visible
light, UV, X-ray, and gamma.

It's built as an **educational tool** for the technically curious — hobbyists,
makers, ham-radio operators, students, and educators — not as instrument-grade
reference for RF engineers. See [SPEC.md](SPEC.md) for the full specification.

## The idea

A single continuous **log-frequency axis** (~24 decades) with **semantic zoom**:

- Zoomed all the way out — the seven great regions: Radio · Microwave ·
  Infrared · Visible · Ultraviolet · X-ray · Gamma.
- Zoom into Radio — it subdivides into the ITU bands: VLF · LF · MF · HF ·
  VHF · UHF · SHF · EHF.
- Zoom further — real allocations appear: AM/FM/TV broadcast, Wi-Fi 2.4/5/6E,
  cellular 3G/4G/5G, GPS, ADS-B, marine VHF, the amateur (ham) bands, ISM
  433/915 MHz, and more — down to individual channels.

Region labels are always visible; detail emerges as you descend.

## Layers

Toggleable filters let you focus on what you care about:

- **Consumer / everyday** — AM/FM/TV, Wi-Fi, Bluetooth, cellular
- **Ham + ISM / SDR** — amateur bands (with a deep sub-band plan by license
  class), 433/915 MHz, key fobs, garage doors
- **Navigation / aviation** — GPS/GNSS, ADS-B, aviation voice, marine VHF,
  weather satellites
- **Gov / public safety / satellite** — first responders, satellite
  up/downlink, radar
- **Physical science** — visible light in true color, UV (blacklight), IR
  (heat lamps), medical/dental X-ray, and fun annotations (e.g. an MRI's RF
  excitation pulse sits near 64 MHz)

## Data

Allocation data is compiled from authoritative public references — the FCC
Table of Frequency Allocations and the FCC Part 97 / ARRL amateur band plan —
and lives as reviewable JSON under [`data/`](data/). Every change shows up as a
plain diff, so the atlas can stay in step with reality over time.

**USA-scoped for now.** Allocations follow US regulators. The physics (regions,
ITU band nomenclature, wavelengths) is universal, but the specific allocations
are US ones; other ITU regions may come later.

> Spotted something inaccurate or out of date? That's exactly the kind of
> contribution this project needs — see **[Contributing](#contributing)** below.

## Contributing

This is an educational tool that gets better with more eyes on it, and the data
will always need tweaking and updating. Contributions are very welcome —
especially:

- **Data accuracy** — corrections and updates to allocations, with a citation
  to an authoritative source where possible.
- **New allocations or annotations** that make a band more illuminating.
- **Bug fixes and UI/accessibility improvements.**

Open an issue to discuss larger changes, or send a pull request for focused
fixes. Please run the checks below before submitting. By contributing, you agree
that your contributions are licensed under the project's licenses (Apache 2.0
for code, CC BY 4.0 for data) — see [License](#license).

## Develop

Requires Node 20+ and npm.

```bash
npm install      # first time only
npm run dev      # dev server with HMR → http://localhost:5173
```

Build & preview the production bundle:

```bash
npm run build
npm run preview  # → http://localhost:4173
```

Checks (the pre-commit gate / CI):

```bash
npm run check          # svelte-check (types)
npm run lint           # prettier --check + eslint
npm test               # vitest unit tests
npm run test:e2e       # Playwright end-to-end (auto build + preview)
npm run data:validate  # validate the allocation dataset against the schema
```

## Brand & style

Visual identity carried over from the prototype (`moodboards/`):

| Role                                            | Typeface                        |
| ----------------------------------------------- | ------------------------------- |
| Headings                                        | **Newsreader** (serif)          |
| Body / UI                                       | **Hanken Grotesk** (sans-serif) |
| Technical readouts (frequencies, ticks, labels) | **JetBrains Mono**              |

Fonts are self-hosted via [`@fontsource-variable`](https://fontsource.org) (no
external Google Fonts request), imported in
[`src/routes/+layout.svelte`](src/routes/+layout.svelte).

- **Icons** — [Lucide](https://lucide.dev) (`lucide-svelte`).
- **Color** — every color is a CSS custom property in
  [`src/app.css`](src/app.css); never a hard-coded hex in markup. Light + dark
  themes, with region and content-layer palettes defined there.
- **Spectrum band** — the continuous gradient fades to transparent at **both**
  ends (below ELF and above gamma): asymptotically there is always a lower and a
  higher frequency.

## License

Built by **Exagrow Studios** and **Andrew SC Ahlfield**.

This project carries two licenses — one for the software, one for the dataset:

- **Code** — [Apache License 2.0](LICENSE). Commercial use, modification, and
  redistribution are permitted; you must preserve attribution and the
  [`NOTICE`](NOTICE) file, and the license includes an explicit patent grant.
- **Data** — the frequency-allocation dataset under [`data/`](data/) is licensed
  under [Creative Commons Attribution 4.0 International (CC BY 4.0)](data/LICENSE.md).
  Reuse it freely, including commercially, with attribution.

Contributions are accepted under these same terms. You keep the copyright to
your own contributions; submitting them simply licenses them to the project (and
everyone) under the licenses above — no copyright assignment required.

Copyright © 2026 Exagrow Studios and Andrew SC Ahlfield.
