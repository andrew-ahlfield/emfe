/**
 * Shared geometry for the plot SVG (user-space coordinates, px). Keeps the axis, band,
 * region labels, the three governance tiers, ITU row, and markers vertically aligned.
 * Presentational only.
 *
 * Vertical stack, top → bottom (SPEC §The three tiers):
 *   application markers (labels + dots/bars on the gradient)   ← recognizable uses, top tier
 *   region labels + the continuous spectrum gradient band      ← the physical reference, and the
 *     assignment tier now rides *on* this band: carrier holdings as translucent bars over their
 *     superset application band, designated single frequencies as ticks through it
 *   allocation substrate ribbon                                ← gap-free service-category bands
 *   ITU band row + frequency axis                              ← the ruler and its coarse context
 */
export const PLOT = {
	/** Total SVG height. */
	height: 292,
	/** Top of the marker stagger area. */
	markerTop: 0,
	/** Baseline for the always-visible region labels, just above the band. */
	regionLabelY: 100,
	/** The continuous gradient band (application markers ride on its mid-line). */
	bandY: 118,
	bandH: 58,
	/** Designated single frequencies (guard / calling): a tick through the band, label just below. */
	desigLabelY: 188,
	/** Allocation substrate ribbon — the gap-free §2.106 service-category bands. A shallow recessed
	 *  floor (half its former height) sitting just under the band. */
	substrateY: 196,
	substrateH: 14,
	/** ITU band row. */
	ituY: 216,
	ituH: 14,
	/** Axis baseline (ticks + labels hang below). */
	axisY: 238
} as const;
