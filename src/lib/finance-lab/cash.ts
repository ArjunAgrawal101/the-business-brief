/**
 * The lab's cash flow forecast: up to twelve months, any number of inflow and
 * outflow lines, an opening balance and an agreed overdraft limit, laid out as
 * the guide lays out a forecast (figure 10, p. 63). The arithmetic is
 * customForecast() in src/lib/cashflow.ts, shared with the cash flow lab; so
 * are the table, the reading of the forecast and the working.
 */
import { bracket, customForecast, readForecast, STATUS_WORDS, type CashForecast, type ForecastLineInput } from '../cashflow';
import { closingWorking, forecastBodyHtml } from '../cashflow-render';
import { fmtNumber, round } from '../format';
import { esc } from '../markup';
import { CASH_FLOW } from './business';
import { cashLineSvg } from './charts';
import type { LabReport, Problem, Settings } from './types';
import { money2 } from './util';

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;
export const MAX_MONTHS = 12;
export const MAX_LINES = 12;

export interface CashState {
  startMonth: number;
  months: number;
  opening: number;
  overdraftLimit: number;
  inflows: ForecastLineInput[];
  outflows: ForecastLineInput[];
}

export const CASH_DEFAULTS: CashState = {
  startMonth: CASH_FLOW.startMonth,
  months: CASH_FLOW.months,
  opening: CASH_FLOW.opening,
  overdraftLimit: CASH_FLOW.overdraftLimit,
  inflows: CASH_FLOW.inflows.map((l) => ({ ...l, values: [...l.values] })),
  outflows: CASH_FLOW.outflows.map((l) => ({ ...l, values: [...l.values] })),
};

export const monthLabels = (start: number, n: number): string[] => Array.from({ length: n }, (_, i) => MONTH_NAMES[(start + i) % 12] ?? '');

/** What the reader typed: numbers may be null where a cell is blank or not a number. */
export interface CashInput {
  startMonth: number;
  months: number;
  opening: number | null;
  overdraftLimit: number | null;
  inflows: Array<{ id: string; label: string; values: Array<number | null> }>;
  outflows: Array<{ id: string; label: string; values: Array<number | null> }>;
}

export function validateCash(i: CashInput): Problem[] {
  const out: Problem[] = [];
  if (!Number.isInteger(i.months) || i.months < 1 || i.months > MAX_MONTHS) out.push({ field: 'months', message: `Choose between 1 and ${MAX_MONTHS} months.` });
  if (i.opening === null || !Number.isFinite(i.opening)) out.push({ field: 'opening', message: 'Enter a number for the opening balance (negative if the account starts overdrawn).' });
  if (i.overdraftLimit === null || !Number.isFinite(i.overdraftLimit)) out.push({ field: 'overdraftLimit', message: 'Enter a number for the overdraft limit (0 if there is none).' });
  else if (i.overdraftLimit < 0) out.push({ field: 'overdraftLimit', message: 'The overdraft limit cannot be negative; enter it as a positive amount.' });
  if (i.inflows.length + i.outflows.length === 0) out.push({ field: 'opening', message: 'Add at least one inflow or outflow line.' });
  const lines = [
    ...i.inflows.map((l) => ({ l, kind: 'inflow' })),
    ...i.outflows.map((l) => ({ l, kind: 'outflow' })),
  ];
  for (const { l, kind } of lines) {
    if (!l.label.trim()) out.push({ field: `${l.id}.label`, message: `Give this ${kind} a name.` });
    l.values.slice(0, i.months).forEach((v, m) => {
      if (v === null || !Number.isFinite(v)) out.push({ field: `${l.id}.m${m}`, message: `Enter a number for ${l.label.trim() || `this ${kind}`} in ${monthLabels(i.startMonth, i.months)[m]} (0 if none).` });
      else if (v < 0) out.push({ field: `${l.id}.m${m}`, message: `Enter ${l.label.trim() || `this ${kind}`} in ${monthLabels(i.startMonth, i.months)[m]} as a positive amount; ${kind === 'inflow' ? 'money going out belongs in the outflows' : 'money coming in belongs in the inflows'}.` });
    });
  }
  return out;
}

export function cashState(i: CashInput): CashState {
  const n = Math.min(MAX_MONTHS, Math.max(1, Math.round(i.months)));
  const line = (l: CashInput['inflows'][number]): ForecastLineInput => ({ id: l.id, label: l.label.trim().slice(0, 60), values: Array.from({ length: n }, (_, m) => l.values[m] ?? 0) });
  return { startMonth: ((Math.round(i.startMonth) % 12) + 12) % 12, months: n, opening: i.opening ?? 0, overdraftLimit: i.overdraftLimit ?? 0, inflows: i.inflows.map(line), outflows: i.outflows.map(line) };
}

export function forecastOf(st: CashState, inflowFactor = 1): CashForecast {
  return customForecast({
    months: monthLabels(st.startMonth, st.months),
    opening: st.opening,
    overdraftLimit: st.overdraftLimit,
    inflows: st.inflows.map((l) => ({ ...l, values: l.values.map((v) => round(v * inflowFactor, 2)) })),
    outflows: st.outflows,
  });
}

/** The forecast table in the guide's layout. */
export function forecastTableHtml(f: CashForecast, s: Settings, title: string): string {
  return `<div class="table-scroll fl-cff-wrap" role="region" aria-label="Cash flow forecast" tabindex="0"><table class="table cff"><caption>${esc(title)} <span class="muted">Negative figures in brackets.</span></caption><thead><tr><th scope="col" class="cff__unit">All figures in ${esc(s.currency.trim() || 'currency')}</th>${f.months.map((m) => `<th scope="col" class="n">${esc(m)}</th>`).join('')}</tr></thead><tbody>${forecastBodyHtml(f)}</tbody></table></div>`;
}

export function buildCash(st: CashState, s: Settings): LabReport {
  const c = s.currency;
  const f = forecastOf(st);
  const reading = readForecast(f, c);
  const overdrawn = f.status.filter((x) => x !== 'credit').length;
  const beyond = f.status.filter((x) => x === 'beyond').length;
  const focus = f.firstBeyond ?? f.lowest.month;
  const w = closingWorking(f, focus, c, 'the business');
  const first = closingWorking(f, 0, c, 'the business');
  const title = `Cash flow forecast, ${f.months[0]} to ${f.months[f.months.length - 1]}.`;
  const factors = [-0.2, -0.1, -0.05, 0, 0.05, 0.1];
  const sens = factors.map((k) => {
    const g = forecastOf(st, 1 + k);
    const nb = g.status.filter((x) => x === 'beyond').length;
    return { k, g, nb, row: { th: k === 0 ? 'As forecast' : `Inflows ${k > 0 ? '+' : '−'}${Math.abs(k * 100)}%`, cells: [`${money2(g.lowest.value, c)}`, g.months[g.lowest.month] ?? '', String(nb), `${money2(g.closing[g.closing.length - 1] ?? 0, c)}`], base: k === 0 } };
  });
  const tenDown = sens.find((x) => x.k === -0.1);
  const sensReading = tenDown
    ? `If cash inflows came in 10% below the forecast, the lowest balance would be ${money2(tenDown.g.lowest.value, c)} in ${tenDown.g.months[tenDown.g.lowest.month]}, ${tenDown.nb === 0 ? 'still within the overdraft limit' : `beyond the limit in ${tenDown.nb} ${tenDown.nb === 1 ? 'month' : 'months'}`}. Sales receipts are usually the least certain line in a forecast, so this is the test that matters most.`
    : '';
  const big = [...st.outflows].map((l) => ({ l, max: Math.max(...l.values) })).sort((a, b) => b.max - a.max)[0];
  const actions: string[] = [];
  if (f.firstBeyond !== null) {
    actions.push(`Act before ${f.months[f.firstBeyond]}: agree a larger overdraft or a short-term loan in advance, because the bank need not honour payments beyond the limit.`);
    actions.push('Move or spread a large one-off payment: delay a purchase to a stronger month, lease or rent instead of buying, or pay a bill in instalments.');
  } else if (f.lowest.value < 0) {
    actions.push('The account is overdrawn but within the limit: check the cost of overdraft interest, and keep a margin in case sales fall short.');
  }
  actions.push('Bring cash in sooner: invoice promptly, chase late payers, shorten credit terms or offer a small discount for prompt payment.');
  actions.push('Pay out later where it costs nothing: ask suppliers for longer credit, without damaging the relationship.');
  actions.push('Fit the fix to the cause: an overdraft suits a short or seasonal gap, but a business losing money every month needs to improve its profit, not just its cash.');
  return {
    headline: { label: 'Lowest closing balance', value: `${money2(f.lowest.value, c)}`, note: `${f.months[f.lowest.month]}; ${STATUS_WORDS[f.status[f.lowest.month] ?? 'credit'].toLowerCase()}` },
    figures: [
      { label: 'Closing balance at the end', value: `${money2(f.closing[f.closing.length - 1] ?? 0, c)}`, note: f.months[f.months.length - 1] },
      { label: 'Months overdrawn', value: String(overdrawn), note: `of ${f.months.length}` },
      { label: 'Months beyond the overdraft limit', value: String(beyond), note: beyond ? f.months.filter((_, i) => f.status[i] === 'beyond').map((m) => m.slice(0, 3)).join(', ') : `limit ${money2(f.limit, c)}` },
      { label: 'Net cash flow over the period', value: `${money2(f.netCash, c)}` },
      { label: 'Total cash inflows', value: money2(f.totalIn.reduce((a, b) => a + b, 0), c) },
      { label: 'Total cash outflows', value: money2(f.totalOut.reduce((a, b) => a + b, 0), c) },
    ],
    workings: [
      { title: `The first month: ${f.months[0]}’s closing balance`, working: first.working, interpretation: first.interpretation, implication: first.implication },
      ...(focus !== 0 ? [{ title: `The critical month: ${f.months[focus]}’s closing balance`, working: w.working, interpretation: w.interpretation, implication: w.implication }] : []),
    ],
    chart: {
      svg: cashLineSvg(f, { currency: c, id: 'fl-cash-flow-forecast-chart' }),
      caption: 'The line is the closing balance at the end of each month, the bars the net cash flow in it; the dashed line is the overdraft limit. A red dot marks a month beyond the limit.',
      table: {
        caption: 'Each month’s balance',
        head: ['Month', 'Opening balance', 'Net cash flow', 'Closing balance', 'Position'],
        rows: f.months.map((m, i) => ({ th: m, cells: [bracket(f.opening[i] ?? 0), bracket(f.net[i] ?? 0), bracket(f.closing[i] ?? 0), STATUS_WORDS[f.status[i] ?? 'credit']] })),
        numeric: [false, true, true, true, false],
      },
    },
    sensitivity: {
      title: 'If cash inflows fall short',
      intro: 'The forecast again with every inflow scaled up or down, and the outflows as entered: a simple stress test.',
      table: { caption: 'The forecast with inflows changed', head: ['Inflows', 'Lowest balance', 'In', 'Months beyond the limit', 'Final balance'], rows: sens.map((x) => x.row), numeric: [false, true, false, true, true] },
      reading: sensReading,
    },
    interpretation: {
      meaning: `${reading.headline} ${reading.detail}`,
      compare: `Compare the forecast with the actual figures as each month passes: the gap is the earliest warning. Compare the lowest balance with the overdraft limit and with the largest single payment${big ? `, here ${big.l.label.toLowerCase()} at up to ${money2(big.max, c)}` : ''}: a business needs a margin for error, not just a balance above zero. And compare the net cash flow with profit: a profitable business can still run short of cash.`,
      benchmarks: 'How much cash is enough depends on the business. One with steady daily cash sales needs a smaller buffer than one paid in a few large, late invoices, or one whose trade is seasonal. A forecast is only as good as its estimates, especially of sales and of when customers pay, and the further ahead it looks the less reliable it becomes, so it is updated as the actual figures arrive.',
      actions,
    },
    extra: forecastTableHtml(f, s, title),
    given: [
      { label: 'Months', value: `${f.months.length}, from ${f.months[0]}` },
      { label: 'Opening balance', value: `${money2(st.opening, c)}` },
      { label: 'Overdraft limit', value: money2(st.overdraftLimit, c) },
      { label: 'Inflow lines', value: st.inflows.map((l) => l.label).join('; ') || 'none' },
      { label: 'Outflow lines', value: st.outflows.map((l) => l.label).join('; ') || 'none' },
    ],
    announce: `Lowest closing balance ${money2(f.lowest.value, c)} in ${f.months[f.lowest.month]}. ${beyond ? `Beyond the overdraft limit in ${beyond} ${beyond === 1 ? 'month' : 'months'}.` : 'Within the overdraft limit throughout.'}`,
    csv: [
      ['Input', 'Opening balance', st.opening, c.trim()],
      ['Input', 'Overdraft limit', st.overdraftLimit, c.trim()],
      ['Forecast', 'Month', ...f.months],
      ['Forecast', 'Opening balance', ...f.opening],
      ...f.inflows.map((l) => ['Inflow', l.label, ...l.values]),
      ['Forecast', 'Total cash inflows', ...f.totalIn],
      ...f.outflows.map((l) => ['Outflow', l.label, ...l.values]),
      ['Forecast', 'Total cash outflows', ...f.totalOut],
      ['Forecast', 'Net cash flow', ...f.net],
      ['Forecast', 'Closing balance', ...f.closing],
      ['Forecast', 'Position', ...f.status.map((x) => STATUS_WORDS[x])],
      ...sens.map((x) => ['Sensitivity', x.row.th, round(x.g.lowest.value, 2), `lowest balance, ${x.g.months[x.g.lowest.month]}; months beyond the limit ${fmtNumber(x.nb)}`]),
    ],
  };
}
