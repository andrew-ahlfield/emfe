/**
 * Shared geometry for the plot SVG (user-space coordinates, px). Keeps the axis, band,
 * region labels, the three governance tiers, ITU row, and markers vertically aligned.
 * Presentational only.
 *
 * Vertical stack, top → bottom (SPEC §The three tiers):
 *   application markers (labels + dots/bars on the gradient)   ← recognizable uses, top tier
 *   region labels + the continuous spectrum gradient band      ← the physical reference
 *   assignment lane (pins + labels)                            ← specific designated frequencies
 *   allocation substrate ribbon                                ← gap-free service-category bands
 *   ITU band row + frequency axis                              ← the ruler and its coarse context
 */
export const PLOT = {
	/** Total SVG height. */
	height: 328,
	/** Top of the marker stagger area. */
	markerTop: 0,
	/** Baseline for the always-visible region labels, just above the band. */
	regionLabelY: 100,
	/** The continuous gradient band (application markers ride on its mid-line). */
	bandY: 118,
	bandH: 58,
	/** Assignment lane — specific designated frequencies (Marine Ch 16, 121.5 MHz, …). */
	assignY: 184,
	assignH: 14,
	/** Baseline for an assignment's label, between its pin strip and the substrate. */
	assignLabelY: 208,
	/** Allocation substrate ribbon — the gap-free §2.106 service-category bands. */
	substrateY: 216,
	substrateH: 28,
	/** ITU band row. */
	ituY: 252,
	ituH: 14,
	/** Axis baseline (ticks + labels hang below). */
	axisY: 274
} as const;
