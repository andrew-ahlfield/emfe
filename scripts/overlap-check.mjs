/**
 * Overlap harness for the spectrum explorer.
 *
 * Loads the explorer at a battery of (zoom, centerExp) views, screenshots each, and reports
 * any pair of *text* elements inside the plot SVG whose bounding boxes overlap. Used to
 * iterate the LOD / group-up layout to zero visible overlaps.
 *
 *   node scripts/overlap-check.mjs            # all views, dark theme
 *   node scripts/overlap-check.mjs --light    # light theme too
 *
 * Exit code is the total number of overlapping pairs (0 = clean).
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:5180';
const OUT =
	process.env.SHOT_DIR ??
	'/tmp/claude-0/-home-user-emfe/1e364053-4240-5068-a53d-40d7bd2749c0/scratchpad/shots';
mkdirSync(OUT, { recursive: true });

// Views chosen to hit the densest stretches of the spectrum at each LOD tier.
// centerExp is log10(Hz); zoom is linear magnification (1 = whole spectrum, max 64).
const VIEWS = [
	{ name: 'full', z: 1, c: 12 },
	{ name: 'radio-wide', z: 3, c: 7 }, // ELF…VHF
	{ name: 'hf-vhf', z: 8, c: 7.5 }, // crowded HF/VHF ham + broadcast
	{ name: 'vhf-uhf', z: 12, c: 8.3 }, // FM, TV, airband, marine
	{ name: 'microwave', z: 6, c: 9.7 }, // Wi-Fi / cellular / GPS cluster
	{ name: 'wifi-cell', z: 20, c: 9.4 }, // tight: GPS/Wi-Fi/cellular
	{ name: 'ism-24', z: 40, c: 9.39 }, // 2.4 GHz ISM neighbourhood
	{ name: 'light', z: 8, c: 14.6 }, // IR → visible → UV
	{ name: 'high-energy', z: 4, c: 19 }, // X-ray → gamma
	// transition zooms — where families flip between chip and expanded leaves
	{ name: 'trans-2', z: 2, c: 9 },
	{ name: 'trans-4', z: 4, c: 8.5 },
	{ name: 'trans-5', z: 5, c: 9.2 },
	{ name: 'trans-10', z: 10, c: 9.1 },
	{ name: 'trans-16', z: 16, c: 8.2 },
	{ name: 'trans-28', z: 28, c: 9.2 },
	// a zoom sweep through the densest stretch (L-band / GNSS / cellular)
	{ name: 'sweep-3', z: 3, c: 9.3 },
	{ name: 'sweep-7', z: 7, c: 9.3 },
	{ name: 'sweep-14', z: 14, c: 9.15 },
	{ name: 'sweep-50', z: 50, c: 9.2 },
	{ name: 'sweep-64', z: 64, c: 9.1 },
	// uhf cluster (15 members) + edges
	{ name: 'uhf-mid', z: 18, c: 8.75 },
	{ name: 'uhf-edge', z: 9, c: 8.9 }
];

const VIEWPORTS = [
	{ tag: 'desktop', width: 1440, height: 900 },
	{ tag: 'mobile', width: 390, height: 844 }
];

const themes = process.argv.includes('--light') ? ['dark', 'light'] : ['dark'];

/** Bounding-box overlap with a small tolerance so merely-touching edges don't count. */
function overlaps(a, b, tol = 1.0) {
	return (
		a.x + a.w - tol > b.x && b.x + b.w - tol > a.x && a.y + a.h - tol > b.y && b.y + b.h - tol > a.y
	);
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
let totalPairs = 0;
const summary = [];

for (const theme of themes) {
	for (const vp of VIEWPORTS) {
		const ctx = await browser.newContext({
			viewport: { width: vp.width, height: vp.height },
			deviceScaleFactor: 2
		});
		const page = await ctx.newPage();

		for (const v of VIEWS) {
			const t = theme === 'light' ? '&t=light' : '';
			const url = v.z === 1 ? `${BASE}/?${t.slice(1)}` : `${BASE}/?z=${v.z}&c=${v.c}${t}`;
			await page.goto(url, { waitUntil: 'networkidle' });
			await page.waitForSelector('#explorer', { timeout: 10000 });
			await page.waitForTimeout(250); // settle fonts/transitions

			// Collect every rendered text box inside the plot, tagged by role + content.
			const boxes = await page.$$eval('#explorer text', (nodes) =>
				nodes
					.map((n) => {
						const r = n.getBoundingClientRect();
						const cls = n.getAttribute('class') ?? '';
						return {
							text: (n.textContent ?? '').trim(),
							cls,
							mk: n.getAttribute('data-mk') ?? '',
							x: r.x,
							y: r.y,
							w: r.width,
							h: r.height
						};
					})
					.filter((b) => b.w > 0 && b.h > 0 && b.text.length > 0)
			);

			// Pairwise overlap scan.
			const pairs = [];
			for (let i = 0; i < boxes.length; i++) {
				for (let j = i + 1; j < boxes.length; j++) {
					// Skip the two lines of the same label (intentional stacked name + sublabel).
					if (boxes[i].mk && boxes[i].mk === boxes[j].mk) continue;
					if (overlaps(boxes[i], boxes[j])) {
						pairs.push([boxes[i], boxes[j]]);
					}
				}
			}

			const shot = `${OUT}/${theme}-${vp.tag}-${v.name}.png`;
			await page.screenshot({ path: shot, clip: { x: 0, y: 0, width: vp.width, height: 520 } });

			totalPairs += pairs.length;
			const label = `${theme}/${vp.tag}/${v.name}`;
			summary.push({ label, count: pairs.length });
			if (pairs.length) {
				console.log(`\n✗ ${label}: ${pairs.length} overlapping pair(s) [${boxes.length} labels]`);
				for (const [a, b] of pairs.slice(0, 12)) {
					console.log(`    "${a.text}" (${a.cls}) ✕ "${b.text}" (${b.cls})`);
				}
				if (pairs.length > 12) console.log(`    … +${pairs.length - 12} more`);
			} else {
				console.log(`✓ ${label}: clean [${boxes.length} labels]`);
			}
		}
		await ctx.close();
	}
}

await browser.close();

console.log(`\n${'═'.repeat(50)}`);
console.log(`TOTAL overlapping pairs: ${totalPairs}`);
console.log(`Screenshots: ${OUT}`);
process.exit(totalPairs);
