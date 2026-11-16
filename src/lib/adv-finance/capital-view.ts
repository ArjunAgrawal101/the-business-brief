/**
 * The capital budgeting comparator as a page: the discount rate and how it
 * was reached, every method for every project side by side with its standing
 * against the IB course, the rankings, the NPV profiles, the working for each
 * project, the tornado for one project, the readings and the CSV rows. Used by
 * the server for the worked example and by the browser after every change.
 */
import type { Working } from '../finance';
import { fmtMoney, fmtNumber } from '../format';
import { arr } from '../investment';
import { esc, inline } from '../markup';
import { workingHtml } from '../render';
import type { TableSpec } from '../finance-lab/types';
import { appraise, breakEvenChanges, discountFactor, tornado, wacc, type Appraisal, type CapProject, type IrrResult, type Recovery, type TornadoItem, type Wacc, type WaccInputs } from './capital';
import { COBALT, INK, npvProfilesSvg, SLATE, tornadoSvg } from './charts';
import { chartFigureHtml, figuresHtml, headlineHtml, paras, readingHtml, STANDING_TAG, tableHtml, type Fig, type Standing } from './html';

export interface CapitalState {
  projects: CapProject[];
  rateSource: 'wacc' | 'own';
  ownRate: number;
  wacc: WaccInputs;
  /** The share each estimate moves in the tornado: 0.05, 0.1 or 0.2. */
  flex: number;
  /** The project the tornado studies: an index, or "best" for the highest NPV. */
  focus: number | 'best';
}

export type CapitalRegion = 'headline' | 'figures' | 'rate' | 'compare' | 'ranks' | 'profile' | 'irr' | 'tornado' | 'workings' | 'meaning' | 'given';

export interface CapitalReport {
  rate: number;
  costOfCapital: Wacc | null;
  appraisals: Appraisal[];
  focus: number;
  tornado: TornadoItem[];
  regions: Record<CapitalRegion, string>;
  announce: string;
  summary: string;
  csv: Array<Array<string | number>>;
}

/** A rate in per cent with as few decimals as it needs, up to three: 8.625%, 10%. */
export function rateText(v: number): string {
  const r = Math.round(v * 1000) / 1000;
  const d = Number.isInteger(r) ? 0 : Number.isInteger(r * 10) ? 1 : Number.isInteger(r * 100) ? 2 : 3;
  return `${fmtNumber(r, d)}%`;
}

/** An internal rate of return, to two decimals: 15.35%. */
export const irrRate = (v: number): string => `${fmtNumber(v, 2)}%`;

export function irrText(r: IrrResult): string {
  if (r.status === 'none') return 'None: the cash flows never change sign';
  if (r.status === 'out-of-range') return 'Outside −99% to 1,000,000%';
  if (r.status === 'none-found') return 'None between −99% and 1,000%';
  if (r.rates.length === 0) return 'n/a';
  const list = r.rates.map((x) => irrRate(x)).join(' and ');
  return r.status === 'unique' ? list : `${list} (cash flows change sign ${r.signChanges} times)`;
}

export function yearsText(rc: Recovery): string {
  if (rc.years === null) return 'Not within its life';
  const t = `${fmtNumber(rc.years, 2)} years`;
  return rc.fallsBack ? `${t}, then negative again` : t;
}

export const ACRONYM = { npv: 'NPV', irr: 'IRR', pi: 'PI' } as const;

function irrNote(a: Appraisal, rate: number, currency: string): string {
  const r = a.irr;
  const name = a.project.name;
  if (r.status === 'none') return `${name}: the cash flows never change sign, so no discount rate makes NPV zero and there is no internal rate of return.`;
  if (r.status === 'unique') {
    const x = r.rates[0] as number;
    return `${name}: the cash flows change sign once, so there is exactly one internal rate of return, ${irrRate(x)}. It is ${x > rate ? 'above' : x < rate ? 'below' : 'equal to'} the discount rate of ${rateText(rate)}, which agrees with an NPV ${x > rate ? 'above' : x < rate ? 'below' : 'of'} zero.`;
  }
  if (r.status === 'out-of-range') return `${name}: the cash flows change sign once, but the rate lies outside the search; NPV at the business’s own rate is the safer guide.`;
  const found = r.status === 'none-found' ? 'none was found between −99% and 1,000%' : `${r.rates.map((x) => irrRate(x)).join(' and ')} ${r.rates.length === 1 ? 'was found' : 'were found'}`;
  return `${name}: the cash flows change sign ${r.signChanges} times, so there can be as many as ${r.signChanges} internal rates of return, or none; ${found}. No single rate can then be compared with the cost of capital: judge the project by its NPV at the business’s own rate, ${fmtMoney(a.npv, currency, 0)} at ${rateText(rate)}.`;
}

const standingCell = (s: Standing) => STANDING_TAG[s];

/** The methods side by side: a custom table, because each row carries its standing against the course. */
function compareHtml(rows: Array<{ label: string; standing: Standing; cells: string[]; strong?: boolean }>, names: string[], caption: string): string {
  const head = `<tr><th scope="col">Method</th><th scope="col">Standing</th>${names.map((n) => `<th scope="col" class="n">${esc(n)}</th>`).join('')}</tr>`;
  const body = rows.map((r) => `<tr${r.strong ? ' class="is-strong"' : ''}><th scope="row">${esc(r.label)}</th><td class="af-standing">${standingCell(r.standing)}</td>${r.cells.map((c) => `<td class="n">${esc(c)}</td>`).join('')}</tr>`).join('');
  return `<div class="table-scroll" role="region" aria-label="Every method for every project" tabindex="0"><table class="table fl-table af-compare"><caption>${esc(caption)}</caption><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}

export function capitalRate(st: CapitalState): { rate: number; costOfCapital: Wacc | null } {
  const w = wacc(st.wacc);
  return { rate: st.rateSource === 'wacc' && w ? w.wacc : st.ownRate, costOfCapital: w };
}

const best = <T>(xs: T[], score: (x: T) => number | null, higher = true): T | null => {
  let out: T | null = null;
  let s = higher ? -Infinity : Infinity;
  for (const x of xs) {
    const v = score(x);
    if (v === null || !Number.isFinite(v)) continue;
    if (higher ? v > s + 1e-9 : v < s - 1e-9) {
      s = v;
      out = x;
    }
  }
  return out;
};

export function buildCapitalReport(st: CapitalState, currency: string): CapitalReport {
  const { rate, costOfCapital } = capitalRate(st);
  const m = (v: number) => fmtMoney(v, currency, 0);
  const m2 = (v: number) => fmtMoney(v, currency, 2);
  const cur = currency.trim() || 'currency';
  const aps = st.projects.map((p) => appraise(p, rate));
  const names = aps.map((a) => a.project.name);
  const topNpv = best(aps, (a) => a.npv);
  const focus = st.focus === 'best' ? aps.indexOf(topNpv ?? (aps[0] as Appraisal)) : Math.min(Math.max(0, st.focus), aps.length - 1);
  const fa = aps[focus] as Appraisal;
  const items = tornado(fa.project, rate, st.flex);
  const be = breakEvenChanges(fa);
  const uniqueIrr = (a: Appraisal) => (a.irr.status === 'unique' ? (a.irr.rates[0] as number) : null);
  const topIrr = best(aps, uniqueIrr);
  const quickest = best(aps, (a) => a.payback.years, false);
  const quickestD = best(aps, (a) => a.discountedPayback.years, false);
  const topPi = best(aps, (a) => a.pi);
  const arrOf = (a: Appraisal) => arr({ id: 'p', label: a.project.name, capitalCost: a.project.outlay, returns: a.project.flows });
  const topArr = best(aps, arrOf);

  const rateWhere = st.rateSource === 'wacc' ? 'the WACC worked out below' : 'a rate of your own';
  const headline = { label: `Highest net present value at ${rateText(rate)}`, value: topNpv ? m(topNpv.npv) : 'n/a', note: topNpv ? `${topNpv.project.name}${topNpv.npv < 0 ? ': every project is worth less than it costs at this rate' : ''}` : '' };
  const prefers = { npv: topNpv, irr: topIrr, payback: quickest, pi: topPi };
  const winners = [...new Set(Object.values(prefers).filter((x): x is Appraisal => x !== null).map((x) => x.project.name))];
  const figures: Fig[] = [
    { label: 'Discount rate', value: rateText(rate), note: rateWhere, standing: 'beyond' },
    { label: 'Highest IRR', value: topIrr ? irrRate(uniqueIrr(topIrr) as number) : 'n/a', note: topIrr?.project.name ?? 'no project has a single IRR', standing: 'beyond' },
    { label: 'Quickest payback', value: quickest ? yearsText(quickest.payback) : 'n/a', note: quickest?.project.name ?? 'no project pays back', standing: 'ib' },
    { label: 'Highest profitability index', value: topPi?.pi != null ? fmtNumber(topPi.pi, 3) : 'n/a', note: topPi?.project.name ?? '', standing: 'beyond' },
    { label: 'Do the methods agree?', value: winners.length <= 1 ? 'Yes' : 'No', note: winners.length <= 1 ? `each prefers ${winners[0] ?? 'none'}` : `NPV prefers ${topNpv?.project.name}; ${[topIrr && topIrr !== topNpv ? `IRR ${topIrr.project.name}` : '', quickest && quickest !== topNpv ? `payback ${quickest.project.name}` : '', topPi && topPi !== topNpv ? `PI ${topPi.project.name}` : ''].filter(Boolean).join(', ')}` },
  ];

  /* The rate */
  const wi = st.wacc;
  const waccWorking: Working | null = costOfCapital
    ? {
        given: [
          { label: 'Risk-free rate', value: rateText(wi.riskFree) },
          { label: 'Beta', value: fmtNumber(wi.beta, 2) },
          { label: 'Market risk premium', value: rateText(wi.marketPremium) },
          { label: 'Cost of debt, before tax', value: rateText(wi.costOfDebt) },
          { label: 'Tax rate', value: rateText(wi.taxRate) },
          { label: 'Market value of equity (E)', value: m(wi.equityValue) },
          { label: 'Market value of debt (D)', value: m(wi.debtValue) },
        ],
        formula: 'WACC = E ÷ (D + E) × cost of equity + D ÷ (D + E) × cost of debt × (1 − tax rate), where cost of equity = risk-free rate + beta × market risk premium',
        substitution: `= ${fmtNumber(costOfCapital.weightEquity * 100, 2)}% × ${rateText(costOfCapital.costOfEquity)} + ${fmtNumber(costOfCapital.weightDebt * 100, 2)}% × ${rateText(wi.costOfDebt)} × (1 − ${fmtNumber(wi.taxRate / 100, 2)})`,
        steps: [
          `Cost of equity = ${rateText(wi.riskFree)} + ${fmtNumber(wi.beta, 2)} × ${rateText(wi.marketPremium)} = ${rateText(costOfCapital.costOfEquity)}`,
          `Cost of debt after tax = ${rateText(wi.costOfDebt)} × (1 − ${fmtNumber(wi.taxRate / 100, 2)}) = ${rateText(costOfCapital.afterTaxDebt)}`,
          `Weights: E ÷ (D + E) = ${fmtNumber(wi.equityValue)} ÷ ${fmtNumber(wi.equityValue + wi.debtValue)} = ${fmtNumber(costOfCapital.weightEquity * 100, 2)}%; D ÷ (D + E) = ${fmtNumber(costOfCapital.weightDebt * 100, 2)}%`,
          `WACC = ${fmtNumber(costOfCapital.weightEquity * 100, 2)}% × ${rateText(costOfCapital.costOfEquity)} + ${fmtNumber(costOfCapital.weightDebt * 100, 2)}% × ${rateText(costOfCapital.afterTaxDebt)} = ${rateText(costOfCapital.wacc)}`,
        ],
        answer: rateText(costOfCapital.wacc),
        value: costOfCapital.wacc,
        unit: 'per cent a year',
        note: 'The cost of equity by the capital asset pricing model (Sharpe, 1964); market-value weights.',
      }
    : null;
  const rateHtml = `${waccWorking ? workingHtml(waccWorking, inline(`The business must earn ${rateText(costOfCapital?.wacc ?? 0)} a year on a project of ordinary risk to satisfy its lenders and its owners together.`), inline(st.rateSource === 'wacc' ? 'This is the discount rate every project below is worked at.' : `The projects below are worked at your own rate, ${rateText(rate)}, not at this one.`)) : ''}`;

  /* The comparison */
  const rows: Array<{ label: string; standing: Standing; cells: string[]; strong?: boolean }> = [
    { label: 'Initial investment', standing: 'ib', cells: aps.map((a) => m(a.project.outlay)) },
    { label: 'Life', standing: 'ib', cells: aps.map((a) => `${a.project.flows.length} years`) },
    { label: 'Total net cash flow, undiscounted', standing: 'ib', cells: aps.map((a) => m(a.project.flows.reduce((x, y) => x + y, 0))) },
    { label: 'Payback period', standing: 'ib', cells: aps.map((a) => yearsText(a.payback)) },
    { label: 'Average rate of return (ARR)', standing: 'ib', cells: aps.map((a) => (arrOf(a) === null ? 'n/a' : `${fmtNumber(arrOf(a) as number, 2)}%`)) },
    { label: `Net present value at ${rateText(rate)}`, standing: 'beyond', cells: aps.map((a) => m(a.npv)), strong: true },
    { label: 'Internal rate of return (IRR)', standing: 'beyond', cells: aps.map((a) => irrText(a.irr)) },
    { label: `Discounted payback at ${rateText(rate)}`, standing: 'beyond', cells: aps.map((a) => yearsText(a.discountedPayback)) },
    { label: 'Profitability index (PV ÷ investment)', standing: 'beyond', cells: aps.map((a) => (a.pi === null ? 'n/a' : fmtNumber(a.pi, 3))) },
  ];
  const compare = `${compareHtml(rows, names, `Every method, every project, at a discount rate of ${rateText(rate)}`)}<p class="small muted af-identity">Net present value itself is in the HL course (3.8), worked with the guide’s table of discount factors at 4, 6, 8, 10 and 20%. Here it is worked from the formula at any rate, which goes beyond the course; the <a href="/finance-desk/lab/net-present-value/">Financial Laboratory’s NPV calculator</a> works it the IB way.</p>`;

  const rank = (score: (a: Appraisal) => number | null, higher: boolean) => {
    const scored = aps.map((a) => ({ a, s: score(a) })).filter((x) => x.s !== null && Number.isFinite(x.s));
    scored.sort((x, y) => (higher ? (y.s as number) - (x.s as number) : (x.s as number) - (y.s as number)));
    return scored.map((x, i) => `${i + 1}. ${x.a.project.name}`).join('; ') || 'none';
  };
  const ranksTable: TableSpec = {
    caption: 'Which project each method puts first',
    head: ['Method', 'Order, best first'],
    numeric: [false, false],
    rows: [
      { th: 'Net present value', cells: [rank((a) => a.npv, true)] },
      { th: 'Internal rate of return (single rates only)', cells: [rank(uniqueIrr, true)] },
      { th: 'Profitability index', cells: [rank((a) => a.pi, true)] },
      { th: 'Payback period', cells: [rank((a) => a.payback.years, false)] },
      { th: 'Discounted payback', cells: [rank((a) => a.discountedPayback.years, false)] },
      { th: 'Average rate of return (IB)', cells: [rank(arrOf, true)] },
    ],
  };

  /* NPV profiles */
  const maxIrr = Math.max(0, ...aps.flatMap((a) => a.irr.rates.filter((x) => x <= 200)));
  const top = Math.min(200, Math.max(30, Math.ceil((Math.max(rate, maxIrr) * 1.3) / 10) * 10));
  const steps = 60;
  const STYLE = [
    { colour: COBALT, dash: undefined },
    { colour: INK, dash: '7 5' },
    { colour: SLATE, dash: '9 3 2 3' },
  ];
  const profiles = aps.map((a, i) => ({
    label: a.project.name,
    points: Array.from({ length: steps + 1 }, (_, k) => {
      const r = (top * k) / steps;
      return { rate: r, npv: a.flows0.reduce((s, cf, t) => s + cf * discountFactor(r, t), 0) };
    }).concat([{ rate, npv: a.npv }]).sort((x, y) => x.rate - y.rate),
    irr: a.irr.rates.filter((x) => x >= 0 && x <= top),
    ...(STYLE[i] ?? STYLE[0]!),
  }));
  const tableRates = [0, 5, 10, 15, 20, 25, 30].filter((r) => r <= top);
  if (!tableRates.includes(Math.round(rate * 1000) / 1000)) tableRates.push(rate);
  tableRates.sort((x, y) => x - y);
  const profile = chartFigureHtml({
    svg: npvProfilesSvg({ id: 'af-npv-profiles', projects: profiles, rate, rateLabel: rateText(rate), currency: currency.trim() }),
    label: 'Net present value at each discount rate',
    caption: `NPV of each project at rates from 0% to ${top}%. Where a line crosses zero is that project’s internal rate of return; the dashed upright line is the discount rate in use. Lines that cross each other show that the ranking by NPV depends on the rate.`,
    table: { caption: 'NPV at a range of discount rates', head: ['Discount rate', ...names], rows: tableRates.map((r) => ({ th: rateText(r), cells: aps.map((a) => m(a.flows0.reduce((s, cf, t) => s + cf * discountFactor(r, t), 0))), base: Math.abs(r - rate) < 1e-9 })) },
  });

  /* The tornado */
  const tornadoTable: TableSpec = {
    caption: `${fa.project.name}: NPV when one estimate moves`,
    head: ['Estimate', 'Lower', 'NPV', 'Higher', 'NPV', 'Swing'],
    numeric: [false, false, true, false, true, true],
    rows: items.map((it) => ({ th: it.label, cells: [it.lowNote, m(it.low), it.highNote, m(it.high), m(it.swing)] })),
  };
  const first = items[0];
  const tornadoReading = `The NPV of ${fa.project.name}, ${m(fa.npv)}, depends most on the ${first ? first.label.toLowerCase() : 'estimates'}: ${first ? `${first.lowNote}, it would be ${m(first.low)}; ${first.highNote}, ${m(first.high)}.` : ''} ${be.flows !== null && fa.npv > 0 ? `It stays positive unless every year’s cash flow falls by more than ${fmtNumber(-be.flows, 1)}%, or the investment rises by more than ${fmtNumber(be.outlay ?? 0, 1)}%.` : fa.npv <= 0 ? `To reach an NPV of zero every year’s cash flow would have to rise by ${be.flows === null ? 'n/a' : `${fmtNumber(be.flows, 1)}%`}.` : ''} A tornado moves one estimate at a time; in practice estimates move together, which scenario analysis tests.`;
  const tornadoBlock = `${chartFigureHtml({
    svg: tornadoSvg({
      id: 'af-tornado',
      title: `What moves the NPV of ${fa.project.name}`,
      base: fa.npv,
      baseText: m(fa.npv),
      items: items.map((it) => ({ label: it.label, low: it.low, high: it.high, lowText: m(it.low), highText: m(it.high), lowNote: it.lowNote, highNote: it.highNote })),
      currency: currency.trim(),
    }),
    label: `Tornado: ${fa.project.name}`,
    caption: `Each estimate moved ${Math.round(st.flex * 100)}% down (grey) and up (blue), one at a time, the rest as entered; the life moves by a year. The widest bar is the estimate the decision depends on most.`,
    table: tornadoTable,
  })}${readingHtml(tornadoReading)}`;

  /* The working for each project */
  const workings = aps
    .map((a, i) => {
      const t: TableSpec = {
        caption: `${a.project.name}: cash flows and present values at ${rateText(rate)}`,
        head: ['Year', 'Net cash flow', 'Discount factor', 'Present value', 'Cumulative', 'Cumulative present value'],
        rows: a.flows0.map((cf, y) => ({ th: `Year ${y}`, cells: [m(cf), discountFactor(rate, y).toFixed(4), m2(a.presentValues[y] ?? 0), m(a.cumulative[y] ?? 0), m2(a.cumulativeDiscounted[y] ?? 0)] })),
      };
      const w: Working = {
        given: [{ label: 'Initial investment', value: m(a.project.outlay) }, ...a.project.flows.map((cf, k) => ({ label: `Net cash flow, year ${k + 1}`, value: m(cf) })), { label: 'Discount rate', value: rateText(rate) }],
        formula: 'NPV = −initial investment + Σ net cash flow in year t ÷ (1 + r)^t',
        substitution: `= −${fmtNumber(a.project.outlay)} + ${a.project.flows.map((cf, k) => `${fmtNumber(cf)} ÷ ${fmtNumber(1 + rate / 100, 5)}^${k + 1}`).join(' + ')}`,
        steps: [...a.project.flows.map((cf, k) => `Year ${k + 1}: ${fmtNumber(cf)} × ${discountFactor(rate, k + 1).toFixed(6)} = ${fmtNumber(a.presentValues[k + 1] ?? 0, 2)}`), `Present value of the cash flows = ${fmtNumber(a.pv, 2)}`, `${fmtNumber(a.pv, 2)} − ${fmtNumber(a.project.outlay)} = ${fmtNumber(a.npv, 2)}`],
        answer: m2(a.npv),
        value: a.npv,
        unit: `${cur}, in today’s money`,
        note: 'Discount factors from the formula, to six places; the IB’s table prints four places at five rates, so its answers differ slightly.',
      };
      return `<details class="disclosure af-working"${i === focus ? ' open' : ''}><summary>${esc(a.project.name)}: the working</summary><div class="disclosure__body">${workingHtml(w, inline(`At ${rateText(rate)}, the cash flows are worth ${m2(a.pv)} today, ${m2(Math.abs(a.npv))} ${a.npv >= 0 ? 'more' : 'less'} than the investment.`), inline(a.npv >= 0 ? 'On NPV alone the project adds value at this rate.' : 'On NPV alone the project destroys value at this rate.'))}${tableHtml(t, `${a.project.name}: year by year`)}</div></details>`;
    })
    .join('');

  /* Readings */
  const meaning: string[] = [];
  if (topNpv) meaning.push(`At ${rateText(rate)}, **${topNpv.project.name}** adds the most value: an NPV of ${m(topNpv.npv)}. ${aps.filter((a) => a.npv < 0).length ? `${aps.filter((a) => a.npv < 0).map((a) => a.project.name).join(' and ')} ${aps.filter((a) => a.npv < 0).length === 1 ? 'is' : 'are'} worth less than ${aps.filter((a) => a.npv < 0).length === 1 ? 'it costs' : 'they cost'} at this rate.` : 'Every project is worth more than it costs at this rate.'}`);
  if (winners.length > 1) {
    const others = [topIrr && topIrr !== topNpv ? `the internal rate of return (${topIrr.project.name}, ${irrRate(uniqueIrr(topIrr) as number)})` : '', topPi && topPi !== topNpv ? `the profitability index (${topPi.project.name}, ${fmtNumber(topPi.pi ?? 0, 3)})` : '', quickest && quickest !== topNpv ? `payback (${quickest.project.name}, ${yearsText(quickest.payback)})` : ''].filter(Boolean);
    meaning.push(`The methods disagree. ${others.length ? `${cap(others.join(', '))} ${others.length === 1 ? 'puts' : 'put'} another project first.` : ''} They answer different questions: NPV measures the value added in money; the IRR and the profitability index measure the return per unit of money invested, so they favour small, quick projects; payback measures only how fast the money comes back. When the projects are alternatives and money can be found for the best, choose the highest NPV.`);
  } else if (topNpv) meaning.push('Every method puts the same project first, so the choice does not depend on which method the business uses; it still depends on the estimates.');
  if (topPi && topNpv && topPi !== topNpv) meaning.push(`If money is limited and projects can be scaled down, the profitability index ranks them by value per unit of money: ${topPi.project.name} gives ${fmtNumber(topPi.pi ?? 0, 3)} of present value for each unit invested. With projects that cannot be split, compare the total NPV of the combinations the budget allows instead.`);
  if (quickestD && quickestD !== quickest) meaning.push(`Discounting changes the order of the paybacks: ${quickestD.project.name} recovers its cost first in today’s money.`);
  if (topArr && topArr !== topNpv) meaning.push(`The IB’s average rate of return prefers ${topArr.project.name}: it counts every year’s cash equally, however late it comes.`);
  const multiple = aps.filter((a) => a.irr.status === 'multiple' || a.irr.status === 'one-of-several' || a.irr.status === 'none-found');
  if (multiple.length) meaning.push(`${multiple.map((a) => a.project.name).join(' and ')} ${multiple.length === 1 ? 'has' : 'have'} cash flows that change sign more than once, so the internal rate of return cannot be relied on; see the note below the chart.`);

  const irrNotes = `<ul class="af-notes">${aps.map((a) => `<li>${esc(irrNote(a, rate, currency))}</li>`).join('')}</ul>`;

  const given = [
    ...aps.flatMap((a, i) => [
      { label: `Project ${i + 1}`, value: a.project.name },
      { label: `${a.project.name}: initial investment`, value: m(a.project.outlay) },
      ...a.project.flows.map((cf, k) => ({ label: `${a.project.name}: year ${k + 1}`, value: m(cf) })),
    ]),
    { label: 'Discount rate', value: `${rateText(rate)} (${rateWhere})` },
    { label: 'Risk-free rate', value: rateText(wi.riskFree) },
    { label: 'Beta', value: fmtNumber(wi.beta, 2) },
    { label: 'Market risk premium', value: rateText(wi.marketPremium) },
    { label: 'Cost of debt, before tax', value: rateText(wi.costOfDebt) },
    { label: 'Tax rate', value: rateText(wi.taxRate) },
    { label: 'Market value of equity', value: m(wi.equityValue) },
    { label: 'Market value of debt', value: m(wi.debtValue) },
    { label: 'Tornado: each estimate moved by', value: `${Math.round(st.flex * 100)}%` },
  ];

  const csv: Array<Array<string | number>> = [
    ...given.map((g) => ['Input', g.label, g.value, '']),
    ['Result', 'Discount rate', Math.round(rate * 1e6) / 1e6, '%'],
    ...(costOfCapital ? [['Result', 'Cost of equity (CAPM)', round6(costOfCapital.costOfEquity), '%'], ['Result', 'Cost of debt after tax', round6(costOfCapital.afterTaxDebt), '%'], ['Result', 'WACC', round6(costOfCapital.wacc), '%']] : []),
    ...aps.flatMap((a) => [
      ['Result', `${a.project.name}: NPV`, Math.round(a.npv * 100) / 100, cur],
      ['Result', `${a.project.name}: IRR`, a.irr.rates.length ? a.irr.rates.map((x) => round6(x)).join(' and ') : irrText(a.irr), '%'],
      ['Result', `${a.project.name}: payback`, a.payback.years === null ? 'none' : round6(a.payback.years), 'years'],
      ['Result', `${a.project.name}: discounted payback`, a.discountedPayback.years === null ? 'none' : round6(a.discountedPayback.years), 'years'],
      ['Result', `${a.project.name}: profitability index`, a.pi === null ? 'n/a' : round6(a.pi), ''],
      ['Result', `${a.project.name}: ARR`, arrOf(a) === null ? 'n/a' : round6(arrOf(a) as number), '%'],
    ]),
    ...items.flatMap((it) => [
      ['Sensitivity', `${fa.project.name}: ${it.label}, ${it.lowNote}`, Math.round(it.low * 100) / 100, cur],
      ['Sensitivity', `${fa.project.name}: ${it.label}, ${it.highNote}`, Math.round(it.high * 100) / 100, cur],
    ]),
  ];

  const regions: Record<CapitalRegion, string> = {
    headline: headlineHtml(headline),
    figures: figuresHtml(figures),
    rate: rateHtml,
    compare,
    ranks: tableHtml(ranksTable, 'Which project each method puts first'),
    profile,
    irr: irrNotes,
    tornado: tornadoBlock,
    workings,
    meaning: paras(meaning),
    given: given.map((g) => `<div><dt>${esc(g.label)}</dt><dd>${esc(g.value)}</dd></div>`).join(''),
  };
  return {
    rate,
    costOfCapital,
    appraisals: aps,
    focus,
    tornado: items,
    regions,
    announce: topNpv ? `At ${rateText(rate)}, the highest NPV is ${topNpv.project.name}, ${m(topNpv.npv)}.` : 'No project has an NPV.',
    summary: topNpv ? `Highest NPV at ${rateText(rate)}: ${topNpv.project.name}, ${m(topNpv.npv)}.` : 'Projects compared.',
    csv,
  };
}

const round6 = (v: number) => Math.round(v * 1e6) / 1e6;
const cap = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
