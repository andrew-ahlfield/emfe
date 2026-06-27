/**
 * Held operator-license store. Defaults to Amateur Extra (full privileges) so every amateur
 * band reads as eligible until the user dials the class down. Eligibility/privilege logic
 * lives in `$lib/spectrum/license`.
 */

import { writable } from 'svelte/store';
import type { LicenseRank } from '$lib/data/types';

export const license = writable<LicenseRank>('extra');

/** Set the held license class. */
export function setLicense(rank: LicenseRank): void {
	license.set(rank);
}
