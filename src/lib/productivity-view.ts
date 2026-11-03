/**
 * HTML and SVG for the capacity utilization and productivity calculator,
 * rendered on the server for the worked example and in the browser after
 * every change.
 */
import { esc } from './markup';
import { fmtMoney, fmtNumber } from './format';
import { MEASURES, change, fixedCostCurve, measureText, measureValue, type ProductionModel, type ProductionSettings, type Units } from './productivity';
import { niceCeil, niceStep } from './charts';
import { P, r1, svgChart } from './tool-palette';

/** One row per measure: period A, period B and the change. */
export function measureRowsHtml(a: ProductionModel, b: ProductionModel | null, u: Units, currency: string, s: ProductionSettings, capitalLabel: string): string {
  return MEASURES.map((m) => {
    const va = measureValue(a, m.key);
    const vb = b ? measureValue(b, m.key) : null;
    const d = b ? change(va, vb) : null;
    const isRate = m.key === 'utilization' || m.key === 'defect' || m.key === 'productivity';
    const dText =
      d === null
        ? b
          ? 'n/a'
          : ''
        : Math.abs(d) < 1e-9
          ? 'no change'
          : `${d > 0 ? '+' : '−'}${m.key === 'fixed' ? fmtMoney(Math.abs(d), currency, 2) : fmtNumber(Math.abs(d), m.key === 'defect' ? 2 : m.key === 'leverage' ? 2 : isRate ? 1 : 2)}${isRate ? ' points' : ''}`;
    return `<tr><th scope="row">${esc(m.name)}${m.guide ? ' <span class="cap-guide">guide formula</span>' : ''}</th><td class="n" data-col="a">${esc(measureText(a, m.key, u, currency, s, capitalLabel))}</td><td class="n" data-col="b">${b ? esc(measureText(b, m.key, u, currency, s, capitalLabel)) : ''}</td><td class="n" data-col="change">${esc(dText)}</td></tr>`;
  }).join('');
}

/** A bar for each period: capacity used and spare, with the busy zone from 85% marked. */
export function utilizationBarsHtml(rows: Array<{ name: string; m: ProductionModel }>, u: Units): string {
  return `<ul class="cap-bars" role="list">${rows
    .map(({ name, m }) => {
      const used = m.utilization === null ? 0 : Math.min(100, m.utilization);
      const label = `${name}: ${fmtNumber(used, 1)}% of capacity used, ${fmtNumber(m.inputs.made)} of ${fmtNumber(m.inputs.capacity)} ${u.many}`;
      return `<li class="cap-bars__row"><span class="cap-bars__name">${esc(name)}</span><span class="cap-bars__track" role="img" aria-label="${esc(label)}"><span class="cap-bars__used" style="width:${used.toFixed(2)}%"></span><span class="cap-bars__mark" aria-hidden="true"></span></span><span class="cap-bars__v">${esc(fmtNumber(used, 1))}%</span></li>`;
    })
    .join('')}</ul><p class="cap-bars__key"><span class="cap-bars__sw cap-bars__sw--used" aria-hidden="true"></span>Capacity used <span class="cap-bars__sw cap-bars__sw--spare" aria-hidden="true"></span>Spare capacity <span class="cap-bars__sw cap-bars__sw--mark" aria-hidden="true"></span>85%: from here, little room for a rush order or a breakdown (the platform's rule of thumb)</p>`;
}

/** The curve's figures at each tenth of capacity, for the table beside the chart. */
export function fixedCostRowsHtml(fixedCosts: number, capacity: number, currency: string): string {
  return fixedCostCurve(fixedCosts, capacity, 9)
    .map(([q, v]) => `<tr><td class="n">${esc(fmtNumber(q, Number.isInteger(q) ? 0 : 1))}</td><td class="n">${esc(fmtNumber((q / capacity) * 100, 0))}%</td><td class="n">${esc(fmtMoney(v, currency, 2))}</td></tr>`)
    .join('');
}

/** Fixed cost per unit at every level of output, with each period marked. */
export function fixedCostSvg(rows: Array<{ name: string; m: ProductionModel }>, u: Units, currency: string, id: string): string {
  const first = rows[0]?.m;
  if (!first) return '';
  const W = 620;
  const H = 320;
  const L = 70;
  const R = 26;
  const T = 24;
  const B = 52;
  const cap = Math.max(...rows.map((r) => r.m.inputs.capacity));
  const fixed = Math.max(...rows.map((r) => r.m.inputs.fixedCosts));
  // One curve when the periods share their fixed costs and capacity, otherwise one each, so every mark sits on its own curve.
  const same = rows.every((r) => r.m.inputs.fixedCosts === first.inputs.fixedCosts && r.m.inputs.capacity === first.inputs.capacity);
  const curves = (same ? rows.slice(0, 1) : rows).map((r) => fixedCostCurve(r.m.inputs.fixedCosts, r.m.inputs.capacity, 54));
  const curve = curves[0] ?? [];
  const ymax = niceCeil(Math.max(1, ...curves.flatMap((c) => c.map((p) => p[1])), ...rows.map((r) => r.m.fixedCostPerUnit ?? 0)), 5);
  const x = (q: number) => L + (q / cap) * (W - L - R);
  const y = (v: number) => H - B - (v / ymax) * (H - T - B);
  const parts: string[] = [];
  const ys = niceStep(ymax, 5);
  for (let v = 0; v <= ymax + 1e-9; v += ys) {
    parts.push(`<line x1="${L}" y1="${r1(y(v))}" x2="${W - R}" y2="${r1(y(v))}" stroke="${P.hair}"/>`);
    parts.push(`<text x="${L - 8}" y="${r1(y(v)) + 4}" text-anchor="end" class="ch-tick">${esc(fmtMoney(v, currency, 0))}</text>`);
  }
  const xs = niceStep(cap, 5);
  for (let q = 0; q <= cap + 1e-9; q += xs) {
    parts.push(`<line x1="${r1(x(q))}" y1="${H - B}" x2="${r1(x(q))}" y2="${H - B + 5}" stroke="${P.navy}"/>`);
    parts.push(`<text x="${r1(x(q))}" y="${H - B + 19}" text-anchor="middle" class="ch-tick">${esc(fmtNumber(q))}</text>`);
  }
  parts.push(`<line x1="${L}" y1="${T - 6}" x2="${L}" y2="${H - B}" stroke="${P.navy}" stroke-width="1.25"/>`);
  parts.push(`<line x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}" stroke="${P.navy}" stroke-width="1.25"/>`);
  parts.push(`<text x="${(L + W - R) / 2}" y="${H - 12}" text-anchor="middle" class="ch-axis">${esc(`Output (${u.many} a ${u.period})`)}</text>`);
  parts.push(`<text x="16" y="${(T + H - B) / 2}" text-anchor="middle" class="ch-axis" transform="rotate(-90 16 ${(T + H - B) / 2})">${esc(`Fixed cost per ${u.one}`)}</text>`);
  // Capacity: the right-hand limit of output.
  parts.push(`<line x1="${r1(x(cap))}" y1="${T}" x2="${r1(x(cap))}" y2="${H - B}" stroke="${P.slate}" stroke-dasharray="4 4"/>`);
  parts.push(`<text x="${r1(x(cap)) - 6}" y="${T + 10}" text-anchor="end" class="ch-note" fill="${P.slate}">Capacity ${esc(fmtNumber(cap))}</text>`);
  const marks = [P.cobalt, P.gold600];
  curves.forEach((c, k) => {
    if (c.length) parts.push(`<path d="${c.map((p, j) => `${j ? 'L' : 'M'}${r1(x(p[0]))} ${r1(y(p[1]))}`).join(' ')}" fill="none" stroke="${same ? P.navy : (marks[k] ?? P.navy)}" stroke-width="2.25"${k ? ' stroke-dasharray="6 4"' : ''}/>`);
  });
  rows.forEach(({ name, m }, k) => {
    if (m.fixedCostPerUnit === null || m.goodOutput <= 0) return;
    const px = x(Math.min(m.goodOutput, cap));
    const py = y(m.fixedCostPerUnit);
    const col = marks[k] ?? P.navy;
    parts.push(`<line x1="${r1(px)}" y1="${r1(py)}" x2="${r1(px)}" y2="${H - B}" stroke="${col}" stroke-dasharray="2 3"/>`);
    parts.push(`<circle cx="${r1(px)}" cy="${r1(py)}" r="5.5" fill="${col}" stroke="#fff" stroke-width="1.5"/>`);
    const dy = k === 0 ? -12 : 20;
    const label = `${name}: ${fmtMoney(m.fixedCostPerUnit, currency, 2)}`;
    // Near the right edge the label sits to the left of its point, so it stays inside the chart.
    const left = px + 9 + label.length * 7 > W - 4;
    parts.push(`<text x="${r1(left ? px - 9 : px + 9)}" y="${r1(py + dy)}" text-anchor="${left ? 'end' : 'start'}" class="ch-label" fill="${col}">${esc(label)}</text>`);
  });
  const desc = `Fixed cost per ${u.one} falls as output rises, because the same fixed costs are shared by more ${u.many}${same && curve.length ? `: with fixed costs of ${fmtMoney(fixed, currency, 0)}, ${fmtMoney(curve[0]?.[1] ?? 0, currency, 2)} at ${fmtNumber(curve[0]?.[0] ?? 0)} ${u.many} and ${fmtMoney(fixed / cap, currency, 2)} at full capacity of ${fmtNumber(cap)}` : ''}. ${rows
    .filter((r) => r.m.fixedCostPerUnit !== null)
    .map((r) => `${r.name}: ${fmtNumber(r.m.goodOutput)} good ${u.many}, ${fmtMoney(r.m.fixedCostPerUnit ?? 0, currency, 2)} each`)
    .join('; ')}.`;
  return svgChart({ w: W, h: H, id, title: `Fixed cost per ${u.one} at each level of output`, desc, body: parts.join(''), minWidth: 480, maxWidth: W * 1.25 });
}
