// WCAG 2.2 contrast for the colour pairs the design system uses for text and
// for interface outlines. Reads the values from src/styles/tokens.css, so a
// change to a token that breaks contrast fails this check.
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8');
/** A token's value as a hex colour, following var() references. */
const token = (name, seen = new Set()) => {
  if (seen.has(name)) throw new Error(`token --${name} refers to itself`);
  seen.add(name);
  const m = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`token --${name} not found`);
  const v = m[1].trim();
  const ref = v.match(/^var\(--([a-z0-9-]+)\)$/);
  if (ref) return token(ref[1], seen);
  if (!/^#[0-9a-fA-F]{6}$/.test(v)) throw new Error(`token --${name} is not a six-digit hex colour: ${v}`);
  return v;
};
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// [foreground, background, minimum, what it is used for]
const PAIRS = [
  ['text-strong', 'surface-page', 4.5, 'headings and strong text on paper'],
  ['text-body', 'surface-page', 4.5, 'body text on paper'],
  ['text-muted', 'surface-page', 4.5, 'secondary text on paper'],
  ['text-muted', 'surface-sunk', 4.5, 'secondary text on the sunk band'],
  ['text-muted', 'surface-sheet', 4.5, 'secondary text on sheets'],
  ['text-muted', 'surface-cobalt-wash', 4.5, 'secondary text on the cobalt wash'],
  ['green-text', 'surface-right', 4.5, 'the verdict on a right answer'],
  ['signal-text', 'surface-wrong', 4.5, 'the verdict on a wrong answer'],
  ['brass-text', 'surface-partial', 4.5, 'the verdict on an arguable answer'],
  ['text-strong', 'surface-right', 4.5, 'answer text on the right wash'],
  ['cobalt-text', 'surface-page', 4.5, 'links on paper'],
  ['cobalt-text', 'surface-sheet', 4.5, 'links on sheets'],
  ['cobalt-text', 'surface-cobalt-wash', 4.5, 'links and labels on the cobalt wash'],
  ['signal-text', 'surface-page', 4.5, 'errors and losses'],
  ['green-text', 'surface-page', 4.5, 'right answers and profits'],
  ['brass-text', 'surface-page', 4.5, 'arguable answers'],
  ['text-on-ink', 'surface-ink', 4.5, 'text on ink'],
  ['text-on-ink-muted', 'surface-ink', 4.5, 'secondary text on ink'],
  ['bb-brass', 'surface-ink', 4.5, 'brass labels on ink'],
  ['bb-cobalt', 'surface-page', 3, 'cobalt buttons and focus rings against paper'],
  ['rule-control', 'surface-page', 3, 'form control borders'],
  ['bb-ink', 'surface-page', 3, 'ink rules and outlines'],
];
let failed = 0;
for (const [fg, bg, min, use] of PAIRS) {
  const r = ratio(token(fg), token(bg));
  const ok = r >= min;
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${r.toFixed(2).padStart(5)} : 1  (needs ${min})  --${fg} on --${bg}: ${use}`);
}
// White text on the cobalt button.
const btn = ratio('#ffffff', token('bb-cobalt'));
console.log(`${btn >= 4.5 ? 'pass' : 'FAIL'}  ${btn.toFixed(2).padStart(5)} : 1  (needs 4.5)  white on --bb-cobalt: primary button text`);
if (btn < 4.5) failed++;
if (failed) {
  console.error(`${failed} pair(s) below the minimum.`);
  process.exit(1);
}
console.log('All colour pairs meet their minimum.');
