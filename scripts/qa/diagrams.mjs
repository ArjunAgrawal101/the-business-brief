/**
 * Checks every diagram on /diagrams/ in a real browser, with the site's fonts:
 * no label may run outside its diagram's frame, and no two labels may sit on
 * top of each other. Optionally saves a screenshot of each diagram.
 *
 *   npm run build && npx astro preview --port 4321
 *   node scripts/qa/diagrams.mjs http://127.0.0.1:4321 [screenshot-folder]
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'http://127.0.0.1:4321';
const out = process.argv[3];
if (out) mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 860, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
await page.addInitScript(() => {
  try {
    localStorage.setItem('bb:intro-seen', 'qa');
  } catch {
    /* no storage: the opening does not play under reduced motion anyway */
  }
});
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${base}/diagrams/`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const ids = await page.$$eval('figure.dg', (fs) => fs.map((f) => f.id.replace('diagram-', '')));
if (out) for (const id of ids) await (await page.$(`#diagram-${id} .dg__art`))?.screenshot({ path: `${out}/${id}.png` });

const issues = await page.$$eval('figure.dg svg', (svgs) => {
  const res = [];
  for (const s of svgs) {
    const id = s.closest('figure')?.id ?? '?';
    const frame = s.getBoundingClientRect();
    const labels = [...s.querySelectorAll('text')].map((t) => ({ t: (t.textContent ?? '').slice(0, 40), r: t.getBoundingClientRect() }));
    for (const { t, r } of labels) if (r.left < frame.left - 1 || r.top < frame.top - 1 || r.right > frame.right + 1 || r.bottom > frame.bottom + 1) res.push(`${id}: "${t}" runs outside the frame`);
    for (let i = 0; i < labels.length; i++)
      for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i].r;
        const b = labels[j].r;
        const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (w > 2 && h > 3 && w * h > 0.12 * Math.min(a.width * a.height, b.width * b.height)) res.push(`${id}: "${labels[i].t}" overlaps "${labels[j].t}"`);
      }
  }
  return res;
});
await browser.close();

console.log(`${ids.length} diagrams checked.`);
for (const line of [...errors, ...issues]) console.log(`  ${line}`);
if (errors.length || issues.length) {
  console.log(`${errors.length + issues.length} problem(s).`);
  process.exit(1);
}
console.log('No label runs outside its frame or overlaps another.');
