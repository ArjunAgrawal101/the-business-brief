/**
 * BCG portfolio matrix. Each product's relative market share (its share
 * divided by the largest rival's) and the growth of its market place it as a
 * star, question mark, cash cow or dog; the area of its circle shows its
 * revenue. The guide names the Boston Consulting Group matrix as a toolkit
 * tool for SL and HL (p. 14). Where the line between high and low growth goes
 * is a judgement, so the reader sets it.
 */
import { esc } from '../markup';
import { fmtNumber, round } from '../format';
import { type Check, count, andList, fileSlug, ident, list, nextId, num, numOrNull, obj, orDash, str, textDoc, textSection, toCsv } from './common';
import { C, placeLabel, r1, svgDoc, txt } from './svg';
import { button, chartRegion, checksHtml, field, tableRegion } from './ui';

export interface BcgProduct {
  id: string;
  name: string;
  /** The product's share of its market, per cent. */
  share: number | null;
  /** The share of the largest rival in that market, per cent. */
  rival: number | null;
  /** Growth of the market, per cent a year. */
  growth: number | null;
  revenue: number | null;
}

export interface BcgState {
  business: string;
  currency: string;
  unit: string;
  /** The market growth, per cent a year, that divides high from low. */
  growthLine: number;
  products: BcgProduct[];
}

export type Category = 'star' | 'question' | 'cow' | 'dog';

export const CATEGORY: Record<Category, { name: string; plural: string; where: string; tone: { line: string; wash: string; text: string } }> = {
  star: { name: 'Star', plural: 'Stars', where: 'high share of a fast-growing market', tone: { line: C.gold, wash: C.goldWash, text: C.goldText } },
  question: { name: 'Question mark', plural: 'Question marks', where: 'low share of a fast-growing market', tone: { line: C.ink2, wash: '#e4e9f2', text: C.ink2 } },
  cow: { name: 'Cash cow', plural: 'Cash cows', where: 'high share of a slow-growing market', tone: { line: C.green, wash: C.greenWash, text: C.greenText } },
  dog: { name: 'Dog', plural: 'Dogs', where: 'low share of a slow-growing market', tone: { line: C.slate, wash: C.sunk, text: C.slate } },
};

const CAT_ORDER: Category[] = ['star', 'question', 'cow', 'dog'];
export const LIMITS = { products: 12 };

/* ---------- Reading saved work ---------- */

export function normalize(raw: unknown): BcgState {
  const r = obj(raw);
  const used = new Set<string>();
  return {
    business: str(r.business, 120),
    currency: str(r.currency, 4, '€') || '€',
    unit: str(r.unit, 3, 'm'),
    growthLine: num(r.growthLine, -20, 100, 5),
    products: list(r.products, LIMITS.products).map((p) => {
      const x = obj(p);
      return {
        id: ident(x.id, used, 'p'),
        name: str(x.name, 80),
        share: numOrNull(x.share, 0, 100),
        rival: numOrNull(x.rival, 0, 100),
        growth: numOrNull(x.growth, -100, 1000),
        revenue: numOrNull(x.revenue, 0, 1e9),
      };
    }),
  };
}

export function blank(): BcgState {
  return { business: '', currency: '€', unit: 'm', growthLine: 5, products: [newProduct({ products: [] })] };
}

export function newProduct(s: Pick<BcgState, 'products'>): BcgProduct {
  return { id: nextId('p', s.products.map((p) => p.id)), name: '', share: null, rival: null, growth: null, revenue: null };
}

/* ---------- The model ---------- */

/** Problems with one product's figures, by field, or an empty object when they can be plotted. */
export function productErrors(p: BcgProduct): Partial<Record<'name' | 'share' | 'rival' | 'growth' | 'revenue', string>> {
  const e: Partial<Record<'name' | 'share' | 'rival' | 'growth' | 'revenue', string>> = {};
  if (!p.name.trim()) e.name = 'Name the product.';
  if (p.share === null) e.share = 'Enter its market share as a percentage.';
  else if (p.share <= 0 || p.share > 100) e.share = 'A market share is above 0% and at most 100%.';
  if (p.rival === null) e.rival = "Enter the largest rival's share.";
  else if (p.rival <= 0 || p.rival > 100) e.rival = "The largest rival's share is above 0% and at most 100%.";
  else if (p.share !== null && p.share + p.rival > 100) e.rival = 'The two shares together cannot exceed 100%.';
  if (p.growth === null) e.growth = 'Enter the growth of its market, per cent a year.';
  else if (p.growth <= -100) e.growth = 'A market cannot shrink by 100% or more in a year.';
  if (p.revenue === null) e.revenue = 'Enter its revenue.';
  else if (p.revenue < 0) e.revenue = 'Revenue cannot be negative.';
  return e;
}

export interface Placed {
  p: BcgProduct;
  relative: number;
  category: Category;
  /** Share of the portfolio's revenue, per cent. */
  revenueShare: number;
}

export const relativeShare = (share: number, rival: number) => share / rival;

export function categoryOf(relative: number, growth: number, line: number): Category {
  const high = round(relative, 6) >= 1;
  const fast = growth >= line;
  return fast ? (high ? 'star' : 'question') : high ? 'cow' : 'dog';
}

export function place(s: BcgState): Placed[] {
  const ok = s.products.filter((p) => !Object.keys(productErrors(p)).length);
  const total = ok.reduce((n, p) => n + (p.revenue ?? 0), 0);
  return ok.map((p) => {
    const relative = relativeShare(p.share as number, p.rival as number);
    return { p, relative, category: categoryOf(relative, p.growth as number, s.growthLine), revenueShare: total > 0 ? ((p.revenue as number) / total) * 100 : 0 };
  });
}

const pct = (n: number) => `${fmtNumber(n, 0)}%`;
const names = (xs: Placed[]) => andList(xs.map((x) => x.p.name.trim()));
const sumShare = (xs: Placed[]) => xs.reduce((n, x) => n + x.revenueShare, 0);

/** Portfolio guidance: what the shape of the portfolio suggests, sentence by sentence. */
export function guidance(s: BcgState): string[] {
  const all = place(s);
  if (!all.length) return ['Add products with complete figures to see the portfolio.'];
  const by = (c: Category) => all.filter((x) => x.category === c);
  const [stars, qms, cows, dogs] = CAT_ORDER.map(by) as [Placed[], Placed[], Placed[], Placed[]];
  const out: string[] = [];
  out.push(
    `${count(all.length, true)} product${all.length === 1 ? '' : 's'}: ${andList(CAT_ORDER.filter((c) => by(c).length).map((c) => `${count(by(c).length)} ${(by(c).length === 1 ? CATEGORY[c].name : CATEGORY[c].plural).toLowerCase()}`))}. By revenue, ${andList(CAT_ORDER.filter((c) => by(c).length).map((c) => `${CATEGORY[c].plural.toLowerCase()} ${pct(sumShare(by(c)))}`))}.`,
  );
  if (!cows.length) out.push('There is no cash cow, so nothing in the portfolio is likely to generate the surplus cash that stars and question marks need. Growth would have to be funded by borrowing, new capital or retained profit from elsewhere.');
  else {
    const shrinking = cows.filter((x) => (x.p.growth as number) < 0);
    out.push(
      `${names(cows)} ${cows.length === 1 ? 'is the cash cow' : 'are the cash cows'}, earning ${pct(sumShare(cows))} of revenue. The usual advice is to hold ${cows.length === 1 ? 'it' : 'them'}, spend little on growth, and use the cash to fund the stars and question marks.${
        shrinking.length ? ` ${names(shrinking)} ${shrinking.length === 1 ? 'is' : 'are'} in a shrinking market (${andList(shrinking.map((x) => `${fmtNumber(x.p.growth as number, 1)}%`))} a year), so this cash will fall: the portfolio needs a successor.` : ''
      }`,
    );
  }
  if (stars.length) out.push(`${names(stars)} ${stars.length === 1 ? 'is a star' : 'are stars'}: a leading share of a fast-growing market, which usually takes heavy investment to defend. As the market slows, a star that keeps its lead becomes the next cash cow.`);
  if (qms.length === 1) out.push(`${names(qms)} is a question mark, earning ${pct(sumShare(qms))} of revenue. Decide: invest to build its share towards the lead, or withdraw before it absorbs more cash.`);
  if (qms.length > 1) out.push(`${count(qms.length, true)} question marks compete for cash (${names(qms)}). Few businesses can fund them all: back those with a realistic path to a leading share.`);
  if (dogs.length) out.push(`${names(dogs)} ${dogs.length === 1 ? 'is a dog' : 'are dogs'}, earning ${pct(sumShare(dogs))} of revenue${dogs.length > 1 ? ' between them' : ''}. Keep a dog only if it covers its costs or supports the rest of the range; otherwise consider dropping or selling it.`);
  if (!stars.length && !qms.length) out.push('Nothing is in a fast-growing market, so the portfolio is ageing. Look for products to develop or markets to enter before the cash cows decline.');
  const top = [...all].sort((a, b) => b.revenueShare - a.revenueShare)[0];
  if (top && top.revenueShare > 50 && all.length > 1) out.push(`${top.p.name.trim()} earns ${pct(top.revenueShare)} of revenue: the business depends heavily on one product.`);
  if (cows.length && (stars.length || qms.length)) out.push('In outline the portfolio is balanced: cash from the cows can fund the products that may replace them. It stays balanced only while the cows keep earning and the stars keep their lead.');
  return out;
}

export function checks(s: BcgState): Check[] {
  const out: Check[] = [];
  const bad = s.products.filter((p) => Object.keys(productErrors(p)).length);
  if (bad.length) out.push({ level: 'error', text: `${bad.length === 1 ? 'One product is' : `${count(bad.length, true)} products are`} left off the chart until ${bad.length === 1 ? 'its' : 'their'} figures are complete: ${andList(bad.map((p) => p.name.trim() || 'an unnamed product'))}.` });
  const placed = place(s);
  if (placed.length === 1) out.push({ level: 'info', text: 'A portfolio of one product says little: the matrix is for comparing products.' });
  const near = placed.filter((x) => Math.abs((x.p.growth as number) - s.growthLine) <= 1);
  if (near.length) out.push({ level: 'info', text: `${names(near)} ${near.length === 1 ? 'sits' : 'sit'} within a point of the growth line (${fmtNumber(s.growthLine, 1)}%). Moving the line would change ${near.length === 1 ? 'its' : 'their'} label, so do not lean on it.` });
  const tied = placed.filter((x) => Math.abs(x.relative - 1) < 0.1);
  if (tied.length) out.push({ level: 'info', text: `${names(tied)} ${tied.length === 1 ? 'is' : 'are'} level with the largest rival (relative share close to 1): the label could flip with a small change in share.` });
  return out;
}

export function headline(s: BcgState): string {
  const all = place(s);
  if (!all.length) return 'No products with complete figures yet.';
  return `${count(all.length, true)} products: ${andList(CAT_ORDER.filter((c) => all.some((x) => x.category === c)).map((c) => `${count(all.filter((x) => x.category === c).length)} ${(all.filter((x) => x.category === c).length === 1 ? CATEGORY[c].name : CATEGORY[c].plural).toLowerCase()}`))}; cash cows earn ${pct(sumShare(all.filter((x) => x.category === 'cow')))} of revenue.`;
}

/* ---------- The chart ---------- */

export function money(v: number, s: Pick<BcgState, 'currency' | 'unit'>): string {
  const d = Number.isInteger(round(v, 2)) ? 0 : Number.isInteger(round(v * 10, 2)) ? 1 : 2;
  return `${s.currency}${fmtNumber(v, d)}${s.unit}`;
}

export function bcgSvg(s: BcgState, id: string): string {
  const W = 640;
  const H = 470;
  const L = 64;
  const R = 22;
  const T = 26;
  const B = 62;
  const pw = W - L - R;
  const ph = H - T - B;
  const all = place(s);
  // Relative share on a log scale, symmetric about 1, high share on the left.
  const span = Math.max(1, ...all.map((x) => Math.abs(Math.log10(x.relative)) + 0.15));
  const xOf = (v: number) => L + ((span - Math.log10(Math.min(10 ** span, Math.max(10 ** -span, v)))) / (2 * span)) * pw;
  const gs = all.map((x) => x.p.growth as number);
  const lo = Math.min(-5, Math.floor((Math.min(s.growthLine, ...gs) - 3) / 5) * 5);
  const hi = Math.max(s.growthLine + 10, Math.ceil((Math.max(s.growthLine, ...gs) + 4) / 5) * 5);
  const yOf = (g: number) => T + ((hi - g) / (hi - lo)) * ph;
  const p: string[] = [];
  const mx = xOf(1);
  const my = yOf(s.growthLine);
  // Quadrant washes and names.
  const quads: Array<[Category, number, number, number, number, 'start' | 'end', number, number]> = [
    ['star', L, T, mx - L, my - T, 'start', L + 10, T + 18],
    ['question', mx, T, L + pw - mx, my - T, 'end', L + pw - 10, T + 18],
    ['cow', L, my, mx - L, T + ph - my, 'start', L + 10, T + ph - 10],
    ['dog', mx, my, L + pw - mx, T + ph - my, 'end', L + pw - 10, T + ph - 10],
  ];
  for (const [c, x, y, w, h, anchor, tx, ty] of quads) {
    if (w > 0 && h > 0) p.push(`<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" fill="${CATEGORY[c].tone.wash}" fill-opacity="0.55"/>`);
    p.push(txt(tx, ty, CATEGORY[c].plural.toUpperCase(), { anchor, size: 11, weight: 700, fill: CATEGORY[c].tone.text }));
  }
  p.push(`<rect x="${L}" y="${T}" width="${pw}" height="${ph}" fill="none" stroke="${C.ink}" stroke-width="1.25"/>`);
  // Grid ticks.
  for (const v of [10, 5, 2, 1, 0.5, 0.2, 0.1].filter((v) => Math.abs(Math.log10(v)) <= span + 1e-9)) {
    const x = xOf(v);
    p.push(`<line x1="${r1(x)}" y1="${T + ph}" x2="${r1(x)}" y2="${T + ph + 5}" stroke="${C.ink}"/>`);
    p.push(txt(x, T + ph + 18, v >= 1 ? `${fmtNumber(v)}×` : `${fmtNumber(v, 1)}×`, { anchor: 'middle', size: 11, fill: C.slate }));
  }
  const step = hi - lo > 40 ? 10 : 5;
  for (let g = Math.ceil(lo / step) * step; g <= hi; g += step) {
    const y = yOf(g);
    p.push(`<line x1="${L - 5}" y1="${r1(y)}" x2="${L}" y2="${r1(y)}" stroke="${C.ink}"/>`);
    p.push(txt(L - 8, y + 4, `${fmtNumber(g)}%`, { anchor: 'end', size: 11, fill: C.slate }));
  }
  // The dividing lines.
  p.push(`<line x1="${r1(mx)}" y1="${T}" x2="${r1(mx)}" y2="${T + ph}" stroke="${C.ink}" stroke-width="1" stroke-dasharray="5 4"/>`);
  p.push(`<line x1="${L}" y1="${r1(my)}" x2="${L + pw}" y2="${r1(my)}" stroke="${C.ink}" stroke-width="1" stroke-dasharray="5 4"/>`);
  p.push(txt(L + pw - 4, my - 6, `growth line ${fmtNumber(s.growthLine, 1)}%`, { anchor: 'end', size: 10.5, fill: C.slate, italic: true }));
  p.push(txt(L + pw / 2, H - 14, 'Relative market share (log scale, high on the left)', { anchor: 'middle', size: 12, weight: 600, fill: C.ink }));
  p.push(txt(16, T + ph / 2, 'Market growth, % a year', { anchor: 'middle', size: 12, weight: 600, fill: C.ink, rotate: -90 }));
  // Circles, largest first so small ones stay visible; area proportional to revenue.
  const maxRev = Math.max(0, ...all.map((x) => x.p.revenue as number));
  const rOf = (v: number) => (maxRev > 0 ? Math.max(4, 38 * Math.sqrt(v / maxRev)) : 4);
  const taken: Array<{ x: number; y: number; w: number; h: number }> = all.map((x) => {
    const r = rOf(x.p.revenue as number);
    return { x: xOf(x.relative) - r, y: yOf(x.p.growth as number) - r, w: 2 * r, h: 2 * r };
  });
  const sorted = [...all].sort((a, b) => (b.p.revenue as number) - (a.p.revenue as number));
  for (const x of sorted) {
    const cx = xOf(x.relative);
    const cy = yOf(x.p.growth as number);
    const r = rOf(x.p.revenue as number);
    const t = CATEGORY[x.category].tone;
    p.push(`<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r)}" fill="${t.wash}" fill-opacity="0.9" stroke="${t.line}" stroke-width="2"/>`);
    p.push(`<circle cx="${r1(cx)}" cy="${r1(cy)}" r="2" fill="${t.line}"/>`);
  }
  for (const x of all) {
    const cx = xOf(x.relative);
    const cy = yOf(x.p.growth as number);
    const r = rOf(x.p.revenue as number);
    const label = `${x.p.name.trim()} ${money(x.p.revenue as number, s)}`;
    const at = placeLabel(cx, cy, label, r, { x: L + 2, y: T + 2, w: pw - 4, h: ph - 4 }, taken, 11.5);
    p.push(txt(at.x, at.y, label, { anchor: at.anchor, size: 11.5, weight: 650, fill: C.ink }));
  }
  const desc = all.length
    ? `BCG matrix for ${s.business.trim() || 'the business'}. ${all.map((x) => `${x.p.name.trim()}: relative market share ${fmtNumber(x.relative, 2)}, market growth ${fmtNumber(x.p.growth as number, 1)}%, revenue ${money(x.p.revenue as number, s)}, a ${CATEGORY[x.category].name.toLowerCase()}`).join('; ')}. The growth line is at ${fmtNumber(s.growthLine, 1)}% and the share line at a relative share of 1.`
    : 'BCG matrix with no products plotted yet.';
  return svgDoc(W, H, id, `BCG matrix: ${s.business.trim() || 'the portfolio'}`, desc, p.join(''));
}

/* ---------- HTML ---------- */

function productRow(p: BcgProduct, n: number, s: BcgState, uid: string): string {
  const id = `${uid}-${p.id}`;
  const e = productErrors(p);
  const nm = p.name.trim() || `product ${n}`;
  return `<li class="sx-row sx-row--plain" data-row="${esc(p.id)}"><div class="sx-row__body">${field({ id: `${id}-name`, k: `products.${p.id}.name`, label: `Product ${n}`, value: p.name, maxlength: 80, error: e.name })}<div class="sx-nums">${field({
    id: `${id}-share`,
    k: `products.${p.id}.share`,
    label: 'Market share',
    labelHtml: `Market share<span class="sr-only"> of ${esc(nm)}</span>`,
    value: p.share,
    numeric: true,
    post: '%',
    error: e.share,
  })}${field({ id: `${id}-rival`, k: `products.${p.id}.rival`, label: "Largest rival's share", labelHtml: `Largest rival's share<span class="sr-only"> in the market for ${esc(nm)}</span>`, value: p.rival, numeric: true, post: '%', error: e.rival })}${field({
    id: `${id}-growth`,
    k: `products.${p.id}.growth`,
    label: 'Market growth a year',
    labelHtml: `Market growth a year<span class="sr-only"> for ${esc(nm)}</span>`,
    value: p.growth,
    numeric: true,
    post: '%',
    error: e.growth,
  })}${field({ id: `${id}-rev`, k: `products.${p.id}.revenue`, label: 'Revenue', labelHtml: `Revenue<span class="sr-only"> of ${esc(nm)}</span>`, value: p.revenue, numeric: true, pre: s.currency, post: s.unit || undefined, error: e.revenue })}</div><div class="sx-row__meta">${button({
    act: 'remove',
    label: 'Remove',
    aria: `Remove product ${n}: ${nm}`,
    data: { id: p.id },
    cls: 'sx-row__remove',
  })}</div></div></li>`;
}

export function editorHtml(s: BcgState, uid: string): string {
  return `<div class="sx-context sx-context--bcg">${field({ id: `${uid}-business`, k: 'business', label: 'Organization', value: s.business, maxlength: 120 })}<div class="sx-nums sx-nums--3">${field({
    id: `${uid}-currency`,
    k: 'currency',
    label: 'Currency symbol',
    value: s.currency,
    maxlength: 4,
  })}${field({ id: `${uid}-unit`, k: 'unit', label: 'Unit', value: s.unit, maxlength: 3, hint: 'm for millions, k for thousands, or blank.' })}${field({
    id: `${uid}-line`,
    k: 'growthLine',
    label: 'Growth line',
    value: s.growthLine,
    numeric: true,
    post: '%',
    hint: 'Market growth at or above this counts as high.',
  })}</div></div><fieldset class="sx-q"><legend>Products</legend><p class="sx-q__prompt">For each product, its share of its own market, the share of the largest rival in that market (the next largest, if the product leads), how fast the market grows and the product's revenue.</p><ol class="sx-rows" role="list">${s.products
    .map((p, i) => productRow(p, i + 1, s, uid))
    .join('')}</ol>${button({ act: 'add', label: 'Add a product', cls: 'sx-add', disabled: s.products.length >= LIMITS.products })}</fieldset>`;
}

export function outputsHtml(s: BcgState, uid: string): string {
  const all = place(s);
  const rows = all
    .map(
      (x) =>
        `<tr><th scope="row">${esc(x.p.name.trim())}</th><td class="n num">${fmtNumber(x.p.share as number, 1)}%</td><td class="n num">${fmtNumber(x.p.rival as number, 1)}%</td><td class="n num"><strong>${fmtNumber(x.relative, 2)}</strong></td><td class="n num">${fmtNumber(x.p.growth as number, 1)}%</td><td class="n num">${esc(money(x.p.revenue as number, s))}</td><td class="n num">${pct(x.revenueShare)}</td><td>${esc(CATEGORY[x.category].name)}</td></tr>`,
    )
    .join('');
  const total = all.reduce((n, x) => n + (x.p.revenue as number), 0);
  const table = all.length
    ? tableRegion(
        'BCG matrix data',
        `<caption class="sr-only">Each product's shares, relative market share, market growth, revenue and place in the matrix</caption><thead><tr><th scope="col">Product</th><th scope="col" class="n">Market share</th><th scope="col" class="n">Largest rival</th><th scope="col" class="n">Relative share</th><th scope="col" class="n">Market growth</th><th scope="col" class="n">Revenue</th><th scope="col" class="n">Share of revenue</th><th scope="col">Category</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><th scope="row">Portfolio</th><td></td><td></td><td></td><td></td><td class="n num"><strong>${esc(money(total, s))}</strong></td><td class="n num">100%</td><td></td></tr></tfoot>`,
      )
    : '';
  return `<div class="sx-out__block"><h4 class="sx-out__h">The portfolio on the matrix</h4>${chartRegion('BCG matrix chart', bcgSvg(s, `${uid}-chart`))}<p class="small muted">Relative share is the product's market share divided by the largest rival's: above 1 means it leads its market. The area of each circle is proportional to revenue (very small products keep a minimum size).</p>${table}</div><div class="sx-out__block"><h4 class="sx-out__h">Portfolio guidance</h4><ul class="sx-guidance" role="list">${guidance(s)
    .map((g) => `<li>${esc(g)}</li>`)
    .join('')}</ul><p class="small muted">The guidance follows the usual reading of the matrix. It is a starting point for judgement: a dog can be worth keeping, and a star can still lose money.</p></div><div class="sx-out__block"><h4 class="sx-out__h">Checks</h4>${checksHtml(checks(s), 'No problems found: every product has complete figures.')}</div>`;
}

/* ---------- Export ---------- */

export function toText(s: BcgState): string {
  const all = place(s);
  return textDoc(`BCG matrix: ${orDash(s.business, 'organization not named')}`, [
    textSection(`Products (growth line ${fmtNumber(s.growthLine, 1)}%; share line at a relative share of 1)`, all.map((x) => `- ${x.p.name.trim()}: ${CATEGORY[x.category].name}. Market share ${fmtNumber(x.p.share as number, 1)}%, largest rival ${fmtNumber(x.p.rival as number, 1)}%, relative share ${fmtNumber(x.relative, 2)}; market growth ${fmtNumber(x.p.growth as number, 1)}%; revenue ${money(x.p.revenue as number, s)} (${pct(x.revenueShare)} of the portfolio).`)),
    textSection('Portfolio guidance', guidance(s).map((g) => `- ${g}`)),
    textSection('Checks', checks(s).map((c) => `- ${c.text}`)),
    'Made with the Strategy Studio, The Business Brief. A model is an aid to judgement, not an answer.',
  ]);
}

export function toCsvText(s: BcgState): string {
  return toCsv([
    ['Product', 'Market share %', 'Largest rival share %', 'Relative market share', 'Market growth %', `Revenue (${s.currency}${s.unit})`, 'Share of revenue %', 'Category'],
    ...place(s).map((x) => [x.p.name.trim(), x.p.share, x.p.rival, round(x.relative, 3), x.p.growth, x.p.revenue, round(x.revenueShare, 1), CATEGORY[x.category].name]),
  ]);
}

export function fileName(s: BcgState): string {
  return `${fileSlug(s.business)}-bcg-matrix`;
}

export function messages(s: BcgState, uid: string): Record<string, { error?: string }> {
  const out: Record<string, { error?: string }> = {};
  for (const p of s.products) {
    const e = productErrors(p);
    for (const k of ['name', 'share', 'rival', 'growth', 'revenue'] as const) out[`${uid}-${p.id}-${k === 'revenue' ? 'rev' : k}`] = { error: e[k] };
  }
  return out;
}

export function problems(s: BcgState): string[] {
  const out: string[] = [];
  s.products.forEach((p) => Object.values(productErrors(p)).forEach((m) => out.push(`${p.id}: ${m}`)));
  const cats = new Set(place(s).map((x) => x.category));
  CAT_ORDER.forEach((c) => cats.has(c) || out.push(`the worked example has no ${CATEGORY[c].name.toLowerCase()}`));
  return out;
}
