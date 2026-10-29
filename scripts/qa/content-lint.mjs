// Content rules that no schema can express. Fails (exit 1) on any problem.
//
//   1. No en dash (U+2013) or em dash (U+2014) in any source file or built page.
//   2. No leaked template values in built pages: "undefined", "NaN", "[object Object]".
//   3. No placeholder text: lorem ipsum, TODO, TBD, FIXME, "coming soon".
//   4. No claim that a practice question is an IB or past-paper question.
//   5. The YAML shape checks in yaml-shape.mjs.
//
// Run after `npm run build` to include the built pages; without dist/ it checks the source only.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = new URL('../..', import.meta.url).pathname;
const files = (dir, exts) => {
  const out = [];
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (exts.some((e) => p.endsWith(e))) out.push(p);
    }
  };
  if (existsSync(dir)) walk(dir);
  return out;
};

const problems = [];
const report = (file, line, msg) => problems.push(`${relative(root, file)}${line ? `:${line}` : ''}: ${msg}`);

// 1. Dashes in sources (content, components, pages, docs, scripts) and the README.
const sources = [
  ...files(join(root, 'src'), ['.yaml', '.astro', '.ts', '.css', '.md', '.mjs']),
  ...files(join(root, 'docs'), ['.md']),
  ...files(join(root, 'scripts'), ['.mjs', '.py']),
  ...['README.md', 'CHANGELOG.md', 'CONTRIBUTING.md'].map((f) => join(root, f)).filter(existsSync),
  ...files(root, ['.md']).filter((f) => !f.includes('node_modules') && !f.includes('/dist/') && relative(root, f).indexOf('/') === -1),
];
const DASH = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
for (const f of new Set(sources)) {
  readFileSync(f, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (DASH.test(line)) report(f, i + 1, `en or em dash: ${line.trim().slice(0, 90)}`);
    });
}

// 2 to 4. Built pages, read as text.
const dist = join(root, 'dist');
const pages = files(dist, ['.html']);
const text = (html) =>
  html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
const LEAKS = [/\bundefined\b/, /\bNaN\b/, /\[object Object\]/];
const PLACEHOLDERS = [/lorem ipsum/i, /\bTODO\b/, /\bTBD\b/, /\bFIXME\b/, /coming soon/i];
const FALSE_CLAIMS = [/\b(official|past|real) (IB )?(exam(ination)?|paper) question/i, /\bIB markscheme for this question\b/i];
for (const f of pages) {
  const html = readFileSync(f, 'utf8');
  if (DASH.test(html)) report(f, 0, 'en or em dash in the built page');
  const t = text(html);
  for (const re of LEAKS) if (re.test(t)) report(f, 0, `leaked value ${re} near "${t.slice(Math.max(0, t.search(re) - 40), t.search(re) + 30)}"`);
  for (const re of PLACEHOLDERS) if (re.test(t)) report(f, 0, `placeholder text ${re}`);
  for (const re of FALSE_CLAIMS) if (re.test(t)) report(f, 0, `possible false claim ${re}`);
  if (!/<html lang="en-GB"/.test(html)) report(f, 0, 'missing lang="en-GB"');
  if (!/<title>[^<]{3,}<\/title>/.test(html)) report(f, 0, 'missing title');
  if ((html.match(/<h1[\s>]/g) ?? []).length !== 1) report(f, 0, `has ${(html.match(/<h1[\s>]/g) ?? []).length} h1 elements`);
}

// 5. YAML shape.
try {
  execFileSync(process.execPath, [join(root, 'scripts/qa/yaml-shape.mjs')], { stdio: 'pipe' });
} catch (err) {
  problems.push(String(err.stdout ?? '') + String(err.stderr ?? ''));
}

if (problems.length) {
  console.error(`Content lint: ${problems.length} problem(s)\n${problems.join('\n')}`);
  process.exit(1);
}
console.log(`Content lint: ${new Set(sources).size} source files${pages.length ? ` and ${pages.length} built pages` : ''}, no problems.`);
