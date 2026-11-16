/**
 * Break-even scenarios as a page: the two cost structures side by side, the
 * indifference volume, profit at each volume, the profit-volume chart, the
 * working for each structure in the platform's eight parts, the readings and
 * the CSV rows. Used by the server and the browser alike.
 */
import { buildWorking, type Working } from '../finance';
import { fmtMoney, fmtNumber, round, units as plural } from '../format';
import { esc, inline } from '../markup';
import { workingHtml } from '../render';
import type { Settings, TableSpec } from '../finance-lab/types';
import { COBALT, INK, profitVolumeSvg } from './charts';
import { compareStructures, type Comparison, type CostStructureInput, type StructureResult } from './cost-structure';
import { bullets, chartFigureHtml, figuresHtml, headlineHtml, paras, readingHtml, STANDING_TAG, tableHtml, type Fig, type Standing } from './html';

export type CostRegion = 'headline' | 'figures' | 'compare' | 'profits' | 'chart' | 'workings' | 'meaning' | 'actions' | 'given';

export interface CostReport {
  comparison: Comparison;
  regions: Record<CostRegion, string>;
  announce: string;
  summary: string;
  csv: Array<Array<string | number>>;
}

const count = (v: number, s: Settings) => `${fmtNumber(v)} ${plural(v, s.unit, s.units)}`;

function compareHtml(rows: Array<{ label: string; standing: Standing; a: string; b: string; strong?: boolean }>, names: [string, string], caption: string): string {
  const head = `<tr><th scope="col">Measure</th><th scope="col">Standing</th><th scope="col" class="n">${esc(names[0])}</th><th scope="col" class="n">${esc(names[1])}</th></tr>`;
  const body = rows.map((r) => `<tr${r.strong ? ' class="is-strong"' : ''}><th scope="row">${esc(r.label)}</th><td class="af-standing">${STANDING_TAG[r.standing]}</td><td class="n">${esc(r.a)}</td><td class="n">${esc(r.b)}</td></tr>`).join('');
  return `<div class="table-scroll" role="region" aria-label="The two cost structures side by side" tabindex="0"><table class="table fl-table af-compare"><caption>${esc(caption)}</caption><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}

function indifferenceWorking(c: Comparison, s: Settings, currency: string): Working {
  const { a, b, price } = c.input;
  const ca = price - a.variableCost;
  const cb = price - b.variableCost;
  const m0 = (v: number) => fmtMoney(v, currency, Number.isInteger(round(v, 2)) ? 0 : 2);
  const m2 = (v: number) => fmtMoney(v, currency, 2);
  const v = c.verdict;
  const base = {
    given: [
      { label: `Selling price per ${s.unit}`, value: m2(price) },
      { label: `${a.name}: fixed costs per ${s.period}`, value: m0(a.fixedCosts) },
      { label: `${a.name}: variable cost per ${s.unit}`, value: m2(a.variableCost) },
      { label: `${b.name}: fixed costs per ${s.period}`, value: m0(b.fixedCosts) },
      { label: `${b.name}: variable cost per ${s.unit}`, value: m2(b.variableCost) },
    ],
    formula: 'Indifference volume = (fixed costs of A − fixed costs of B) ÷ (contribution per unit of A − contribution per unit of B)',
    substitution: `= (${fmtNumber(a.fixedCosts, 2)} − ${fmtNumber(b.fixedCosts, 2)}) ÷ (${fmtNumber(ca, 2)} − ${fmtNumber(cb, 2)})`,
    unit: `${s.units} per ${s.period}`,
  };
  if (v.kind === 'crosses') {
    return {
      ...base,
      steps: [`Contribution per ${s.unit}: ${a.name} ${m2(price)} − ${m2(a.variableCost)} = ${m2(ca)}; ${b.name} ${m2(price)} − ${m2(b.variableCost)} = ${m2(cb)}`, `${fmtNumber(a.fixedCosts - b.fixedCosts, 2)} ÷ ${fmtNumber(ca - cb, 2)} = ${fmtNumber(v.volume, 2)}`],
      answer: `${fmtNumber(v.volume, 2)} ${s.units}`,
      value: v.volume,
      note: `At this volume the two earn the same profit. Above it, ${v.above === 'a' ? a.name : b.name}, with the higher contribution per ${s.unit}, earns more; below it, ${v.above === 'a' ? b.name : a.name}, with the lower fixed costs, does.`,
    };
  }
  return {
    ...base,
    steps: [`Contribution per ${s.unit}: ${a.name} ${m2(ca)}; ${b.name} ${m2(cb)}`],
    answer: 'No indifference volume above zero',
    value: null,
    note: v.kind === 'same' ? 'The two structures are the same, so they earn the same at every volume.' : `${v.better === 'a' ? a.name : b.name} earns more at every volume: it has ${Math.abs(ca - cb) < 1e-12 ? 'the same contribution per unit and lower fixed costs' : 'the higher contribution per unit and fixed costs no higher'}.`,
  };
}

function structureRows(c: Comparison, s: Settings, currency: string) {
  const m = (v: number) => fmtMoney(v, currency, Number.isInteger(round(v, 2)) ? 0 : 2);
  const m2 = (v: number) => fmtMoney(v, currency, 2);
  const both = (f: (r: StructureResult) => string) => ({ a: f(c.a), b: f(c.b) });
  return [
    { label: `Fixed costs per ${s.period}`, standing: 'ib' as Standing, ...both((r) => m(r.structure.fixedCosts)) },
    { label: `Variable cost per ${s.unit}`, standing: 'ib' as Standing, ...both((r) => m2(r.structure.variableCost)) },
    { label: `Contribution per ${s.unit}`, standing: 'ib' as Standing, ...both((r) => m2(r.contribution)) },
    { label: 'Contribution as a share of the price', standing: 'beyond' as Standing, ...both((r) => `${fmtNumber(r.contributionRatio, 1)}%`) },
    { label: 'Break-even quantity', standing: 'ib' as Standing, ...both((r) => (r.breakEven === null ? 'none' : count(r.breakEven, s))), strong: true },
    { label: 'Break-even revenue', standing: 'ib' as Standing, ...both((r) => (r.breakEvenRevenue === null ? 'none' : m2(r.breakEvenRevenue))) },
    { label: 'Margin of safety', standing: 'ib' as Standing, ...both((r) => (r.marginOfSafety === null ? 'none' : `${count(r.marginOfSafety, s)}${r.marginOfSafetyShare === null ? '' : ` (${fmtNumber(r.marginOfSafetyShare, 1)}%)`}`)) },
    { label: `Profit at the forecast (${count(c.input.forecast, s)})`, standing: 'ib' as Standing, ...both((r) => m(r.profitAtForecast)), strong: true },
    { label: `Profit at capacity (${count(c.input.capacity, s)})`, standing: 'ib' as Standing, ...both((r) => m(r.profitAtCapacity)) },
    { label: 'Degree of operating leverage at the forecast', standing: 'hl' as Standing, ...both((r) => (r.operatingLeverage === null ? 'n/a: at or below break-even' : fmtNumber(r.operatingLeverage, 2))) },
  ];
}

export function buildCostReport(input: CostStructureInput, s: Settings, currency: string): CostReport {
  const c = compareStructures(input);
  const { a, b } = c;
  const m = (v: number) => fmtMoney(v, currency, Number.isInteger(round(v, 2)) ? 0 : 2);
  const v = c.verdict;
  const nameOf = (k: 'a' | 'b') => (k === 'a' ? input.a.name : input.b.name);
  const fromVolume = v.kind === 'crosses' ? Math.floor(v.volume + 1e-9) + 1 : null;

  const headline =
    v.kind === 'crosses'
      ? { label: 'Indifference volume', value: `${fmtNumber(v.volume, 1)} ${s.units} a ${s.period}`, note: `${nameOf(v.above)} earns more above it, from ${count(fromVolume ?? 0, s)}; ${nameOf(v.above === 'a' ? 'b' : 'a')} earns more below it` }
      : v.kind === 'dominates'
        ? { label: 'Indifference volume', value: 'None', note: `${nameOf(v.better)} earns more at every volume` }
        : { label: 'Indifference volume', value: 'None', note: 'the two structures earn the same at every volume' };

  const better = c.betterAtForecast;
  const higherDol = a.operatingLeverage !== null && b.operatingLeverage !== null ? (a.operatingLeverage > b.operatingLeverage ? 'a' : 'b') : null;
  const figures: Fig[] = [
    { label: 'Better at the forecast', value: better ? nameOf(better) : 'Neither', note: better ? `by ${m(c.gapAtForecast)} a ${s.period}` : 'the same profit', standing: 'beyond' },
    { label: 'Change in sales before the other earns more', value: c.switchShare === null ? 'n/a' : `${c.switchShare >= 0 ? '+' : '−'}${fmtNumber(Math.abs(c.switchShare), 1)}%`, note: c.switchShare === null ? 'one is better at every volume' : `from the forecast of ${count(input.forecast, s)}`, standing: 'beyond' },
    { label: 'Break-even quantity', value: `${a.breakEven === null ? 'none' : fmtNumber(a.breakEven)} and ${b.breakEven === null ? 'none' : fmtNumber(b.breakEven)}`, note: `${input.a.name}, then ${input.b.name}`, standing: 'ib' },
    { label: 'Margin of safety', value: `${a.marginOfSafetyShare === null ? 'n/a' : `${fmtNumber(a.marginOfSafetyShare, 1)}%`} and ${b.marginOfSafetyShare === null ? 'n/a' : `${fmtNumber(b.marginOfSafetyShare, 1)}%`}`, note: 'of forecast sales, in the same order', standing: 'ib' },
    { label: 'Degree of operating leverage', value: `${a.operatingLeverage === null ? 'n/a' : fmtNumber(a.operatingLeverage, 2)} and ${b.operatingLeverage === null ? 'n/a' : fmtNumber(b.operatingLeverage, 2)}`, note: higherDol ? `${nameOf(higherDol)} is the riskier structure` : 'not defined at or below break-even', standing: 'hl' },
  ];

  const names: [string, string] = [input.a.name, input.b.name];
  const compare = compareHtml(structureRows(c, s, currency), names, `The two cost structures at a price of ${fmtMoney(input.price, currency, 2)} a ${s.unit}`);
  const profitTable: TableSpec = {
    caption: `Profit per ${s.period} at each volume`,
    head: ['Volume', ...names, 'Difference', 'Earns more'],
    numeric: [false, true, true, true, false],
    rows: c.table.map((r) => ({ th: `${count(r.volume, s)} (${r.label})`, cells: [m(r.a), m(r.b), m(Math.abs(r.a - r.b)), Math.abs(r.a - r.b) < 0.005 ? 'Neither' : r.a > r.b ? input.a.name : input.b.name], base: r.base })),
  };
  const chart = chartFigureHtml({
    svg: profitVolumeSvg({
      id: 'af-profit-volume',
      a: { name: input.a.name, fixed: input.a.fixedCosts, contribution: a.contribution, breakEven: a.breakEven },
      b: { name: input.b.name, fixed: input.b.fixedCosts, contribution: b.contribution, breakEven: b.breakEven },
      forecast: input.forecast,
      capacity: input.capacity,
      indifference: v.kind === 'crosses' ? v.volume : null,
      currency: currency.trim(),
      units: s.units,
    }),
    label: 'Profit at each volume',
    caption: `Profit for each structure from no sales to beyond capacity. Each line starts at minus its fixed costs and rises by its contribution per ${s.unit}; it breaks even where it crosses zero. Where the lines cross, the two earn the same: the indifference volume.`,
    table: profitTable,
  });

  const labels = { unit: s.unit, units: s.units, period: s.period };
  const one = (r: StructureResult, k: 'a' | 'b') => {
    const st = r.structure;
    const be = buildWorking('break-even-quantity', { fixedCosts: st.fixedCosts, price: input.price, variableCost: st.variableCost }, currency, labels);
    const mos = buildWorking('margin-of-safety', { fixedCosts: st.fixedCosts, price: input.price, variableCost: st.variableCost, quantity: input.forecast }, currency, labels);
    const dolW: Working =
      r.operatingLeverage === null
        ? { given: [], formula: 'Degree of operating leverage = total contribution ÷ profit', substitution: '', steps: [], answer: 'Not defined', value: null, unit: 'a multiple', error: 'At or below break-even there is no profit to divide by, so the measure has no meaning.' }
        : {
            given: [
              { label: `Total contribution at ${count(input.forecast, s)}`, value: m(r.contribution * input.forecast) },
              { label: 'Profit at the forecast', value: m(r.profitAtForecast) },
            ],
            formula: 'Degree of operating leverage = total contribution ÷ profit',
            substitution: `= ${fmtNumber(r.contribution * input.forecast, 2)} ÷ ${fmtNumber(r.profitAtForecast, 2)}`,
            steps: [`${fmtNumber(r.contribution * input.forecast, 2)} ÷ ${fmtNumber(r.profitAtForecast, 2)} = ${fmtNumber(r.operatingLeverage, 4)}`],
            answer: fmtNumber(r.operatingLeverage, 2),
            value: r.operatingLeverage,
            unit: 'a multiple: the per cent change in profit for each 1% change in sales',
            note: 'The guide names operating leverage in 5.6 (HL) but gives no formula; this is the standard one the platform’s notes use.',
          };
    return `<details class="disclosure af-working"${k === 'a' ? ' open' : ''}><summary>${esc(st.name)}: break-even, margin of safety and operating leverage</summary><div class="disclosure__body"><h4 class="af-working__h">Break-even quantity ${STANDING_TAG.ib}</h4>${workingHtml(be, inline(r.breakEven === null ? 'Each unit does not cover its own variable cost, so no volume breaks even.' : `${st.name} covers every cost from ${count(r.breakEven, s)} a ${s.period}.`), inline('A lower break-even leaves more room for sales to fall before a loss.'))}<h4 class="af-working__h">Margin of safety ${STANDING_TAG.ib}</h4>${workingHtml(mos, inline(r.marginOfSafety === null ? 'There is no margin of safety without a break-even point.' : `Sales could fall by ${count(Math.max(0, r.marginOfSafety), s)} before ${st.name} makes a loss.`), inline('The margin of safety is the cushion against a forecast that proves too high.'))}<h4 class="af-working__h">Degree of operating leverage ${STANDING_TAG.hl}</h4>${workingHtml(dolW, inline(r.operatingLeverage === null ? 'Not defined here.' : `A 10% fall in sales would cut profit by about ${fmtNumber(r.operatingLeverage * 10, 1)}%.`), inline('The higher the leverage, the more profit swings with sales: more reward when sales rise, more risk when they fall.'))}</div></details>`;
  };
  const indiff = indifferenceWorking(c, s, currency);
  const workings = `${one(a, 'a')}${one(b, 'b')}<details class="disclosure af-working"><summary>The indifference volume</summary><div class="disclosure__body"><h4 class="af-working__h">Indifference volume ${STANDING_TAG.beyond}</h4>${workingHtml(indiff, inline(v.kind === 'crosses' ? `The two earn the same profit at ${fmtNumber(v.volume, 1)} ${s.units} a ${s.period}.` : 'The two lines do not cross at a positive volume.'), inline(v.kind === 'crosses' ? `Choose ${nameOf(v.above)} only if sales are expected to stay above ${count(fromVolume ?? 0, s)}.` : 'The choice does not depend on the volume.'))}</div></details>`;

  /* Readings */
  const meaning: string[] = [];
  if (v.kind === 'crosses') {
    const above = nameOf(v.above);
    const below = nameOf(v.above === 'a' ? 'b' : 'a');
    meaning.push(`**${above}** has the higher contribution per ${s.unit} and the higher fixed costs, so it earns more only when volume is high enough to spread those costs: above **${fmtNumber(v.volume, 1)} ${s.units} a ${s.period}**. Below that, ${below} earns more.`);
    if (better) meaning.push(`At the forecast of ${count(input.forecast, s)}, ${nameOf(better)} earns ${m(c.gapAtForecast)} a ${s.period} more. ${c.switchShare !== null ? `Sales would have to ${c.switchShare >= 0 ? 'rise' : 'fall'} by ${fmtNumber(Math.abs(c.switchShare), 1)}% before ${c.switchShare >= 0 ? above : below} earned more${v.volume > input.capacity ? `, which is beyond the capacity of ${count(input.capacity, s)}` : ''}.` : ''}`);
  } else if (v.kind === 'dominates') meaning.push(`**${nameOf(v.better)}** earns more at every volume, so the choice does not depend on how many ${s.units} are sold; check the costs the comparison leaves out before choosing it.`);
  else meaning.push('The two structures are identical, so neither earns more.');
  if (a.operatingLeverage !== null && b.operatingLeverage !== null) {
    const hi = a.operatingLeverage > b.operatingLeverage ? a : b;
    const lo = hi === a ? b : a;
    meaning.push(`Risk differs as well as profit. At the forecast, ${hi.structure.name} has a degree of operating leverage of ${fmtNumber(hi.operatingLeverage ?? 0, 2)} against ${fmtNumber(lo.operatingLeverage ?? 0, 2)}: a 10% fall in sales would cut its profit by about ${fmtNumber((hi.operatingLeverage ?? 0) * 10, 1)}%, against ${fmtNumber((lo.operatingLeverage ?? 0) * 10, 1)}%. ${hi.marginOfSafetyShare !== null && lo.marginOfSafetyShare !== null ? `Its margin of safety is ${fmtNumber(hi.marginOfSafetyShare, 1)}% of forecast sales, against ${fmtNumber(lo.marginOfSafetyShare, 1)}%. The two measures tell the same story: worked with the exact break-even volume, before rounding up, the degree of operating leverage is one divided by the margin of safety as a share of sales.` : ''}`);
  }
  const actions = [
    v.kind === 'crosses' ? `Test the sales forecast before committing: the decision turns on whether sales stay ${v.above === (better ?? v.above) ? 'above' : 'below'} ${count(Math.ceil(v.volume - 1e-9), s)}, so ask how confident the business is, and for how many years.` : 'Check the figures the comparison leaves out: the two structures may differ in quality, flexibility and risk as well as cost.',
    'Weigh flexibility: fixed costs are hard to cut if demand falls, while variable costs fall with it. A business with uncertain demand may accept a higher cost per unit for the lower risk.',
    'Look beyond one period: an investment that raises fixed costs usually needs finance, and its interest is not in these break-even figures; the integrated forecast includes it.',
    'Count what is not in the numbers: control of quality and delivery, the staff affected, dependence on one supplier, and the time and attention each option takes.',
  ];

  const given = [
    { label: `Selling price per ${s.unit}`, value: fmtMoney(input.price, currency, 2) },
    { label: `Forecast sales per ${s.period}`, value: count(input.forecast, s) },
    { label: `Capacity per ${s.period}`, value: count(input.capacity, s) },
    ...(['a', 'b'] as const).flatMap((k) => [
      { label: `${input[k].name}: fixed costs per ${s.period}`, value: m(input[k].fixedCosts) },
      { label: `${input[k].name}: variable cost per ${s.unit}`, value: fmtMoney(input[k].variableCost, currency, 2) },
    ]),
  ];
  const cur = currency.trim() || 'currency';
  const csv: Array<Array<string | number>> = [
    ...given.map((g) => ['Input', g.label, g.value, '']),
    ...(['a', 'b'] as const).flatMap((k) => {
      const r = c[k];
      return [
        ['Result', `${input[k].name}: contribution per ${s.unit}`, round(r.contribution, 4), cur],
        ['Result', `${input[k].name}: break-even quantity`, r.breakEven ?? 'none', s.units],
        ['Result', `${input[k].name}: break-even revenue`, r.breakEvenRevenue === null ? 'none' : round(r.breakEvenRevenue, 2), cur],
        ['Result', `${input[k].name}: margin of safety`, r.marginOfSafety ?? 'none', s.units],
        ['Result', `${input[k].name}: profit at the forecast`, round(r.profitAtForecast, 2), cur],
        ['Result', `${input[k].name}: degree of operating leverage`, r.operatingLeverage === null ? 'n/a' : round(r.operatingLeverage, 4), ''],
      ];
    }),
    ['Result', 'Indifference volume', v.kind === 'crosses' ? round(v.volume, 4) : 'none', s.units],
    ...c.table.map((r) => ['Profit at a volume', `${fmtNumber(r.volume)} ${s.units}`, `${round(r.a, 2)} | ${round(r.b, 2)}`, cur]),
  ];
  const regions: Record<CostRegion, string> = {
    headline: headlineHtml(headline),
    figures: figuresHtml(figures),
    compare,
    profits: `${tableHtml(profitTable, 'Profit at each volume', 'fl-sens__table')}${readingHtml(v.kind === 'crosses' ? `The difference between the two grows by ${fmtMoney(Math.abs(a.contribution - b.contribution), currency, 2)} for every ${s.unit} sold: the gap in contribution per ${s.unit}. It is zero at the indifference volume, ${fmtNumber(v.volume, 1)} ${s.units}.` : 'One structure earns more at every volume in the table.')}`,
    chart,
    workings,
    meaning: paras(meaning),
    actions: bullets(actions),
    given: given.map((g) => `<div><dt>${esc(g.label)}</dt><dd>${esc(g.value)}</dd></div>`).join(''),
  };
  return {
    comparison: c,
    regions,
    announce: v.kind === 'crosses' ? `Indifference volume ${fmtNumber(v.volume, 1)} ${s.units}; at the forecast ${better ? `${nameOf(better)} earns more` : 'the two earn the same'}.` : headline.note,
    summary: v.kind === 'crosses' ? `Indifference at ${fmtNumber(v.volume, 1)} ${s.units} a ${s.period}; ${better ? `${nameOf(better)} better at the forecast` : 'level at the forecast'}.` : `${headline.note}.`,
    csv,
  };
}

export const STRUCTURE_COLOURS = { a: INK, b: COBALT } as const;
