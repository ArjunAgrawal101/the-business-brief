/**
 * Checks every diagram in a real browser, with the site's fonts, on its own
 * page (/diagrams/<id>/): no label may run outside its drawing's frame, and
 * no two labels may sit on top of each other. It looks twice: on a desktop,
 * where the wide drawing shows, and on a 320 pixel phone, where a diagram with
 * a phone layout shows that instead, whose labels must also be 12 pixels or
 * more. Scripts are off, so every state of a switch and every panel of a
 * comparison is drawn. Optionally saves a screenshot of each diagram.
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
const sizes = [
  { name: 'desktop', viewport: { width: 1280, height: 1000 } },
  { name: 'phone', viewport: { width: 320, height: 800 }, isMobile: true, hasTouch: true },
];
const errors = [];
const issues = [];
let ids = [];
let checked = 0;

for (const size of sizes) {
  const ctx = await browser.newContext({ ...size, deviceScaleFactor: 1, reducedMotion: 'reduce', javaScriptEnabled: false });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  if (!ids.length) {
    await page.goto(`${base}/diagrams/`, { waitUntil: 'load' });
    ids = await page.$$eval('.dgl-row[id^="diagram-"]', (rows) => rows.map((r) => r.id.replace('diagram-', '')));
  }
  for (const id of ids) {
    await page.goto(`${base}/diagrams/${id}/`, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    if (out) await (await page.$('figure.dg'))?.screenshot({ path: `${out}/${id}-${size.name}.png` });
    const found = await page.$$eval(
      'figure.dg svg',
      (svgs, phone) => {
        const res = [];
        for (const s of svgs) {
          const frame = s.getBoundingClientRect();
          if (!frame.width || !s.checkVisibility()) continue;
          const k = frame.width / s.viewBox.baseVal.width;
          const labels = [...s.querySelectorAll('text')].filter((t) => (t.textContent ?? '').trim()).map((t) => ({ t: (t.textContent ?? '').slice(0, 40), r: t.getBoundingClientRect(), px: parseFloat(window.getComputedStyle(t).fontSize) * k }));
          for (const { t, r } of labels) if (r.left < frame.left - 1 || r.top < frame.top - 1 || r.right > frame.right + 1 || r.bottom > frame.bottom + 1) res.push(`"${t}" runs outside the frame`);
          for (let i = 0; i < labels.length; i++)
            for (let j = i + 1; j < labels.length; j++) {
              const a = labels[i].r;
              const b = labels[j].r;
              const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
              const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
              if (w > 2 && h > 3 && w * h > 0.12 * Math.min(a.width * a.height, b.width * b.height)) res.push(`"${labels[i].t}" overlaps "${labels[j].t}"`);
            }
          // A drawing made for phones keeps its labels at 12 pixels or more.
          if (phone && s.closest('.dg__view--narrow, .dg__art--panel, .dg__state')) for (const { t, px } of labels) if (px < 11.95) res.push(`"${t}" is ${px.toFixed(1)} px on a phone`);
        }
        return res;
      },
      size.name === 'phone',
    );
    checked += 1;
    for (const f of found) issues.push(`${id} (${size.name}): ${f}`);
  }
  await ctx.close();
}
await browser.close();

console.log(`${ids.length} diagrams checked, on a desktop and on a 320 pixel phone (${checked} pages).`);
for (const line of [...errors, ...issues]) console.log(`  ${line}`);
if (errors.length || issues.length) {
  console.log(`${errors.length + issues.length} problem(s).`);
  process.exit(1);
}
console.log('No label runs outside its frame or overlaps another, and every phone layout keeps its labels at 12 pixels or more.');
