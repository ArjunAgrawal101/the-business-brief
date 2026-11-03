/**
 * The Financial Laboratory's charts, drawn as SVG strings so that the same
 * function renders the default chart on the server and the reader's chart in
 * the browser. They share the platform's palette (src/lib/charts.ts): cobalt
 * for the figure in focus, grey for context, green and red only where they
 * mean gain and loss, and always with words or position saying the same.
 * Every chart has a title, a description that states the result, a tooltip on
 * each mark, and its figures in a table beside it.
 */
import { CHART_COLOURS, niceStep } from '../charts';
import { bracket, STATUS_WORDS, type CashForecast } from '../cashflow';
import { fmtMoney, fmtNumber } from '../format';
import { esc } from '../markup';
import type { BudgetReport, VarianceRow } from '../budget';

const { INK, COBALT, SLATE, GREEN, SIGNAL, RULE, MUTED } = CHART_COLOURS;
const r1 = (n: number) => Math.round(n * 10) / 10;

function svg(w: number, h: number, id: string, title: string, desc: string, body: string): string {
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${id}-t ${id}-d" class="chart" focusable="false"><title id="${id}-t">${esc(title)}</title><desc id="${id}-d">${esc(desc)}</desc>${body}</svg>`;
}

/** A tooltip for one mark. */
const tip = (text: string) => `<title>${esc(text)}</title>`;

/** A horizontal bar from x0 to x1 with a rounded end away from the baseline at x0. */
function hbar(x0: number, x1: number, y: number, h: number, fill: string, opacity = 1, title = ''): string {
  const left = Math.min(x0, x1);
  const w = Math.abs(x1 - x0);
  if (w < 0.5) return '';
  const r = Math.min(4, w / 2, h / 2);
  const toRight = x1 >= x0;
  const d = toRight
    ? `M${r1(left)} ${r1(y)}H${r1(left + w - r)}Q${r1(left + w)} ${r1(y)} ${r1(left + w)} ${r1(y + r)}V${r1(y + h - r)}Q${r1(left + w)} ${r1(y + h)} ${r1(left + w - r)} ${r1(y + h)}H${r1(left)}Z`
    : `M${r1(left + w)} ${r1(y)}H${r1(left + r)}Q${r1(left)} ${r1(y)} ${r1(left)} ${r1(y + r)}V${r1(y + h - r)}Q${r1(left)} ${r1(y + h)} ${r1(left + r)} ${r1(y + h)}H${r1(left + w)}Z`;
  return `<path d="${d}" fill="${fill}"${opacity < 1 ? ` fill-opacity="${opacity}"` : ''}>${title ? tip(title) : ''}</path>`;
}

/** A vertical bar from the baseline y0 to y1, rounded at the end away from the baseline. */
function vbar(x: number, w: number, y0: number, y1: number, fill: string, opacity = 1, title = ''): string {
  const top = Math.min(y0, y1);
  const h = Math.abs(y1 - y0);
  if (h < 0.5) return '';
  const r = Math.min(4, w / 2, h / 2);
  const up = y1 <= y0;
  const d = up
    ? `M${r1(x)} ${r1(top + h)}V${r1(top + r)}Q${r1(x)} ${r1(top)} ${r1(x + r)} ${r1(top)}H${r1(x + w - r)}Q${r1(x + w)} ${r1(top)} ${r1(x + w)} ${r1(top + r)}V${r1(top + h)}Z`
    : `M${r1(x)} ${r1(top)}V${r1(top + h - r)}Q${r1(x)} ${r1(top + h)} ${r1(x + r)} ${r1(top + h)}H${r1(x + w - r)}Q${r1(x + w)} ${r1(top + h)} ${r1(x + w)} ${r1(top + h - r)}V${r1(top)}Z`;
  return `<path d="${d}" fill="${fill}"${opacity < 1 ? ` fill-opacity="${opacity}"` : ''}>${title ? tip(title) : ''}</path>`;
}

/** A scale from lo to hi, both including zero, in nice steps. */
function scale(lo: number, hi: number, target = 5): { min: number; max: number; step: number } {
  const a = Math.min(0, lo);
  const b = Math.max(0, hi);
  const step = niceStep(b - a || 1, target);
  return { min: Math.floor(a / step) * step, max: Math.ceil(b / step) * step || step, step };
}

/** Compact money for axis ticks: $25k, −$40k, $1.2m. */
function short(v: number, cur: string): string {
  const a = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  if (a >= 1e6) return `${sign}${cur}${fmtNumber(a / 1e6, a % 1e6 === 0 ? 0 : 1)}m`;
  if (a >= 1e4) return `${sign}${cur}${fmtNumber(a / 1e3, a % 1e3 === 0 ? 0 : 1)}k`;
  return `${sign}${cur}${fmtNumber(a)}`;
}

/** A legend of swatches and names, so identity never rests on colour alone. */
function legend(items: Array<{ label: string; colour: string; kind: 'bar' | 'line' | 'dash'; opacity?: number }>, x: number, y: number): string {
  let cx = x;
  return items
    .map((it) => {
      const sw =
        it.kind === 'bar'
          ? `<rect x="${cx}" y="${y - 9}" width="14" height="10" rx="2" fill="${it.colour}"${it.opacity ? ` fill-opacity="${it.opacity}"` : ''}/>`
          : `<line x1="${cx}" y1="${y - 4}" x2="${cx + 16}" y2="${y - 4}" stroke="${it.colour}" stroke-width="2"${it.kind === 'dash' ? ' stroke-dasharray="5 4"' : ''}/>`;
      const text = `<text x="${cx + 21}" y="${y}" class="ch-note" fill="${INK}">${esc(it.label)}</text>`;
      cx += 30 + it.label.length * 6.2;
      return sw + text;
    })
    .join('');
}

const fits = (text: string, width: number, px = 6.4) => text.length * px + 12 <= width;

/* ------------------------------------------------------------------ */
/* Contribution: where the price goes, and what contribution covers    */
/* ------------------------------------------------------------------ */

export function contributionBarsSvg(o: { price: number; variableCost: number; quantity: number; fixedCosts: number; currency: string; unit: string; units: string; id: string }): string {
  const W = 600;
  const H = 238;
  const L = 18;
  const R = 18;
  const BAR = 28;
  const span = W - L - R;
  const m = (v: number) => fmtMoney(v, o.currency, 2);
  const c = o.price - o.variableCost;
  const tc = c * o.quantity;
  const parts: string[] = [];
  const block = (x0: number, x1: number, y: number, fill: string, label: string, title: string, light = false, opacity = 1) => {
    const w = x1 - x0;
    if (w < 0.5) return;
    parts.push(`<rect x="${r1(x0)}" y="${y}" width="${r1(Math.max(0, w - 2))}" height="${BAR}" rx="3" fill="${fill}"${opacity < 1 ? ` fill-opacity="${opacity}"` : ''}>${tip(title)}</rect>`);
    if (fits(label, w)) parts.push(`<text x="${r1(x0 + 8)}" y="${y + BAR / 2 + 4}" class="ch-label fl-on-fill${light ? ' fl-on-fill--dark' : ''}">${esc(label)}</text>`);
    else parts.push(`<text x="${r1(x0 + 2)}" y="${y + BAR + 15}" class="ch-note" fill="${INK}">${esc(label)}</text>`);
  };
  // One unit
  const y1 = 40;
  parts.push(`<text x="${L}" y="${y1 - 12}" class="ch-axis">${esc(`One ${o.unit}: a price of ${m(o.price)}`)}</text>`);
  const s1 = Math.max(o.price, o.variableCost, 0.01);
  const x = (v: number, s: number) => L + (v / s) * span;
  if (c >= 0) {
    block(x(0, s1), x(o.variableCost, s1), y1, SLATE, `Variable cost ${m(o.variableCost)}`, `Variable cost per ${o.unit}: ${m(o.variableCost)}`, true, 0.45);
    block(x(o.variableCost, s1), x(o.price, s1), y1, COBALT, `Contribution ${m(c)}`, `Contribution per ${o.unit}: ${m(c)}`);
  } else {
    block(x(0, s1), x(o.price, s1), y1, SLATE, `Price ${m(o.price)}`, `Selling price: ${m(o.price)}`, true, 0.45);
    block(x(o.price, s1), x(o.variableCost, s1), y1, SIGNAL, `Variable cost exceeds price by ${m(-c)}`, `Negative contribution: ${m(c)}`);
  }
  // All units
  const y2 = 150;
  parts.push(`<text x="${L}" y="${y2 - 12}" class="ch-axis">${esc(`All ${fmtNumber(o.quantity)} ${o.units}: total contribution of ${m(tc)}`)}</text>`);
  const s2 = Math.max(tc, o.fixedCosts, 0.01);
  if (tc >= o.fixedCosts) {
    block(x(0, s2), x(o.fixedCosts, s2), y2, INK, `Covers fixed costs ${fmtMoney(o.fixedCosts, o.currency, 0)}`, `Fixed costs covered: ${m(o.fixedCosts)}`);
    block(x(o.fixedCosts, s2), x(tc, s2), y2, GREEN, `Profit ${m(tc - o.fixedCosts)}`, `Profit: ${m(tc - o.fixedCosts)}`);
  } else {
    if (tc > 0) block(x(0, s2), x(tc, s2), y2, COBALT, `Contribution ${m(tc)}`, `Total contribution: ${m(tc)}`);
    const from = x(Math.max(0, tc), s2);
    const to = x(o.fixedCosts, s2);
    parts.push(`<rect x="${r1(from + 1)}" y="${y2 + 1}" width="${r1(Math.max(0, to - from - 3))}" height="${BAR - 2}" rx="3" fill="none" stroke="${SIGNAL}" stroke-width="1.5" stroke-dasharray="5 3">${tip(`Shortfall against fixed costs: ${m(o.fixedCosts - Math.max(0, tc))}`)}</rect>`);
    const label = `Shortfall ${m(o.fixedCosts - tc)}: a loss`;
    parts.push(fits(label, to - from) ? `<text x="${r1(from + 8)}" y="${y2 + BAR / 2 + 4}" class="ch-label" fill="${INK}">${esc(label)}</text>` : `<text x="${r1(from + 2)}" y="${y2 + BAR + 15}" class="ch-note" fill="${INK}">${esc(label)}</text>`);
  }
  parts.push(`<text x="${L}" y="${H - 8}" class="ch-note" fill="${MUTED}">${esc('Each bar is its own whole: one unit’s price above, the period’s total contribution below.')}</text>`);
  const desc =
    c >= 0
      ? `Each ${o.unit} sells for ${m(o.price)}: ${m(o.variableCost)} pays its variable cost and ${m(c)} is contribution. ${fmtNumber(o.quantity)} ${o.units} contribute ${m(tc)}, which ${tc >= o.fixedCosts ? `covers fixed costs of ${m(o.fixedCosts)} and leaves a profit of ${m(tc - o.fixedCosts)}` : `falls ${m(o.fixedCosts - tc)} short of fixed costs of ${m(o.fixedCosts)}`}.`
      : `Each ${o.unit}'s variable cost of ${m(o.variableCost)} exceeds its price of ${m(o.price)}, so contribution is negative.`;
  return svg(W, H, o.id, `Where each ${o.unit}’s price goes, and what contribution covers`, desc, parts.join(''));
}

/* ------------------------------------------------------------------ */
/* Ratio bars: the ratio in each year                                  */
/* ------------------------------------------------------------------ */

export function ratioBarsSvg(o: { name: string; values: Array<{ label: string; value: number | null; text: string }>; id: string; better: 'higher' | 'lower' | 'depends'; unit?: string }): string {
  const W = 560;
  const rowH = 46;
  const T = 30;
  const L = 112;
  const R = 92;
  const B = 34;
  const H = T + o.values.length * rowH + B;
  const vals = o.values.map((v) => v.value).filter((v): v is number => v !== null && Number.isFinite(v));
  const sc = scale(Math.min(0, ...vals), Math.max(0, ...vals), 4);
  const x = (v: number) => L + ((v - sc.min) / (sc.max - sc.min)) * (W - L - R);
  const parts: string[] = [];
  for (let v = sc.min; v <= sc.max + 1e-9; v += sc.step) {
    parts.push(`<line x1="${r1(x(v))}" y1="${T - 8}" x2="${r1(x(v))}" y2="${H - B}" stroke="${RULE}" stroke-width="1"/>`);
    parts.push(`<text x="${r1(x(v))}" y="${H - B + 17}" text-anchor="middle" class="ch-tick">${esc(`${fmtNumber(v, sc.step < 1 ? (sc.step < 0.1 ? 2 : 1) : 0)}${o.unit ?? ''}`)}</text>`);
  }
  o.values.forEach((v, k) => {
    const y = T + k * rowH + 8;
    const latest = k === o.values.length - 1;
    parts.push(`<text x="${L - 12}" y="${y + 15}" text-anchor="end" class="ch-label" fill="${INK}">${esc(v.label)}</text>`);
    if (v.value === null || !Number.isFinite(v.value)) {
      parts.push(`<text x="${r1(x(0)) + 6}" y="${y + 15}" class="ch-note" fill="${MUTED}">Not defined</text>`);
      return;
    }
    parts.push(hbar(x(0), x(v.value), y, 22, latest ? COBALT : SLATE, latest ? 1 : 0.5, `${v.label}: ${v.text}`));
    const end = x(v.value);
    const right = v.value >= 0;
    parts.push(`<text x="${r1(end + (right ? 8 : -8))}" y="${y + 15}" text-anchor="${right ? 'start' : 'end'}" class="ch-label" fill="${INK}">${esc(v.text)}</text>`);
  });
  parts.push(`<line x1="${r1(x(0))}" y1="${T - 8}" x2="${r1(x(0))}" y2="${H - B}" stroke="${INK}" stroke-width="1.25"/>`);
  const better = o.better === 'higher' ? 'Higher is better, other things equal.' : o.better === 'lower' ? 'Lower is better, other things equal.' : 'Whether higher is better depends on the business.';
  parts.push(`<text x="${L}" y="16" class="ch-note" fill="${MUTED}">${esc(better)}</text>`);
  const desc = `${o.name}: ${o.values.map((v) => `${v.label} ${v.text}`).join('; ')}. ${better}`;
  return svg(W, H, o.id, `${o.name} in each year`, desc, parts.join(''));
}

/* ------------------------------------------------------------------ */
/* Cash: the closing balance as a line, net cash flow as bars          */
/* ------------------------------------------------------------------ */

export function cashLineSvg(f: CashForecast, o: { currency: string; id: string }): string {
  const W = 660;
  const H = 340;
  const L = 92;
  const R = 22;
  const T = 44;
  const B = 40;
  const n = f.months.length;
  const lo = Math.min(...f.closing, ...f.net, -f.limit, 0);
  const hi = Math.max(...f.closing, ...f.net, 0);
  const sc = scale(lo, hi, 6);
  const y = (v: number) => T + ((sc.max - v) / (sc.max - sc.min)) * (H - T - B);
  const band = (W - L - R) / Math.max(1, n);
  const cx = (i: number) => L + band * i + band / 2;
  const bw = Math.min(22, band * 0.42);
  const parts: string[] = [];
  for (let v = sc.min; v <= sc.max + 1e-9; v += sc.step) {
    parts.push(`<line x1="${L}" y1="${r1(y(v))}" x2="${W - R}" y2="${r1(y(v))}" stroke="${RULE}" stroke-width="1"/>`);
    parts.push(`<text x="${L - 8}" y="${r1(y(v)) + 4}" text-anchor="end" class="ch-tick">${esc(bracket(v, 0))}</text>`);
  }
  parts.push(`<text x="14" y="${(T + H - B) / 2}" text-anchor="middle" class="ch-axis" transform="rotate(-90 14 ${(T + H - B) / 2})">${esc(`${o.currency.trim() || 'Money'}, negative in brackets`)}</text>`);
  // Net cash flow, as context.
  f.net.forEach((v, i) => parts.push(vbar(cx(i) - bw / 2, bw, y(0), y(v), SLATE, 0.38, `${f.months[i]}: net cash flow ${fmtMoney(v, o.currency, 2)}`)));
  parts.push(`<line x1="${L}" y1="${r1(y(0))}" x2="${W - R}" y2="${r1(y(0))}" stroke="${INK}" stroke-width="1.25"/>`);
  if (f.limit > 0) {
    parts.push(`<line x1="${L}" y1="${r1(y(-f.limit))}" x2="${W - R}" y2="${r1(y(-f.limit))}" stroke="${SIGNAL}" stroke-width="1.5" stroke-dasharray="7 5"/>`);
    parts.push(`<text x="${W - R - 4}" y="${r1(y(-f.limit)) + 15}" text-anchor="end" class="ch-note" fill="${INK}">${esc(`Overdraft limit ${bracket(-f.limit, 0)}`)}</text>`);
  }
  // Closing balance.
  const path = f.closing.map((v, i) => `${i ? 'L' : 'M'}${r1(cx(i))} ${r1(y(v))}`).join('');
  parts.push(`<path d="${path}" fill="none" stroke="${COBALT}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`);
  f.closing.forEach((v, i) => {
    const st = f.status[i] ?? 'credit';
    parts.push(`<circle cx="${r1(cx(i))}" cy="${r1(y(v))}" r="${st === 'beyond' ? 5.5 : 4.5}" fill="${st === 'beyond' ? SIGNAL : COBALT}" stroke="#fff" stroke-width="2">${tip(`${f.months[i]}: closing balance ${fmtMoney(v, o.currency, 2)}, ${STATUS_WORDS[st].toLowerCase()}`)}</circle>`);
    parts.push(`<text x="${r1(cx(i))}" y="${H - B + 18}" text-anchor="middle" class="ch-tick">${esc((f.months[i] ?? '').slice(0, 3))}</text>`);
  });
  // Label the lowest point and the last.
  const low = f.lowest.month;
  const labelAt = (i: number, text: string) => {
    const v = f.closing[i] ?? 0;
    const above = v >= (f.closing[Math.max(0, i - 1)] ?? v) || v >= 0;
    const anchor = i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
    parts.push(`<text x="${r1(cx(i))}" y="${r1(y(v) + (above ? -12 : 20))}" text-anchor="${anchor}" class="ch-label" fill="${INK}">${esc(text)}</text>`);
  };
  labelAt(low, `Lowest ${bracket(f.closing[low] ?? 0, 0)}`);
  if (n - 1 !== low) labelAt(n - 1, bracket(f.closing[n - 1] ?? 0, 0));
  parts.push(legend([{ label: 'Closing balance', colour: COBALT, kind: 'line' }, { label: 'Net cash flow', colour: SLATE, kind: 'bar', opacity: 0.38 }], L, 22));
  const desc = `${f.months.map((m, i) => `${m}: closing balance ${fmtMoney(f.closing[i] ?? 0, o.currency, 2)}, ${STATUS_WORDS[f.status[i] ?? 'credit'].toLowerCase()}`).join('. ')}. The lowest closing balance is ${fmtMoney(f.lowest.value, o.currency, 2)} in ${f.months[low]}.${f.limit > 0 ? ` Overdraft limit ${fmtMoney(f.limit, o.currency, 0)}.` : ''}`;
  return svg(W, H, o.id, 'Closing balance and net cash flow each month', desc, parts.join(''));
}

/* ------------------------------------------------------------------ */
/* Budget variances: adverse to the left, favourable to the right      */
/* ------------------------------------------------------------------ */

export function varianceBarsSvg(b: BudgetReport, o: { currency: string; id: string }): string {
  const rows: VarianceRow[] = [...b.revenues, ...b.costs];
  const W = 640;
  const rowH = 30;
  const T = 46;
  const L = 196;
  const R = 26;
  const B = 30;
  const H = T + rows.length * rowH + B;
  const maxA = Math.max(1, ...rows.map((r) => r.amount));
  const step = niceStep(maxA, 3);
  const lim = Math.ceil(maxA / step) * step;
  const mid = L + (W - L - R) / 2;
  const x = (v: number) => mid + (v / lim) * ((W - L - R) / 2 - 64);
  const parts: string[] = [];
  parts.push(`<text x="${r1(mid - 10)}" y="18" text-anchor="end" class="ch-axis">← Adverse [A]</text>`);
  parts.push(`<text x="${r1(mid + 10)}" y="18" class="ch-axis">Favourable [F] →</text>`);
  parts.push(`<text x="${r1(mid - 10)}" y="33" text-anchor="end" class="ch-note" fill="${MUTED}">lowers profit</text>`);
  parts.push(`<text x="${r1(mid + 10)}" y="33" class="ch-note" fill="${MUTED}">raises profit</text>`);
  rows.forEach((r, k) => {
    const y = T + k * rowH;
    const yc = y + 6;
    if (k === b.revenues.length && b.revenues.length) parts.push(`<line x1="16" y1="${y - 2}" x2="${W - R}" y2="${y - 2}" stroke="${RULE}" stroke-width="1"/>`);
    const name = r.label.length > 28 ? `${r.label.slice(0, 27)}…` : r.label;
    parts.push(`<text x="${L - 14}" y="${yc + 12}" text-anchor="end" class="ch-label" fill="${INK}">${esc(name)}<tspan class="ch-note" fill="${MUTED}"> ${r.kind === 'revenue' ? 'revenue' : 'cost'}</tspan></text>`);
    const signed = r.mark === 'F' ? r.amount : r.mark === 'A' ? -r.amount : 0;
    const label = r.mark === null ? '0' : `${fmtNumber(r.amount)} [${r.mark}]`;
    if (r.mark !== null) parts.push(hbar(mid, x(signed), yc, 18, r.mark === 'F' ? GREEN : SIGNAL, 0.85, `${r.label}: budget ${fmtNumber(r.budget)}, actual ${fmtNumber(r.actual)}, variance ${label}`));
    const end = x(signed);
    const right = signed >= 0;
    parts.push(`<text x="${r1(end + (right ? 7 : -7))}" y="${yc + 13}" text-anchor="${right ? 'start' : 'end'}" class="ch-note" fill="${INK}">${esc(label)}</text>`);
  });
  parts.push(`<line x1="${r1(mid)}" y1="${T - 4}" x2="${r1(mid)}" y2="${H - B + 4}" stroke="${INK}" stroke-width="1.25"/>`);
  parts.push(`<text x="${r1(mid)}" y="${H - 8}" text-anchor="middle" class="ch-note" fill="${MUTED}">${esc(`Variance in ${o.currency.trim() || 'money'}; the scale runs to ${fmtNumber(lim)} each side`)}</text>`);
  const desc = `${rows.map((r) => `${r.label} (${r.kind}): ${r.mark === null ? 'no variance' : `${fmtNumber(r.amount)} ${r.mark === 'F' ? 'favourable' : 'adverse'}`}`).join('; ')}. Overall, the excess of revenues over costs is ${b.surplus.variance.mark === null ? 'on budget' : `${fmtNumber(b.surplus.variance.amount)} ${b.surplus.variance.mark === 'F' ? 'favourable' : 'adverse'}`}.`;
  return svg(W, H, o.id, 'Budget variances by line', desc, parts.join(''));
}

/* ------------------------------------------------------------------ */
/* Profit or loss: a waterfall in the statement's own order            */
/* ------------------------------------------------------------------ */

export interface WaterfallStep {
  label: string;
  value: number;
  kind: 'total' | 'less';
}

export function waterfallSvg(steps: WaterfallStep[], o: { currency: string; id: string }): string {
  const W = 620;
  const rowH = 27;
  const T = 26;
  const L = 214;
  const R = 92;
  const B = 30;
  const H = T + steps.length * rowH + B;
  // Running level after each step.
  let level = 0;
  const spans = steps.map((st) => {
    if (st.kind === 'total') {
      level = st.value;
      return { from: 0, to: st.value };
    }
    const from = level;
    level = level - st.value;
    return { from, to: level };
  });
  const all = spans.flatMap((s) => [s.from, s.to]);
  const sc = scale(Math.min(...all), Math.max(...all), 5);
  const x = (v: number) => L + ((v - sc.min) / (sc.max - sc.min)) * (W - L - R);
  const parts: string[] = [];
  for (let v = sc.min; v <= sc.max + 1e-9; v += sc.step) {
    parts.push(`<line x1="${r1(x(v))}" y1="${T - 6}" x2="${r1(x(v))}" y2="${H - B}" stroke="${RULE}" stroke-width="1"/>`);
    parts.push(`<text x="${r1(x(v))}" y="${H - B + 17}" text-anchor="middle" class="ch-tick">${esc(short(v, o.currency))}</text>`);
  }
  steps.forEach((st, k) => {
    const y = T + k * rowH;
    const sp = spans[k] ?? { from: 0, to: 0 };
    const total = st.kind === 'total';
    parts.push(`<text x="${L - 12}" y="${y + 15}" text-anchor="end" class="${total ? 'ch-label' : 'ch-note'}" fill="${INK}">${esc(st.label)}</text>`);
    const shown = total ? fmtMoney(st.value, o.currency, 0) : `(${fmtMoney(st.value, o.currency, 0)})`;
    const t = `${st.label}: ${shown}`;
    if (total) parts.push(hbar(x(0), x(st.value), y + 3, 18, st.value < 0 ? SIGNAL : k === 0 ? COBALT : INK, k === 0 ? 1 : 0.88, t));
    else {
      const a = Math.min(sp.from, sp.to);
      const b2 = Math.max(sp.from, sp.to);
      if (b2 - a > 0) parts.push(`<rect x="${r1(x(a))}" y="${y + 3}" width="${r1(Math.max(1, x(b2) - x(a)))}" height="18" rx="2" fill="${SLATE}" fill-opacity="0.35">${tip(t)}</rect>`);
      // A thin connector from the level above.
      parts.push(`<line x1="${r1(x(sp.from))}" y1="${y - 6}" x2="${r1(x(sp.from))}" y2="${y + 3}" stroke="${MUTED}" stroke-width="1"/>`);
    }
    const end = total ? x(st.value) : x(Math.max(sp.from, sp.to));
    const right = total ? st.value >= 0 : true;
    parts.push(`<text x="${r1(end + (right ? 7 : -7))}" y="${y + 16}" text-anchor="${right ? 'start' : 'end'}" class="ch-note" fill="${INK}">${esc(shown)}</text>`);
  });
  parts.push(`<line x1="${r1(x(0))}" y1="${T - 6}" x2="${r1(x(0))}" y2="${H - B}" stroke="${INK}" stroke-width="1.25"/>`);
  parts.push(`<text x="16" y="14" class="ch-note" fill="${MUTED}">${esc('Dark bars: each stage of profit. Light bars: what is deducted between stages.')}</text>`);
  const desc = steps.map((s2) => `${s2.label} ${s2.kind === 'total' ? fmtMoney(s2.value, o.currency, 0) : `less ${fmtMoney(s2.value, o.currency, 0)}`}`).join(', ');
  return svg(W, H, o.id, 'From sales revenue to retained profit', `${desc}.`, parts.join(''));
}

/* ------------------------------------------------------------------ */
/* Investment                                                          */
/* ------------------------------------------------------------------ */

/** The yearly returns, with the average return and the cost spread over the years: the gap is the average profit. */
export function arrBarsSvg(o: { returns: number[]; capitalCost: number; currency: string; id: string }): string {
  const W = 600;
  const H = 320;
  const L = 70;
  const R = 150;
  const T = 30;
  const B = 40;
  const n = o.returns.length;
  const avg = o.returns.reduce((a, b) => a + b, 0) / Math.max(1, n);
  const costPerYear = o.capitalCost / Math.max(1, n);
  const sc = scale(Math.min(...o.returns, 0), Math.max(...o.returns, avg, costPerYear, 0), 5);
  const y = (v: number) => T + ((sc.max - v) / (sc.max - sc.min)) * (H - T - B);
  const band = (W - L - R) / Math.max(1, n);
  const bw = Math.min(24, band * 0.5);
  const parts: string[] = [];
  for (let v = sc.min; v <= sc.max + 1e-9; v += sc.step) {
    parts.push(`<line x1="${L}" y1="${r1(y(v))}" x2="${W - R}" y2="${r1(y(v))}" stroke="${RULE}" stroke-width="1"/>`);
    parts.push(`<text x="${L - 8}" y="${r1(y(v)) + 4}" text-anchor="end" class="ch-tick">${esc(short(v, o.currency))}</text>`);
  }
  o.returns.forEach((v, i) => {
    const cx = L + band * i + band / 2;
    parts.push(vbar(cx - bw / 2, bw, y(0), y(v), COBALT, 1, `Year ${i + 1}: net cash flow ${fmtMoney(v, o.currency, 0)}`));
    parts.push(`<text x="${r1(cx)}" y="${H - B + 18}" text-anchor="middle" class="ch-tick">${i + 1}</text>`);
  });
  parts.push(`<line x1="${L}" y1="${r1(y(0))}" x2="${W - R}" y2="${r1(y(0))}" stroke="${INK}" stroke-width="1.25"/>`);
  // The gap between the two reference lines is the average profit a year.
  const ya = y(avg);
  const yc = y(costPerYear);
  if (Math.abs(ya - yc) > 1) parts.push(`<rect x="${L}" y="${r1(Math.min(ya, yc))}" width="${W - R - L}" height="${r1(Math.abs(ya - yc))}" fill="${avg >= costPerYear ? GREEN : SIGNAL}" fill-opacity="0.1"/>`);
  parts.push(`<line x1="${L}" y1="${r1(ya)}" x2="${W - R}" y2="${r1(ya)}" stroke="${INK}" stroke-width="1.5" stroke-dasharray="6 4"/>`);
  parts.push(`<line x1="${L}" y1="${r1(yc)}" x2="${W - R}" y2="${r1(yc)}" stroke="${SLATE}" stroke-width="1.5" stroke-dasharray="2 3"/>`);
  const top = Math.min(ya, yc);
  const bottom = Math.max(ya, yc);
  const avgTop = ya <= yc;
  parts.push(`<text x="${W - R + 8}" y="${r1((avgTop ? top : bottom) + 4)}" class="ch-note" fill="${INK}">${esc(`Average return ${fmtMoney(avg, o.currency, 0)}`)}</text>`);
  parts.push(`<text x="${W - R + 8}" y="${r1((avgTop ? bottom : top) + (Math.abs(ya - yc) < 16 ? (avgTop ? 14 : -10) : 4))}" class="ch-note" fill="${INK}">${esc(`Cost a year ${fmtMoney(costPerYear, o.currency, 0)}`)}</text>`);
  parts.push(`<text x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle" class="ch-axis">Year</text>`);
  parts.push(legend([{ label: 'Net cash flow each year', colour: COBALT, kind: 'bar' }], L, 18));
  const desc = `Net cash flow by year: ${o.returns.map((v, i) => `year ${i + 1} ${fmtMoney(v, o.currency, 0)}`).join(', ')}. The average return is ${fmtMoney(avg, o.currency, 0)} a year and the capital cost spread over ${n} years is ${fmtMoney(costPerYear, o.currency, 0)} a year, so the average profit is ${fmtMoney(avg - costPerYear, o.currency, 0)} a year.`;
  return svg(W, H, o.id, 'Yearly returns against the cost spread over the years', desc, parts.join(''));
}

/** Each year's return beside its present value. */
export function discountedSvg(o: { returns: number[]; presentValues: number[]; rate: number; currency: string; id: string }): string {
  const W = 600;
  const H = 320;
  const L = 70;
  const R = 20;
  const T = 44;
  const B = 40;
  const n = o.returns.length;
  const sc = scale(Math.min(...o.returns, ...o.presentValues, 0), Math.max(...o.returns, ...o.presentValues, 0), 5);
  const y = (v: number) => T + ((sc.max - v) / (sc.max - sc.min)) * (H - T - B);
  const band = (W - L - R) / Math.max(1, n);
  const bw = Math.min(22, band * 0.3);
  const parts: string[] = [];
  for (let v = sc.min; v <= sc.max + 1e-9; v += sc.step) {
    parts.push(`<line x1="${L}" y1="${r1(y(v))}" x2="${W - R}" y2="${r1(y(v))}" stroke="${RULE}" stroke-width="1"/>`);
    parts.push(`<text x="${L - 8}" y="${r1(y(v)) + 4}" text-anchor="end" class="ch-tick">${esc(short(v, o.currency))}</text>`);
  }
  o.returns.forEach((v, i) => {
    const cx = L + band * i + band / 2;
    const pv = o.presentValues[i] ?? 0;
    parts.push(vbar(cx - bw - 1, bw, y(0), y(v), SLATE, 0.45, `Year ${i + 1}: net cash flow ${fmtMoney(v, o.currency, 0)}`));
    parts.push(vbar(cx + 1, bw, y(0), y(pv), COBALT, 1, `Year ${i + 1}: present value ${fmtMoney(pv, o.currency, 0)}`));
    parts.push(`<text x="${r1(cx)}" y="${H - B + 18}" text-anchor="middle" class="ch-tick">${i + 1}</text>`);
  });
  parts.push(`<line x1="${L}" y1="${r1(y(0))}" x2="${W - R}" y2="${r1(y(0))}" stroke="${INK}" stroke-width="1.25"/>`);
  parts.push(`<text x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle" class="ch-axis">Year</text>`);
  parts.push(legend([{ label: 'Net cash flow', colour: SLATE, kind: 'bar', opacity: 0.45 }, { label: `Present value at ${o.rate}%`, colour: COBALT, kind: 'bar' }], L, 22));
  const desc = `Net cash flow and present value at ${o.rate}% by year: ${o.returns.map((v, i) => `year ${i + 1} ${fmtMoney(v, o.currency, 0)} worth ${fmtMoney(o.presentValues[i] ?? 0, o.currency, 0)} today`).join('; ')}. The later the year, the more its return is discounted.`;
  return svg(W, H, o.id, `Each year’s return and its present value at ${o.rate}%`, desc, parts.join(''));
}

/** NPV against the discount rate: the guide's rates as dots, the formula's curve as a line (enrichment). */
export function npvProfileSvg(o: { points: Array<{ rate: number; npv: number }>; curve: Array<{ rate: number; npv: number }>; selected: number; irr: number | null; currency: string; id: string }): string {
  const W = 600;
  const H = 300;
  const L = 74;
  const R = 24;
  const T = 30;
  const B = 44;
  const all = [...o.points, ...o.curve].map((p) => p.npv);
  const sc = scale(Math.min(...all, 0), Math.max(...all, 0), 5);
  const xmax = Math.max(25, ...o.curve.map((p) => p.rate));
  const x = (r: number) => L + (r / xmax) * (W - L - R);
  const y = (v: number) => T + ((sc.max - v) / (sc.max - sc.min)) * (H - T - B);
  const parts: string[] = [];
  for (let v = sc.min; v <= sc.max + 1e-9; v += sc.step) {
    parts.push(`<line x1="${L}" y1="${r1(y(v))}" x2="${W - R}" y2="${r1(y(v))}" stroke="${RULE}" stroke-width="1"/>`);
    parts.push(`<text x="${L - 8}" y="${r1(y(v)) + 4}" text-anchor="end" class="ch-tick">${esc(short(v, o.currency))}</text>`);
  }
  for (let r = 0; r <= xmax + 1e-9; r += 5) parts.push(`<text x="${r1(x(r))}" y="${H - B + 18}" text-anchor="middle" class="ch-tick">${r}%</text>`);
  parts.push(`<line x1="${L}" y1="${r1(y(0))}" x2="${W - R}" y2="${r1(y(0))}" stroke="${INK}" stroke-width="1.25"/>`);
  const curve = o.curve.map((p, i) => `${i ? 'L' : 'M'}${r1(x(p.rate))} ${r1(y(p.npv))}`).join('');
  parts.push(`<path d="${curve}" fill="none" stroke="${COBALT}" stroke-width="2" stroke-opacity="0.45"/>`);
  o.points.forEach((p) => {
    const sel = p.rate === o.selected;
    parts.push(`<circle cx="${r1(x(p.rate))}" cy="${r1(y(p.npv))}" r="${sel ? 6 : 4.5}" fill="${sel ? COBALT : '#fff'}" stroke="${COBALT}" stroke-width="2">${tip(`NPV at ${p.rate}%: ${fmtMoney(p.npv, o.currency, 0)}`)}</circle>`);
  });
  const sel = o.points.find((p) => p.rate === o.selected);
  if (sel) parts.push(`<text x="${r1(x(sel.rate) + 9)}" y="${r1(y(sel.npv) - 9)}" class="ch-label" fill="${INK}">${esc(`${sel.rate}%: ${fmtMoney(sel.npv, o.currency, 0)}`)}</text>`);
  if (o.irr !== null && o.irr <= xmax) {
    parts.push(`<path d="M${r1(x(o.irr))} ${r1(y(0) - 6)}L${r1(x(o.irr) + 5)} ${r1(y(0))}L${r1(x(o.irr))} ${r1(y(0) + 6)}L${r1(x(o.irr) - 5)} ${r1(y(0))}Z" fill="${INK}">${tip(`Internal rate of return about ${fmtNumber(o.irr, 1)}% (enrichment)`)}</path>`);
    parts.push(`<text x="${r1(x(o.irr))}" y="${r1(y(0) + 20)}" text-anchor="middle" class="ch-note" fill="${INK}">${esc(`IRR about ${fmtNumber(o.irr, 1)}% (enrichment)`)}</text>`);
  }
  parts.push(`<text x="${(L + W - R) / 2}" y="${H - 8}" text-anchor="middle" class="ch-axis">Discount rate</text>`);
  parts.push(legend([{ label: 'NPV at the guide’s rates (dots)', colour: COBALT, kind: 'line' }], L, 16));
  const desc = `NPV at the guide's rates: ${o.points.map((p) => `${p.rate}% ${fmtMoney(p.npv, o.currency, 0)}`).join(', ')}. The higher the rate, the lower the NPV.${o.irr !== null ? ` NPV is zero at about ${fmtNumber(o.irr, 1)}%, the internal rate of return (enrichment).` : ''}`;
  return svg(W, H, o.id, 'Net present value at each discount rate', desc, parts.join(''));
}
