/**
 * Physical colour of light at a given frequency, so an optical marker (a laser, an LED, an
 * emission line) is drawn in the colour it actually *is*, sampled from the spectrum rather than
 * hardcoded. Outside the visible band the value clamps to the nearest edge hue and dims, so a
 * near-IR or near-UV source still reads as deep red / violet instead of going colourless.
 *
 * Pure module: no DOM, no Svelte. Returns CSS `rgb(...)` strings.
 */

const C = 299_792_458; // m/s

/** Wavelength (nm) → sRGB triple, via the classic piecewise approximation (Dan Bruton). */
export function wavelengthToRGB(nm: number): [number, number, number] {
	// Clamp into the visible range; out-of-range sources keep the edge hue (dimmed below).
	const w = Math.max(380, Math.min(780, nm));
	let r = 0;
	let g = 0;
	let b = 0;
	if (w < 440) {
		r = -(w - 440) / (440 - 380);
		b = 1;
	} else if (w < 490) {
		g = (w - 440) / (490 - 440);
		b = 1;
	} else if (w < 510) {
		g = 1;
		b = -(w - 510) / (510 - 490);
	} else if (w < 580) {
		r = (w - 510) / (580 - 510);
		g = 1;
	} else if (w < 645) {
		r = 1;
		g = -(w - 645) / (645 - 580);
	} else {
		r = 1;
	}

	// Intensity rolls off at the spectrum edges; an out-of-range source dims further still.
	let f = 1;
	if (w < 420) f = 0.3 + (0.7 * (w - 380)) / (420 - 380);
	else if (w > 700) f = 0.3 + (0.7 * (780 - w)) / (780 - 700);
	if (nm < 380 || nm > 780) f *= 0.6;

	const gamma = 0.8;
	const ch = (v: number) => Math.round(255 * Math.pow(Math.max(0, v) * f, gamma));
	return [ch(r), ch(g), ch(b)];
}

/** CSS colour of light at frequency `hz` (Hz). */
export function spectralColor(hz: number): string {
	const nm = (C / hz) * 1e9;
	const [r, g, b] = wavelengthToRGB(nm);
	return `rgb(${r}, ${g}, ${b})`;
}
