# EM Frequency Explorer

**From lightning to gamma rays.**
More than twenty orders of magnitude on a single logarithmic ruler. Everything we
broadcast, navigate by, cook with, and see falls somewhere along this line.

EM Frequency Explorer (`emfe`) is an interactive, zoomable explorer for the
electromagnetic spectrum — the "make the static NTIA/FCC frequency allocation
poster actually fun to explore" idea, taken end to end from below ELF (lightning,
the magnetosphere) through radio, visible light, UV, X-ray, and gamma.

See [SPEC.md](SPEC.md) for the full specification.

## The idea

A single continuous **log-frequency axis** with **semantic zoom**:

- Zoomed all the way out — the seven great regions: Radio · Microwave ·
  Infrared · Visible · Ultraviolet · X-ray · Gamma.
- Zoom into Radio — it subdivides into the ITU bands: VLF · LF · MF · HF ·
  VHF · UHF · SHF · EHF.
- Zoom further — real allocations appear: AM/FM/TV broadcast, WiFi 2.4/5/6E,
  cellular 3G/4G/5G, GPS, ADS-B, marine VHF, the amateur (ham) bands, ISM
  433/915 MHz, and more.

Region labels are always visible; detail emerges as you descend.

## Layers

Toggleable filters let you focus on what you care about:

- **Consumer / everyday** — AM/FM/TV, WiFi, Bluetooth, cellular
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

Allocation data is sourced from authoritative references (FCC Table of
Frequency Allocations, ARRL / Part 97 amateur band plan) and kept current via
a scheduled sync, so the atlas stays in step with reality and every change
shows up as a reviewable diff.

## Status

Early development. Building toward a live deployment.

## Copyright

Copyright © 2026 Andrew Ahlfield. All rights reserved.
