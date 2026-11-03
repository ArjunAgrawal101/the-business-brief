/** HTML and charts for the product life cycle simulator, shared by the server render and the browser script. */
import { esc } from './markup';
import { fmtMoney, fmtNumber } from './format';
import { C, lineSvg, type Band, type LineSeries } from './market-charts';
import { fig, numberField, textField } from './market-view';
import { EXTENSION_LABELS, lossYear, plcView, stageOf, type Extension, type PlcState, type PlcView, type Stage } from './market-plc';

const money = (v: number, s: PlcState) => fmtMoney(v, s.currency, 0);

export function extensionRowHtml(e: Extension, uid: string, s: PlcState): string {
  const id = (k: string) => `${uid}-ext-${e.id}-${k}`;
  const label = EXTENSION_LABELS[e.id].label;
  const price = e.id === 'price-cut';
  const fields = price
    ? `${numberField({ id: id('pcprice'), f: 'pc-price', label: 'Cut in price', value: s.priceCut.price, min: 0, max: 90, step: '1', suffix: '%' })}${numberField({ id: id('pcunits'), f: 'pc-units', label: 'Rise in units sold, assumed', value: s.priceCut.units, min: 0, max: 500, step: '1', suffix: '%' })}`
    : `${numberField({ id: id('uplift'), f: 'uplift', label: 'Extra sales in the first year', value: e.uplift, min: 0, max: 200, step: '1', suffix: '%' })}${numberField({ id: id('fade'), f: 'fade', label: 'Points lost each later year', value: e.fade, min: 0, max: 100, step: '1' })}${numberField({ id: id('cost'), f: 'cost', label: 'One-off cost', value: e.cost, min: 0, step: '100', prefix: s.currency })}`;
  return `<fieldset class="mk-ext${e.on ? ' is-on' : ''}" data-row="${e.id}">
<legend class="mk-ext__legend"><label class="mk-check" for="${esc(id('on'))}"><input type="checkbox" id="${esc(id('on'))}" data-f="on"${e.on ? ' checked' : ''} /><span>${esc(label)}</span></label>${EXTENSION_LABELS[e.id].ansoff ? ` <span class="small muted">${esc(EXTENSION_LABELS[e.id].ansoff ?? '')}</span>` : ''}</legend>
<div class="mk-ext__grid">${textField({ id: id('detail'), f: 'detail', label: 'What it is', value: e.detail, max: 160, cls: 'mk-span-3' })}${fields}</div>
</fieldset>`;
}

export function plcFiguresHtml(v: PlcView, s: PlcState): string {
  const yr = (y: number | null) => (y === null ? 'Not within the horizon' : `Year ${y}`);
  return [
    fig('Profit first positive', esc(yr(v.base.firstProfit)), 'without any extension'),
    fig('Net cash flow first positive', esc(yr(v.base.firstCash))),
    fig('Everything spent paid back', esc(yr(v.base.payback)), 'cumulative cash flow back to zero'),
    fig('Most cash the product needs', esc(money(-v.base.peakNeed, s)), `the lowest cumulative cash flow, in year ${v.base.peakNeedYear}`),
    fig(`Total profit, years 0 to ${s.horizon}`, esc(money(v.base.totalProfit, s)), 'without any extension'),
    fig('What the extensions add', v.hasExtension ? esc(`${v.addedProfit >= 0 ? '+' : ''}${money(v.addedProfit, s)}`) : 'None chosen', v.hasExtension ? `profit, after ${money(v.extensionCost, s)} of one-off costs; cash ${v.addedCash >= 0 ? '+' : ''}${money(v.addedCash, s)}` : undefined),
  ].join('');
}

export function readPlc(v: PlcView, s: PlcState): { reading: string; implication: string } {
  const b = v.base;
  const parts = [
    `Development and the launch cost ${money(s.development + s.launchPromotion, s)} before the product has sold anything, so cash flows out first.`,
    b.firstProfit !== null ? `Profit turns positive in year ${b.firstProfit} (${stageOf(s, b.firstProfit).toLowerCase()})` : 'Profit never turns positive within the horizon',
  ];
  if (b.firstProfit !== null && b.firstCash !== null && b.firstCash > b.firstProfit) parts[1] += `, but net cash flow follows only in year ${b.firstCash}, because the business is still paying for equipment and for the stock and credit that growing sales tie up.`;
  else if (b.firstCash !== null) parts[1] += `, and net cash flow in year ${b.firstCash}.`;
  else parts[1] += '.';
  parts.push(b.payback !== null ? `The cumulative cash flow, at its lowest ${money(-b.peakNeed, s)} in year ${b.peakNeedYear}, is back to zero in year ${b.payback}: only then has the product paid for itself.` : `The cumulative cash flow is still ${money(b.finalCumulative, s)} at the end of the horizon: the product has not paid for itself.`);
  const lossAt = lossYear(s);
  if (lossAt !== null) parts.push(`If decline carried on, the product would stop covering its costs in year ${lossAt}.`);
  let implication: string;
  if (!v.hasExtension) implication = 'Profit and cash peak in maturity, which is when extension strategies are usually considered: choose one or more below and compare what they add with what they cost.';
  else {
    const chosen = s.extensions.filter((e) => e.on).map((e) => EXTENSION_LABELS[e.id].label.toLowerCase());
    implication =
      v.addedProfit > 0
        ? `On these assumptions, ${chosen.join(' and ')} from year ${s.extensionYear} ${chosen.length === 1 ? 'adds' : 'add'} ${money(v.addedProfit, s)} of profit over the horizon. It delays decline rather than preventing it: the extra sales fade, and the business still needs a replacement product.`
        : `On these assumptions, ${chosen.join(' and ')} from year ${s.extensionYear} ${chosen.length === 1 ? 'loses' : 'lose'} ${money(-v.addedProfit, s)} over the horizon: the extra sales do not cover the cost${s.extensions.some((e) => e.on && e.id === 'price-cut') ? ', and a price cut lowers the contribution on every unit' : ''}.`;
  }
  return { reading: parts.join(' '), implication };
}

/** The stages as bands over the year axis (year 0 to the horizon). */
export function stageBands(s: PlcState): Band[] {
  const out: Band[] = [];
  let cur: { stage: Stage; from: number } | null = null;
  for (let y = 0; y <= s.horizon; y += 1) {
    const st = stageOf(s, y);
    if (!cur || cur.stage !== st) {
      if (cur) out.push({ from: cur.from, to: y - 1, label: short(cur.stage) });
      cur = { stage: st, from: y };
    }
  }
  if (cur) out.push({ from: cur.from, to: s.horizon, label: short(cur.stage) });
  return out;
}
const short = (st: Stage) => (st === 'Development' ? 'Dev.' : st === 'Introduction' ? 'Intro.' : st);

export function salesChart(v: PlcView, s: PlcState, id: string): string {
  const years = v.base.years.map((y) => String(y.year));
  const series: LineSeries[] = [{ label: 'Sales', values: v.base.years.map((y) => y.units), color: C.ink, width: 2.8 }];
  if (v.hasExtension) series.push({ label: 'With extension', values: v.ext.years.map((y) => y.units), color: C.gold, width: 2.4, dash: '7 4' });
  const peak = Math.max(...v.base.years.map((y) => y.units));
  const desc = `Units sold each year from year 0 to year ${s.horizon}, with the stages marked. Sales start at ${fmtNumber(s.launch)} in year 1, reach a peak of ${fmtNumber(peak)} and fall to ${fmtNumber(v.base.years[v.base.years.length - 1]?.units ?? 0)} by year ${s.horizon}.${v.hasExtension ? ` With the extension from year ${s.extensionYear}, sales in year ${s.horizon} are ${fmtNumber(v.ext.years[v.ext.years.length - 1]?.units ?? 0)}.` : ''}`;
  return lineSvg({ id, title: 'Sales over the product life cycle', desc, xLabels: years, series, bands: stageBands(s), yLabel: `Units sold (${s.unit})`, xLabel: 'Year', markers: v.hasExtension ? [{ at: s.extensionYear, label: 'Extension', color: C.gold }] : [] });
}

export function cashChart(v: PlcView, s: PlcState, id: string): string {
  const run = v.hasExtension ? v.ext : v.base;
  const years = run.years.map((y) => String(y.year));
  const fmtK = (x: number) => fmtMoney(x, s.currency, 0);
  const desc = `Profit, net cash flow and cumulative cash flow each year${v.hasExtension ? ', with the extension' : ''}. The cumulative cash flow is lowest, at ${fmtK(run.peakNeed)}, in year ${run.peakNeedYear}${run.payback !== null ? `, and back above zero in year ${run.payback}` : ', and does not recover within the horizon'}.`;
  return lineSvg({
    id,
    title: 'Profit and cash flow over the life cycle',
    desc,
    xLabels: years,
    series: [
      { label: 'Profit', values: run.years.map((y) => y.profit), color: C.ink, width: 2.4 },
      { label: 'Net cash flow', values: run.years.map((y) => y.cash), color: C.cobalt, width: 2.2, dash: '6 4' },
      { label: 'Cumulative cash', values: run.years.map((y) => y.cumulative), color: C.green, width: 2.6, dash: '2 3', dots: true },
    ],
    bands: stageBands(s),
    yLabel: `${s.currency || 'Money'} a year`,
    xLabel: 'Year',
    yFormat: (x) => fmtMoney(x, s.currency, 0),
    markers: run.payback !== null ? [{ at: run.payback, label: 'Paid back', color: C.green }] : [],
    height: 360,
  });
}

export function plcRowsHtml(v: PlcView, s: PlcState): string {
  const run = v.hasExtension ? v.ext : v.base;
  const m = (x: number) => esc(money(x, s));
  return run.years
    .map(
      (y) =>
        `<tr${y.year === run.payback ? ' class="is-focus"' : ''}><th scope="row">${y.year}</th><td>${esc(y.stage)}</td><td class="n">${esc(fmtNumber(y.units))}</td><td class="n">${m(y.revenue)}</td><td class="n">${m(y.profit)}</td><td class="n">${m(-y.capex)}</td><td class="n">${m(-y.workingCapitalChange)}</td><td class="n">${m(y.cash)}</td><td class="n">${m(y.cumulative)}</td></tr>`,
    )
    .join('');
}

export function plcAnnouncement(v: PlcView, s: PlcState): string {
  const b = v.base;
  return `Payback ${b.payback === null ? 'not within the horizon' : `in year ${b.payback}`}; most cash needed ${money(-b.peakNeed, s)}.${v.hasExtension ? ` Extensions add ${money(v.addedProfit, s)} of profit.` : ''}`;
}

export { plcView };

/** A plain-text summary to copy: the reading, then the year-by-year figures. */
export function plcSummary(s: PlcState): string {
  const v = plcView(s);
  const r = readPlc(v, s);
  const run = v.hasExtension ? v.ext : v.base;
  const m = (x: number) => money(x, s);
  return [
    `Product life cycle: ${s.product} (illustrative model, simulated figures)`,
    r.reading,
    r.implication,
    '',
    'Year | Stage | Units | Profit | Net cash flow | Cumulative',
    ...run.years.map((y) => `${y.year} | ${y.stage} | ${fmtNumber(y.units)} | ${m(y.profit)} | ${m(y.cash)} | ${m(y.cumulative)}`),
  ].join('\n');
}
