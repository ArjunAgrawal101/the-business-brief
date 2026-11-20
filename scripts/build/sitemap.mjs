/**
 * Writes dist/sitemap.xml after the build, from the pages the build actually
 * wrote: every index.html except the redirect stubs and the pages marked
 * noindex (the 404 page, the dashboard and progress pages, which only show
 * what one browser has kept). Listing the output rather than a hand-kept list
 * means a new page can never be left out.
 *
 * The address comes from SITE_URL or, on Vercel, VERCEL_PROJECT_PRODUCTION_URL
 * (the same rule as astro.config.mjs). Without one (a local build) the sitemap
 * is written empty, as before, because a sitemap must use absolute addresses.
 *
 *   node scripts/build/sitemap.mjs
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = new URL('../../dist/', import.meta.url).pathname;
const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const site = process.env.SITE_URL || (host ? `https://${host}` : '');

/** Every page the build wrote that a search engine should list, as a path such as /topics/finance/. */
export function indexablePages(dist = DIST) {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name === 'index.html') {
        const head = readFileSync(p, 'utf8').slice(0, 6000);
        if (/<meta http-equiv="refresh"/i.test(head)) continue;
        if (/<meta name="robots" content="[^"]*noindex/i.test(head)) continue;
        const rel = relative(dist, dir);
        out.push(rel ? `/${rel}/` : '/');
      }
    }
  };
  walk(dist);
  return out.sort();
}

const xmlEscape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const pages = indexablePages();
  const base = site.replace(/\/$/, '');
  const body = site
    ? `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
        .map((p) => `  <url><loc>${xmlEscape(base + encodeURI(p))}</loc></url>`)
        .join('\n')}\n</urlset>\n`
    : '<?xml version="1.0" encoding="UTF-8"?>\n<!-- Set SITE_URL to list the pages. -->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n';
  writeFileSync(join(DIST, 'sitemap.xml'), body);
  console.log(`sitemap.xml: ${site ? pages.length : 0} pages${site ? '' : ' (no site address set)'}`);
}
