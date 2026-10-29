// Screenshots of the key pages at four widths, for visual review:
// qa-output/screens/<page>-<width>.png (the folder is not committed).
// Serves dist/ itself, so run `npm run build` first.
import { chromium } from '@playwright/test';
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';

const root = new URL('../..', import.meta.url).pathname;
const dist = join(root, 'dist');
const out = join(root, 'qa-output', 'screens');
mkdirSync(out, { recursive: true });

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  let f = join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { 'content-type': TYPES[extname(f)] ?? 'application/octet-stream' });
  createReadStream(f).pipe(res);
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

const PAGES = (process.argv[2] ?? '/,/topics/costs-and-revenues/,/cases/marigold-kitchens/,/decision-room/halden-leadership/,/finance-desk/break-even/,/toolkit/decision-trees/,/exam-desk/practice/,/ib/coverage/').split(',');
const WIDTHS = [1440, 1024, 768, 390];
const browser = await chromium.launch();
try {
  for (const w of WIDTHS) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    for (const p of PAGES) {
      await page.goto(base + p, { waitUntil: 'networkidle' });
      const name = p === '/' ? 'home' : p.replace(/^\/|\/$/g, '').replace(/\//g, '_');
      await page.screenshot({ path: join(out, `${name}-${w}.png`), fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      console.log(`${w}px ${p}${overflow ? '  HORIZONTAL OVERFLOW' : ''}`);
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log(`Screenshots in ${out.replace(root, '')}`);
