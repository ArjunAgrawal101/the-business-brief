/**
 * The financial performance dashboard as a page: the DuPont analysis of
 * return on equity and its extended form, how much of each change in ROE
 * each factor accounts for, the cash conversion cycle, interest cover and
 * gearing, the IB's own ratios beside them, the checks on the accounts, a
 * reading of each measure that says what its movement means and where the
 * measure stops, and the CSV rows. Used by the server and the browser alike.
 */
import { fmtMoney, fmtNumber } from '../format';
import { esc, inline } from '../markup';
import type { TableSpec } from '../finance-lab/types';
import { COBALT, cycleSvg, GREEN, INK, smallMultiplesSvg } from './charts';
import { chartFigureHtml, figuresHtml, headlineHtml, readingHtml, STANDING_TAG, tableHtml, type Fig, type Standing } from './html';
import { ACCOUNT_FIELDS, measureYears, splitRoe, type PerformanceInput, type RoeSplit, type YearMeasures } from './performance';

export type PerformanceRegion = 'headline' | 'figures' | 'checks' | 'dupont' | 'split' | 'cycle' | 'finance' | 'ib' | 'readings' | 'given';

export interface PerformanceReport {
  years: YearMeasures[];
  splits: RoeSplit[];
  regions: Record<PerformanceRegion, string>;
  announce: string;
  summary: string;
  csv: Array<Array<string | number>>;
}

const p1 = (v: number | null) => (v === null ? 'n/a' : `${fmtNumber(v, 1)}%`);
const x2 = (v: number | null) => (v === null ? 'n/a' : fmtNumber(v, 2));
const d1 = (v: number | null) => (v === null ? 'n/a' : fmtNumber(v, 1));
const t1 = (v: number | null) => (v === null ? 'n/a' : `${fmtNumber(v, 1)} times`);
const t2 = (v: number | null) => (v === null ? 'n/a' : `${fmtNumber(v, 2)} times`);
const pts = (v: number) => `${fmtNumber(Math.abs(v), 1)} ${Math.abs(Math.round(v * 10) / 10) === 1 ? 'point' : 'points'}`;

function measureTable(rows: Array<{ label: string; standing: Standing; values: string[]; strong?: boolean }>, years: string[], caption: string, aria: string): string {
  const head = `<tr><th scope="col">Measure</th><th scope="col">Standing</th>${years.map((y) => `<th scope="col" class="n">${esc(y)}</th>`).join('')}</tr>`;
  const body = rows.map((r) => `<tr${r.strong ? ' class="is-strong"' : ''}><th scope="row">${esc(r.label)}</th><td class="af-standing">${STANDING_TAG[r.standing]}</td>${r.values.map((v) => `<td class="n">${esc(v)}</td>`).join('')}</tr>`).join('');
  return `<div class="table-scroll" role="region" aria-label="${esc(aria)}" tabindex="0"><table class="table fl-table af-compare"><caption>${esc(caption)}</caption><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}

/** "rose from 8.6% to 5.9%" with the right verb. */
function moved(a: number | null, b: number | null, f: (v: number | null) => string, tolerance = 0.05): string {
  if (a === null || b === null) return `moved from ${f(a)} to ${f(b)}`;
  if (Math.abs(b - a) < tolerance) return `held at about ${f(b)}`;
  return `${b > a ? 'rose' : 'fell'} from ${f(a)} to ${f(b)}`;
}

function splitText(s: RoeSplit): string {
  if (Math.abs(s.change) < 0.05) return `ROE was about the same in ${s.to} as in ${s.from}.`;
  const dir = s.change >= 0 ? 'rose' : 'fell';
  if (!s.parts) return `ROE ${dir} by ${pts(s.change)} from ${s.from} to ${s.to}; with a loss or negative equity in either year the change cannot be split between the factors.`;
  const noun = s.change >= 0 ? 'rise' : 'fall';
  const words = [
    { v: s.parts.margin, up: 'the higher net margin', down: 'the lower net margin' },
    { v: s.parts.turnover, up: 'the higher asset turnover', down: 'the lower asset turnover' },
    { v: s.parts.leverage, up: 'the higher equity multiplier (more leverage)', down: 'the lower equity multiplier (less leverage)' },
  ].filter((w) => Math.abs(w.v) >= 0.05);
  const name = (w: { v: number; up: string; down: string }) => (w.v >= 0 ? w.up : w.down);
  const sameWay = words.filter((w) => Math.sign(w.v) === Math.sign(s.change)).sort((x, y) => Math.abs(y.v) - Math.abs(x.v));
  const against = words.filter((w) => Math.sign(w.v) !== Math.sign(s.change));
  const [first, ...rest] = sameWay;
  const lead = first ? `${name(first)} accounts for ${pts(first.v)} of the ${noun}${rest.map((w) => ` and ${name(w)} for ${pts(w.v)}`).join('')}` : 'no single factor accounts for it';
  const back = against.map((w) => `${name(w)} ${s.change >= 0 ? 'took' : 'added'} ${pts(w.v)} ${s.change >= 0 ? 'off' : 'back'}`).join(', and ');
  return `ROE ${dir} by ${pts(s.change)} from ${s.from} to ${s.to}: ${lead}${back ? `; ${back}` : ''}.`;
}

export function buildPerformanceReport(input: PerformanceInput, currency: string): PerformanceReport {
  const ys = measureYears(input);
  const labels = ys.map((y) => y.label);
  const first = ys[0] as YearMeasures;
  const last = ys[ys.length - 1] as YearMeasures;
  const prev = ys[ys.length - 2] ?? first;
  const m = (v: number) => fmtMoney(v, currency, 0);
  const splits = ys.slice(1).map((y, i) => splitRoe(ys[i] as YearMeasures, y)).filter((s): s is RoeSplit => s !== null);
  const whole = splitRoe(first, last);

  const direction = last.roe === null || first.roe === null ? null : last.roe > first.roe + 0.05 ? 'up' : last.roe < first.roe - 0.05 ? 'down' : 'level';
  const headline = {
    label: `Return on equity, ${last.label}`,
    value: p1(last.roe),
    note: last.roe === null ? 'not defined: equity is not positive' : direction === null ? `${first.label}: not defined` : direction === 'level' ? `about the same as in ${first.label}` : `${direction} from ${p1(first.roe)} in ${first.label}`,
  };
  const figures: Fig[] = [
    { label: `Net profit margin, ${last.label}`, value: p1(last.netMargin), note: `${prev.label}: ${p1(prev.netMargin)}`, standing: 'beyond' },
    { label: `Asset turnover, ${last.label}`, value: t2(last.assetTurnover), note: `${prev.label}: ${t2(prev.assetTurnover)}`, standing: 'beyond' },
    { label: `Equity multiplier, ${last.label}`, value: t2(last.equityMultiplier), note: `${prev.label}: ${t2(prev.equityMultiplier)}`, standing: 'beyond' },
    { label: `Cash conversion cycle, ${last.label}`, value: last.cycle === null ? 'n/a' : `${d1(last.cycle)} days`, note: `${prev.label}: ${prev.cycle === null ? 'n/a' : `${d1(prev.cycle)} days`}`, standing: 'beyond' },
    { label: `Interest cover, ${last.label}`, value: t1(last.interestCover), note: `${prev.label}: ${t1(prev.interestCover)}`, standing: 'beyond' },
    { label: `Gearing, ${last.label}`, value: p1(last.gearing), note: 'the IB’s formula (3.6, HL)', standing: 'hl' },
  ];

  /* Checks */
  const problems = ys.flatMap((y) => [
    ...(y.balances ? [] : [`${y.label}: the statement of financial position does not balance. Assets less liabilities are ${m(y.equity + y.imbalance)}, but equity is ${m(y.equity)}, a difference of ${m(y.imbalance)}.`]),
    ...(y.retainedGap !== null && Math.abs(y.retainedGap) > 0.5 ? [`${y.label}: retained earnings do not follow from the year before. Last year’s retained earnings plus this year’s retained profit differ from the figure entered by ${m(y.retainedGap)}.`] : []),
  ]);
  const checks = problems.length
    ? `<div class="af-checks af-checks--warn" role="note"><p class="af-checks__h">The accounts need checking</p><ul>${problems.map((p) => `<li>${esc(p)}</li>`).join('')}</ul><p class="small">The measures below are worked from the figures as entered, but they cannot be trusted until the accounts agree.</p></div>`
    : `<div class="af-checks" role="note"><p class="af-checks__h">The accounts agree</p><p class="small">Every year’s statement of financial position balances, and retained earnings carry from each year to the next.</p></div>`;

  /* DuPont */
  const dupontRows = [
    { label: 'Return on equity (ROE)', standing: 'beyond' as Standing, values: ys.map((y) => p1(y.roe)), strong: true },
    { label: '= Net profit margin', standing: 'beyond' as Standing, values: ys.map((y) => p1(y.netMargin)) },
    { label: '× Asset turnover', standing: 'beyond' as Standing, values: ys.map((y) => (y.assetTurnover === null ? 'n/a' : fmtNumber(y.assetTurnover, 4))) },
    { label: '× Equity multiplier', standing: 'beyond' as Standing, values: ys.map((y) => (y.equityMultiplier === null ? 'n/a' : fmtNumber(y.equityMultiplier, 4))) },
    { label: 'Net profit margin = tax burden', standing: 'beyond' as Standing, values: ys.map((y) => (y.taxBurden === null ? 'n/a' : fmtNumber(y.taxBurden, 4))) },
    { label: '× Interest burden', standing: 'beyond' as Standing, values: ys.map((y) => (y.interestBurden === null ? 'n/a' : fmtNumber(y.interestBurden, 4))) },
    { label: '× Operating margin (the IB’s profit margin)', standing: 'ib' as Standing, values: ys.map((y) => p1(y.operatingMargin)) },
  ];
  const dupontChart = chartFigureHtml({
    svg: smallMultiplesSvg({
      id: 'af-dupont',
      title: 'Return on equity and its three factors',
      desc: ys.map((y) => `${y.label}: ROE ${p1(y.roe)}, net margin ${p1(y.netMargin)}, asset turnover ${x2(y.assetTurnover)}, equity multiplier ${x2(y.equityMultiplier)}`).join('; '),
      x: labels,
      panels: [
        { title: 'Return on equity', values: ys.map((y) => y.roe), text: (v) => `${fmtNumber(v, 1)}%`, colour: INK },
        { title: 'Net profit margin', values: ys.map((y) => y.netMargin), text: (v) => `${fmtNumber(v, 1)}%` },
        { title: 'Asset turnover (times)', values: ys.map((y) => y.assetTurnover), text: (v) => fmtNumber(v, 2) },
        { title: 'Equity multiplier (times)', values: ys.map((y) => y.equityMultiplier), text: (v) => fmtNumber(v, 2) },
      ],
    }),
    label: 'Return on equity and its three factors',
    caption: 'ROE (top left) is the product of the other three: net profit margin × asset turnover × equity multiplier. Each panel has its own scale.',
    table: { caption: 'The DuPont factors', head: ['Year', 'ROE', 'Net margin', 'Asset turnover', 'Equity multiplier'], rows: ys.map((y) => ({ th: y.label, cells: [p1(y.roe), p1(y.netMargin), x2(y.assetTurnover), x2(y.equityMultiplier)] })) },
  });
  const dupont = `${measureTable(dupontRows, labels, 'Return on equity, split by the DuPont identity', 'The DuPont analysis')}<p class="small muted af-identity">Check, ${last.label}: ${last.netMargin === null ? 'n/a' : `${fmtNumber(last.netMargin, 4)}%`} × ${last.assetTurnover === null ? 'n/a' : fmtNumber(last.assetTurnover, 4)} × ${last.equityMultiplier === null ? 'n/a' : fmtNumber(last.equityMultiplier, 4)} = ${last.netMargin !== null && last.assetTurnover !== null && last.equityMultiplier !== null ? `${fmtNumber(last.netMargin * last.assetTurnover * last.equityMultiplier, 2)}%` : 'n/a'}, the ROE of ${last.roe === null ? 'n/a' : `${fmtNumber(last.roe, 2)}%`}. Sales revenue and total assets cancel, which is why the three always multiply to ROE.</p>${dupontChart}`;

  /* The split of each change */
  const splitTable: TableSpec = {
    caption: 'How much of each change in ROE each factor accounts for, in percentage points',
    head: ['Change', 'ROE change', 'Net margin', 'Asset turnover', 'Equity multiplier'],
    rows: [...splits, ...(whole && ys.length > 2 ? [whole] : [])].map((s, i, all) => ({
      th: `${s.from} to ${s.to}`,
      cells: [signed(s.change), s.parts ? signed(s.parts.margin) : 'n/a', s.parts ? signed(s.parts.turnover) : 'n/a', s.parts ? signed(s.parts.leverage) : 'n/a'],
      strong: i === all.length - 1 && ys.length > 2,
    })),
  };
  const split = `${tableHtml(splitTable, 'How much of each change in ROE each factor accounts for')}<p class="small muted">Each factor’s part is its proportional change, measured in logarithms, weighted so that the three parts add up exactly to the change in ROE. The order in which the factors are taken makes no difference.</p>${readingHtml([...(splits.length ? [splitText(splits[splits.length - 1] as RoeSplit)] : []), ...(whole && ys.length > 2 ? [splitText(whole)] : [])].join(' '))}`;

  /* Working capital */
  const cycleRows = [
    { label: 'Stock days (average stock)', standing: 'hl' as Standing, values: ys.map((y) => d1(y.stockDays)) },
    { label: '+ Debtor days', standing: 'hl' as Standing, values: ys.map((y) => d1(y.debtorDays)) },
    { label: '− Creditor days', standing: 'hl' as Standing, values: ys.map((y) => d1(y.creditorDays)) },
    { label: '= Cash conversion cycle, days', standing: 'beyond' as Standing, values: ys.map((y) => d1(y.cycle)), strong: true },
    { label: 'One day of cost of sales', standing: 'beyond' as Standing, values: ys.map((y) => m(y.costPerDay)) },
  ];
  const cycle = `${measureTable(cycleRows, labels, 'The cash conversion cycle, in days', 'The cash conversion cycle')}${chartFigureHtml({
    svg: cycleSvg({ id: 'af-cycle', x: labels, stock: ys.map((y) => y.stockDays), debtors: ys.map((y) => y.debtorDays), creditors: ys.map((y) => y.creditorDays), cycle: ys.map((y) => y.cycle) }),
    label: 'The cash conversion cycle',
    caption: 'Days of stock and of credit to customers above the line, days of credit from suppliers below it; the thick mark is the cycle, the days between paying for goods and being paid for them.',
    table: { caption: 'The cycle in days', head: ['Year', 'Stock days', 'Debtor days', 'Creditor days', 'Cycle'], rows: ys.map((y) => ({ th: y.label, cells: [d1(y.stockDays), d1(y.debtorDays), d1(y.creditorDays), d1(y.cycle)] })) },
  })}`;

  /* Finance */
  const financeRows = [
    { label: 'Interest cover (times)', standing: 'beyond' as Standing, values: ys.map((y) => (y.interestCover === null ? 'no interest' : fmtNumber(y.interestCover, 1))) },
    { label: 'Gearing (non-current liabilities ÷ capital employed)', standing: 'hl' as Standing, values: ys.map((y) => p1(y.gearing)) },
    { label: 'All borrowing ÷ equity', standing: 'beyond' as Standing, values: ys.map((y) => p1(y.borrowingToEquity)) },
  ];
  const finance = `${measureTable(financeRows, labels, 'Interest cover and gearing', 'Interest cover and gearing')}${chartFigureHtml({
    svg: smallMultiplesSvg({
      id: 'af-finance',
      title: 'Interest cover and gearing',
      desc: ys.map((y) => `${y.label}: interest cover ${t1(y.interestCover)}, gearing ${p1(y.gearing)}, all borrowing to equity ${p1(y.borrowingToEquity)}`).join('; '),
      x: labels,
      columns: 3,
      panels: [
        { title: 'Interest cover (times)', values: ys.map((y) => y.interestCover), text: (v) => fmtNumber(v, 1), colour: GREEN },
        { title: 'Gearing, IB (%)', values: ys.map((y) => y.gearing), text: (v) => `${fmtNumber(v, 1)}%`, colour: INK },
        { title: 'All borrowing ÷ equity (%)', values: ys.map((y) => y.borrowingToEquity), text: (v) => `${fmtNumber(v, 1)}%`, colour: COBALT },
      ],
    }),
    label: 'Interest cover and gearing',
    caption: 'Interest cover falls and gearing rises as a business borrows more, or as its profit falls; each panel has its own scale.',
    table: { caption: 'Interest cover and gearing', head: ['Year', 'Interest cover', 'Gearing (IB)', 'All borrowing ÷ equity'], rows: ys.map((y) => ({ th: y.label, cells: [t1(y.interestCover), p1(y.gearing), p1(y.borrowingToEquity)] })) },
  })}`;

  /* The IB's ratios */
  const ibRows = [
    { label: 'Gross profit margin', standing: 'ib' as Standing, values: ys.map((y) => p1(y.grossMargin)) },
    { label: 'Profit margin', standing: 'ib' as Standing, values: ys.map((y) => p1(y.operatingMargin)) },
    { label: 'ROCE', standing: 'ib' as Standing, values: ys.map((y) => p1(y.roce)) },
    { label: 'Current ratio', standing: 'ib' as Standing, values: ys.map((y) => x2(y.currentRatio)) },
    { label: 'Acid test ratio', standing: 'ib' as Standing, values: ys.map((y) => x2(y.acidTest)) },
    { label: 'Stock turnover, days', standing: 'hl' as Standing, values: ys.map((y) => d1(y.stockDays)) },
    { label: 'Debtor days', standing: 'hl' as Standing, values: ys.map((y) => d1(y.debtorDays)) },
    { label: 'Creditor days', standing: 'hl' as Standing, values: ys.map((y) => d1(y.creditorDays)) },
    { label: 'Gearing ratio', standing: 'hl' as Standing, values: ys.map((y) => p1(y.gearing)) },
  ];
  const ib = measureTable(ibRows, labels, 'The IB’s ratios for the same years, with the guide’s formulas (3.5 and 3.6)', 'The IB ratios');

  /* Readings: what each movement means and where each measure stops */
  const readings: Array<{ title: string; standing: Standing; what: string; limit: string }> = [
    {
      title: 'Return on equity',
      standing: 'beyond',
      what: `${whole ? splitText(whole) : `ROE ${moved(first.roe, last.roe, p1)} between ${first.label} and ${last.label}.`} ${roeQuality(prev, last)}`,
      limit: 'ROE rises with borrowing as well as with better trading, so a higher ROE can mean more risk rather than better performance. Book equity reflects past profits and accounting choices, not what the shares are worth, and with small or negative equity the ratio means little.',
    },
    {
      title: 'Net profit margin',
      standing: 'beyond',
      what: `Profit for the year was ${p1(last.netMargin)} of sales revenue in ${last.label}, against ${p1(first.netMargin)} in ${first.label}. Within it, the operating margin (the IB’s profit margin) ${moved(first.operatingMargin, last.operatingMargin, p1)}, and the interest burden ${moved(first.interestBurden, last.interestBurden, (v) => (v === null ? 'n/a' : fmtNumber(v, 3)), 0.0005)}: ${interestWord(first, last)}`,
      limit: 'It is struck after interest and tax, so financing and tax decisions move it as well as trading. Margins differ widely between industries, so compare it with the business’s own past and with businesses in the same industry.',
    },
    {
      title: 'Asset turnover',
      standing: 'beyond',
      what: `Each ${currency}1 of assets produced ${first.assetTurnover === null ? 'n/a' : fmtMoney(first.assetTurnover, currency, 2)} of sales revenue in ${first.label} and ${last.assetTurnover === null ? 'n/a' : fmtMoney(last.assetTurnover, currency, 2)} in ${last.label}: ${turnoverWord(first, last)}`,
      limit: 'Old, heavily depreciated assets make turnover look high, and new investment makes it fall before the sales it was bought for arrive. Year-end assets may not represent the year, and assets that are leased or not on the statement change the picture.',
    },
    {
      title: 'Equity multiplier',
      standing: 'beyond',
      what: `Total assets were ${x2(first.equityMultiplier)} times equity in ${first.label} and ${x2(last.equityMultiplier)} times in ${last.label}: ${(last.equityMultiplier ?? 0) > (first.equityMultiplier ?? 0) ? 'a larger share of the assets is now financed by liabilities, which lifts ROE while profits hold but deepens any fall' : 'the owners now finance a larger share of the assets, which makes ROE lower but steadier'}.`,
      limit: 'It counts every liability, trade creditors included, not only borrowing, so read it beside gearing and interest cover.',
    },
    {
      title: 'Cash conversion cycle',
      standing: 'beyond',
      what: `The cycle ${moved(first.cycle, last.cycle, (v) => (v === null ? 'n/a' : `${fmtNumber(v, 1)} days`))}. Stock days ${moved(first.stockDays, last.stockDays, d1)}, debtor days ${moved(first.debtorDays, last.debtorDays, d1)} and creditor days ${moved(first.creditorDays, last.creditorDays, d1)}. ${cycleWord(first, last)} In ${last.label} one day of the cycle ties up about ${m(last.costPerDay)}, a day of cost of sales.`,
      limit: 'It is built from year-end balances, so a seasonal business can look better or worse than it is. A short cycle bought by paying suppliers late can cost discounts and goodwill. The IB’s creditor days divide by cost of sales, not by purchases, and stock days here use average stock, as the guide does.',
    },
    {
      title: 'Interest cover',
      standing: 'beyond',
      what: `Profit before interest and tax covered the interest ${t1(first.interestCover)} in ${first.label} and ${t1(last.interestCover)} in ${last.label}. ${coverWord(first, last)}`,
      limit: 'Profit is not cash, and cover ignores the repayments of the loans themselves, which also need cash; one year’s profit can be unusual. Lenders often write a minimum cover into a loan agreement, so a fall can matter before the interest becomes hard to pay.',
    },
    {
      title: 'Gearing',
      standing: 'hl',
      what: `The IB’s gearing ratio, long-term borrowing as a share of capital employed, ${moved(first.gearing, last.gearing, p1)}. Counting short-term loans and any overdraft too, borrowing ${moved(first.borrowingToEquity, last.borrowingToEquity, p1)} of equity.`,
      limit: 'The guide’s ratio counts only non-current liabilities, so short-term loans and an overdraft, which can be large, are left out; both measures use book values, not what the debt or the business would fetch.',
    },
  ];
  const readingsHtml = readings
    .map((r) => `<section class="fl-read__part af-reading"><h3 class="fl-read__h">${esc(r.title)} ${STANDING_TAG[r.standing]}</h3><p>${inline(r.what.replace(/\s+/g, ' ').trim())}</p><p class="af-reading__limit"><strong>Where it stops.</strong> ${inline(r.limit)}</p></section>`)
    .join('');

  const given = ACCOUNT_FIELDS.flatMap((g) => g.fields).flatMap((f) => input.years.map((y) => ({ label: `${f.label}, ${y.label}`, value: m(y.statement[f.key as keyof typeof y.statement]) })));
  const accountsTable: TableSpec = {
    caption: `The accounts, in ${currency.trim() || 'currency'}`,
    head: ['Line', ...labels],
    rows: [{ th: `Stock at the start of ${first.label}`, cells: [m(input.openingStock), ...labels.slice(1).map(() => '')] }, ...ACCOUNT_FIELDS.flatMap((g) => g.fields).map((f) => ({ th: f.label, cells: input.years.map((y) => m(y.statement[f.key as keyof typeof y.statement])) }))],
  };
  const cur = currency.trim() || 'currency';
  const csv: Array<Array<string | number>> = [
    ['Input', 'Stock at the start of the first year', input.openingStock, cur],
    ...given.map((g) => ['Input', g.label, g.value, '']),
    ...ys.flatMap((y) => [
      ['Result', `${y.label}: return on equity`, r6(y.roe), '%'],
      ['Result', `${y.label}: net profit margin`, r6(y.netMargin), '%'],
      ['Result', `${y.label}: asset turnover`, r6(y.assetTurnover), 'times'],
      ['Result', `${y.label}: equity multiplier`, r6(y.equityMultiplier), 'times'],
      ['Result', `${y.label}: cash conversion cycle`, r6(y.cycle), 'days'],
      ['Result', `${y.label}: interest cover`, r6(y.interestCover), 'times'],
      ['Result', `${y.label}: gearing (IB)`, r6(y.gearing), '%'],
      ['Result', `${y.label}: all borrowing to equity`, r6(y.borrowingToEquity), '%'],
    ]),
    ...splits.map((s) => ['ROE change', `${s.from} to ${s.to}`, `${r6(s.change)} = ${s.parts ? `${r6(s.parts.margin)} + ${r6(s.parts.turnover)} + ${r6(s.parts.leverage)}` : 'n/a'}`, 'points']),
  ];
  const regions: Record<PerformanceRegion, string> = {
    headline: headlineHtml(headline),
    figures: figuresHtml(figures),
    checks,
    dupont,
    split,
    cycle,
    finance,
    ib,
    readings: readingsHtml,
    given: tableHtml(accountsTable, 'The accounts'),
  };
  return {
    years: ys,
    splits,
    regions,
    announce: `Return on equity in ${last.label}: ${p1(last.roe)}; cash conversion cycle ${last.cycle === null ? 'n/a' : `${d1(last.cycle)} days`}; interest cover ${t1(last.interestCover)}.`,
    summary: `ROE ${p1(first.roe)} in ${first.label}, ${p1(last.roe)} in ${last.label}; cycle ${last.cycle === null ? 'n/a' : `${d1(last.cycle)} days`}.`,
    csv,
  };
}

const r6 = (v: number | null): number | string => (v === null ? 'n/a' : Math.round(v * 1e6) / 1e6);
const signed = (v: number) => (Math.abs(v) < 0.005 ? '0.00' : `${v > 0 ? '+' : '−'}${fmtNumber(Math.abs(v), 2)}`);

function roeQuality(prev: YearMeasures, last: YearMeasures): string {
  const s = splitRoe(prev, last);
  if (!s?.parts) return '';
  if (s.parts.leverage > 0 && s.parts.margin + s.parts.turnover < 0) return `In ${last.label} more leverage held ROE up while the business earned less on each sale and on its assets: a weaker kind of return than the figure alone suggests.`;
  if (s.parts.margin + s.parts.turnover > 0) return `In ${last.label} the trading itself improved, through ${s.parts.margin >= s.parts.turnover ? 'the margin' : 'turnover'}, which is the more durable kind of rise.`;
  return '';
}

function interestWord(a: YearMeasures, b: YearMeasures): string {
  if (a.interestBurden === null || b.interestBurden === null) return 'interest cannot be compared.';
  if (b.interestBurden < a.interestBurden - 0.0005) return 'interest took a larger share of the operating profit.';
  if (b.interestBurden > a.interestBurden + 0.0005) return 'interest took a smaller share of the operating profit.';
  return 'interest took about the same share of the operating profit.';
}

function turnoverWord(a: YearMeasures, b: YearMeasures): string {
  if (a.assetTurnover === null || b.assetTurnover === null) return 'the two years cannot be compared.';
  const salesGrowth = a.revenue > 0 ? (b.revenue / a.revenue - 1) * 100 : null;
  const assetGrowth = a.totalAssets > 0 ? (b.totalAssets / a.totalAssets - 1) * 100 : null;
  const growth = salesGrowth !== null && assetGrowth !== null ? ` Sales revenue grew ${fmtNumber(salesGrowth, 0)}% over the period and total assets ${fmtNumber(assetGrowth, 0)}%.` : '';
  if (b.assetTurnover < a.assetTurnover - 0.005) return `the assets grew faster than the sales they produce, as happens while new investment is still to earn its keep.${growth}`;
  if (b.assetTurnover > a.assetTurnover + 0.005) return `the assets are working harder, producing more sales for each unit invested.${growth}`;
  return `the assets produce about the same sales as before.${growth}`;
}

function cycleWord(a: YearMeasures, b: YearMeasures): string {
  if ([a.stockDays, a.debtorDays, a.creditorDays, b.stockDays, b.debtorDays, b.creditorDays].some((v) => v === null)) return '';
  const tiedUp = ((b.stockDays as number) - (a.stockDays as number)) + ((b.debtorDays as number) - (a.debtorDays as number));
  const supplier = (b.creditorDays as number) - (a.creditorDays as number);
  if (tiedUp > 1 && supplier > 1) return `Stock and customers now take ${fmtNumber(tiedUp, 1)} more days between them, and ${supplier >= tiedUp ? 'all' : `${fmtNumber((supplier / tiedUp) * 100, 0)}%`} of that has been funded by paying suppliers ${fmtNumber(supplier, 1)} days later: the cycle looks steadier than the business behind it.`;
  if (tiedUp > 1) return `Stock and customers now take ${fmtNumber(tiedUp, 1)} more days between them, and more cash is tied up in working capital as a result.`;
  if (tiedUp < -1) return `Stock and customers now take ${fmtNumber(-tiedUp, 1)} fewer days between them, which frees cash.`;
  return '';
}

function coverWord(a: YearMeasures, b: YearMeasures): string {
  if (a.interestCover === null || b.interestCover === null) return 'With no interest in one of the years, cover cannot be compared.';
  if (b.interestCover < a.interestCover) return `Profit could fall by ${fmtNumber((1 - 1 / b.interestCover) * 100, 0)}% before it no longer covered the interest, against ${fmtNumber((1 - 1 / a.interestCover) * 100, 0)}% in ${a.label}: the cushion for lenders is thinner.`;
  return `Profit could fall by ${fmtNumber((1 - 1 / b.interestCover) * 100, 0)}% before it no longer covered the interest: a wider cushion for lenders than in ${a.label}.`;
}

