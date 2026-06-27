/**
 * Held operator-license store. Defaults to General — the prototype's default and the class
 * that opens most HF bands. Eligibility/privilege logic lives in `$lib/spectrum/license`.
 */

import { writable } from 'svelte/store';
import type { LicenseRank } from '$lib/data/types';

export const license = writable<LicenseRank>('general');

/** Set the held license class. */
export function setLicense(rank: LicenseRank): void {
	license.set(rank);
}
