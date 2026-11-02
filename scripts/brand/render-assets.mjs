/**
 * Renders the brand assets from the Arjun Agrawal monogram's vector master
 * (public/brand/creator/arjun-agrawal-monogram.svg), unchanged in shape,
 * proportion and colour: the SVG favicon, the PNG favicons and app icons,
 * and the social card. Run with `npm run brand` after changing the master.
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const pub = join(root, 'public');
const brand = join(pub, 'brand');
const master = readFileSync(join(brand, 'creator', 'arjun-agrawal-monogram.svg'), 'utf8');
const font = (file) => `data:font/woff2;base64,${readFileSync(join(pub, 'fonts', file)).toString('base64')}`;

const NAVY = '#0B1A33';
const IVORY = '#F6F1E7';
const IVORY_MARK = '#F4EFE4';
const GOLD = '#B39350';
const GOLD_LIGHT = '#C9A866';
const SLATE = '#566173';

// The monogram's two paths and viewBox, read from the master so nothing is redrawn.
const viewBox = /viewBox="([^"]+)"/.exec(master)[1];
const paths = [...master.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);
if (paths.length !== 2) throw new Error(`Expected the monogram's two paths, found ${paths.length}`);
const [vx, vy, vw, vh] = viewBox.split(/\s+/).map(Number);

/** The monogram as an SVG of a given height; reversed uses the brand's own ivory and light gold. */
function mark(height, { reversed = false } = {}) {
  const width = (height * vw) / vh;
  const [a, b] = reversed ? [IVORY_MARK, GOLD_LIGHT] : [NAVY, GOLD];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width.toFixed(1)}" height="${height}"><path fill-rule="evenodd" fill="${a}" d="${paths[0]}"/><path fill-rule="evenodd" fill="${b}" d="${paths[1]}"/></svg>`;
}

/** A square tile with the monogram centred: navy with the reversed mark. `scale` is the mark's width as a share of the tile. */
function tile(size, { scale = 0.72, radius = 0, background = NAVY, reversed = true } = {}) {
  const w = size * scale;
  const h = (w * vh) / vw;
  const tx = (size - w) / 2;
  const ty = (size - h) / 2;
  const [a, b] = reversed ? [IVORY_MARK, GOLD_LIGHT] : [NAVY, GOLD];
  const k = w / vw;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${background}"/><g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${k.toFixed(5)}) translate(${-vx} ${-vy})"><path fill-rule="evenodd" fill="${a}" d="${paths[0]}"/><path fill-rule="evenodd" fill="${b}" d="${paths[1]}"/></g></svg>`;
}

const FONTS = `
@font-face { font-family: 'Inter'; src: url('${font('inter-latin-wght-normal.woff2')}') format('woff2'); font-weight: 100 900; }
@font-face { font-family: 'Source Serif 4'; src: url('${font('source-serif-4-latin-opsz-normal.woff2')}') format('woff2'); font-weight: 200 900; }
@font-face { font-family: 'Source Serif 4'; font-style: italic; src: url('${font('source-serif-4-latin-wght-italic.woff2')}') format('woff2'); font-weight: 200 900; }
@font-face { font-family: 'Cinzel'; src: url('${font('cinzel-latin-600-normal.woff2')}') format('woff2'); font-weight: 600; }
`;

const page = (w, h, body) => `<!doctype html><html><head><meta charset="utf-8"><style>
${FONTS}
html, body { margin: 0; width: ${w}px; height: ${h}px; background: transparent; overflow: hidden; }
svg { display: block; }
</style></head><body>${body}</body></html>`;

// The social card: the brand, the promise and what the platform holds.
const card = `<div style="box-sizing:border-box;width:1200px;height:630px;padding:56px 72px 52px;display:grid;grid-template-rows:auto 1fr auto;background:${IVORY};border-top:12px solid ${NAVY};position:relative;overflow:hidden">
  <svg viewBox="0 0 1200 630" width="1200" height="630" style="position:absolute;inset:0" aria-hidden="true">
    <g fill="none" stroke="${GOLD}" stroke-width="1.4" opacity="0.55">
      <path d="M910 520 L1140 330"/><path d="M910 470 L1140 400"/><path d="M910 470 L1140 470" stroke-dasharray="6 6"/>
    </g>
    <circle cx="1031" cy="433" r="6" fill="${GOLD}" opacity="0.85"/>
    <g stroke="#ddd3bd" stroke-width="1"><path d="M910 320V520M910 520H1140"/></g>
  </svg>
  <div style="display:flex;align-items:center;gap:20px;position:relative">
    ${mark(74)}
    <div style="display:grid;gap:6px;padding-left:20px;border-left:1.5px solid ${GOLD}">
      <span style="font:600 19px Cinzel;letter-spacing:0.16em;color:${SLATE}">ARJUN AGRAWAL</span>
      <span style="font:600 30px Cinzel;letter-spacing:0.06em;color:${NAVY}">THE BUSINESS BRIEF</span>
    </div>
  </div>
  <div style="align-self:center;position:relative;max-width:780px">
    <div style="font:600 64px/1.06 'Source Serif 4';color:${NAVY};letter-spacing:-0.01em">Understand business. <span style="font-style:italic;color:#8a6b2a">Think strategically.</span> Make better decisions.</div>
  </div>
  <div style="display:grid;gap:10px;position:relative;font:500 19px Inter;color:${SLATE}">
    <span style="font:600 15px Inter;letter-spacing:0.16em;color:#76591f">STRATEGY. LEADERSHIP. DECISIONS.</span>
    <span>IB DP Business Management: topics, mindmaps, glossary, diagrams and the Assessment Centre</span>
  </div>
</div>`;

const jobs = [
  { out: join(pub, 'favicon-32.png'), w: 32, h: 32, html: page(32, 32, tile(32, { scale: 0.86, radius: 6 })) },
  { out: join(pub, 'favicon-48.png'), w: 48, h: 48, html: page(48, 48, tile(48, { scale: 0.84, radius: 9 })) },
  { out: join(pub, 'apple-touch-icon.png'), w: 180, h: 180, html: page(180, 180, tile(180, { scale: 0.7 })) },
  { out: join(brand, 'icon-192.png'), w: 192, h: 192, html: page(192, 192, tile(192, { scale: 0.7 })) },
  { out: join(brand, 'icon-512.png'), w: 512, h: 512, html: page(512, 512, tile(512, { scale: 0.7 })) },
  // Maskable: the mark inside the central safe zone (a circle of 80% of the width).
  { out: join(brand, 'icon-maskable-512.png'), w: 512, h: 512, html: page(512, 512, tile(512, { scale: 0.56 })) },
  { out: join(brand, 'social-card.png'), w: 1200, h: 630, html: page(1200, 630, card) },
];

/* ---------- Print templates: editable SVG, A4 width (794 px at 96 dpi) ---------- */
const monogramAt = (x, y, h, reversed = false) => {
  const k = h / vh;
  const [a, b] = reversed ? [IVORY_MARK, GOLD_LIGHT] : [NAVY, GOLD];
  return `<g transform="translate(${x} ${y}) scale(${k.toFixed(5)}) translate(${-vx} ${-vy})"><path fill-rule="evenodd" fill="${a}" d="${paths[0]}"/><path fill-rule="evenodd" fill="${b}" d="${paths[1]}"/></g>`;
};
const CINZEL = "Cinzel, 'Source Serif 4', Georgia, serif";
const SERIF = "'Source Serif 4', Georgia, serif";
const SANS = 'Inter, Arial, sans-serif';
const templates = {
  'document-header.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 72" width="794" height="72">
  <title>Arjun Agrawal | The Business Brief: document header (A4 width)</title>
  <rect width="794" height="72" fill="${IVORY}"/>
  <rect width="794" height="4" fill="${NAVY}"/>
  ${monogramAt(40, 20, 32)}
  <line x1="92" y1="22" x2="92" y2="54" stroke="${GOLD}" stroke-width="1"/>
  <text x="104" y="34" font-family="${CINZEL}" font-size="9.5" font-weight="600" letter-spacing="1.6" fill="${SLATE}">ARJUN AGRAWAL</text>
  <text x="104" y="51" font-family="${CINZEL}" font-size="13" font-weight="600" letter-spacing="0.8" fill="${NAVY}">THE BUSINESS BRIEF</text>
  <text x="754" y="44" text-anchor="end" font-family="${SANS}" font-size="10" font-weight="600" letter-spacing="1.4" fill="#76591f">STRATEGY. LEADERSHIP. DECISIONS.</text>
</svg>
`,
  'document-footer.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 40" width="794" height="40">
  <title>Arjun Agrawal | The Business Brief: document footer (A4 width)</title>
  <rect width="794" height="40" fill="${IVORY}"/>
  <line x1="40" y1="8" x2="754" y2="8" stroke="#ddd3bd" stroke-width="1"/>
  <text x="40" y="26" font-family="${SANS}" font-size="9" fill="${SLATE}">Arjun Agrawal | The Business Brief. Original teaching material, not an IB publication. Organizations in the cases are fictional.</text>
  <text x="754" y="26" text-anchor="end" font-family="${SANS}" font-size="9" font-weight="600" fill="${NAVY}">Page 1</text>
</svg>
`,
  'resource-cover.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="794" height="1123">
  <title>Arjun Agrawal | The Business Brief: resource cover (A4)</title>
  <rect width="794" height="1123" fill="${NAVY}"/>
  <rect x="36" y="36" width="722" height="1051" fill="none" stroke="${GOLD_LIGHT}" stroke-opacity="0.5"/>
  ${monogramAt(76, 84, 54, true)}
  <line x1="166" y1="88" x2="166" y2="134" stroke="${GOLD_LIGHT}" stroke-width="1"/>
  <text x="182" y="106" font-family="${CINZEL}" font-size="14" font-weight="600" letter-spacing="2.4" fill="#d9d3c4">ARJUN AGRAWAL</text>
  <text x="182" y="130" font-family="${CINZEL}" font-size="20" font-weight="600" letter-spacing="1.2" fill="${IVORY_MARK}">THE BUSINESS BRIEF</text>
  <text x="76" y="430" font-family="${SANS}" font-size="14" font-weight="700" letter-spacing="3" fill="${GOLD_LIGHT}">RESOURCE TYPE</text>
  <text x="76" y="500" font-family="${SERIF}" font-size="54" font-weight="600" fill="${IVORY_MARK}">Title of the resource</text>
  <text x="76" y="552" font-family="${SERIF}" font-size="22" font-style="italic" fill="#d9d3c4">A one-line description of what it helps the reader do</text>
  <line x1="76" y1="900" x2="718" y2="900" stroke="${GOLD_LIGHT}" stroke-opacity="0.6"/>
  <text x="76" y="940" font-family="${SANS}" font-size="13" font-weight="600" letter-spacing="1" fill="#d9d3c4">IB DP Business Management · Unit or subtopic · SL and HL</text>
  <text x="76" y="972" font-family="${SANS}" font-size="12" font-weight="600" letter-spacing="2.4" fill="${GOLD_LIGHT}">KNOWLEDGE. INSIGHT. IMPACT.</text>
  <text x="76" y="1040" font-family="${SANS}" font-size="11" fill="#aeb8c8">Original teaching material, not an IB publication.</text>
</svg>
`,
};
mkdirSync(join(brand, 'templates'), { recursive: true });
for (const [name, body] of Object.entries(templates)) writeFileSync(join(brand, 'templates', name), body);
jobs.push({ out: join(brand, 'templates', 'resource-cover-preview.png'), w: 397, h: 562, html: page(397, 562, templates['resource-cover.svg'].replace('width="794" height="1123"', 'width="397" height="562"')) });

// The SVG favicon: the same tile, kept small and self-contained.
writeFileSync(join(pub, 'favicon.svg'), `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Arjun Agrawal | The Business Brief. The AA monogram from public/brand/creator/arjun-agrawal-monogram.svg, unchanged, on navy. Written by scripts/brand/render-assets.mjs. -->\n${tile(64, { scale: 0.84, radius: 12 }).replace('<svg ', '<svg role="img" aria-label="Arjun Agrawal | The Business Brief" ')}\n`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ deviceScaleFactor: 1 });
const p = await ctx.newPage();
for (const job of jobs) {
  await p.setViewportSize({ width: job.w, height: job.h });
  await p.setContent(job.html, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  mkdirSync(dirname(job.out), { recursive: true });
  writeFileSync(job.out, await p.screenshot({ type: 'png', omitBackground: true, clip: { x: 0, y: 0, width: job.w, height: job.h } }));
  console.log('wrote', job.out.replace(root + '/', ''));
}
await browser.close();
