// Checks every internal link and asset in the built site: the target file must
// exist and, for a link with a #fragment, the target page must contain an
// element with that id. External links are listed, not fetched.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const dist = new URL('../../dist/', import.meta.url).pathname;
if (!existsSync(dist)) {
  console.error('No dist/ folder. Run `npm run build` first.');
  process.exit(1);
}
const pages = [];
const walk = (d) => readdirSync(d).forEach((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : f.endsWith('.html') && pages.push(join(d, f))));
walk(dist);

const ids = new Map();
const idsOf = (file) => {
  if (!ids.has(file)) ids.set(file, new Set([...readFileSync(file, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  return ids.get(file);
};
const resolveFile = (path) => {
  const clean = decodeURIComponent(path);
  const p = join(dist, clean);
  if (clean.endsWith('/')) return join(p, 'index.html');
  if (existsSync(p) && statSync(p).isFile()) return p;
  if (existsSync(join(p, 'index.html'))) return join(p, 'index.html');
  return p;
};

const problems = [];
const external = new Set();
let checked = 0;
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const from = '/' + relative(dist, page).replace(/index\.html$/, '');
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(mailto:|tel:|data:|javascript:)/.test(url)) continue;
    if (/^https?:\/\//.test(url)) {
      external.add(url);
      continue;
    }
    checked++;
    const [pathPart, frag] = url.split('#');
    const targetPath = pathPart === '' ? from : pathPart.startsWith('/') ? pathPart : new URL(pathPart, `http://x${from}`).pathname;
    const file = resolveFile(targetPath);
    if (!existsSync(file)) {
      problems.push(`${from}: broken link ${url}`);
      continue;
    }
    if (frag && file.endsWith('.html') && !idsOf(file).has(frag)) problems.push(`${from}: ${url} has no element with id "${frag}"`);
  }
  // Internal links must end with a slash (the site uses trailing slashes).
  for (const m of html.matchAll(/\shref="(\/[^"#?]*)(?:[#?][^"]*)?"/g)) {
    const p = m[1];
    if (!p.endsWith('/') && !/\.[a-z0-9]+$/i.test(p)) problems.push(`${from}: link without a trailing slash: ${p}`);
  }
}

console.log(`Links: ${pages.length} pages, ${checked} internal links and assets checked, ${external.size} external links listed (not fetched).`);
for (const u of [...external].sort()) console.log(`  external: ${u}`);
if (problems.length) {
  console.error(`${problems.length} problem(s):\n${[...new Set(problems)].join('\n')}`);
  process.exit(1);
}
console.log('No broken links.');
