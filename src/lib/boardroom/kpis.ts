/**
 * The Boardroom's measures: what each KPI is called, how it is written, which
 * way is better and which part of the business it belongs to. One definition,
 * used by the dashboard, the consequence panels, the exhibits, the scorecards
 * and the narrative tokens, on the server and in the browser.
 */
import { fmtNumber } from '../format';
import type { KpiId, Kpis } from './engine';
import type { FunctionId } from './roles';

export type KpiKind = 'money' | 'price' | 'units' | 'percent' | 'points' | 'ratio' | 'index' | 'people' | 'days' | 'perUnit' | 'tonnes' | 'perWorker';

export interface KpiDef {
  id: KpiId;
  label: string;
  /** A short label for the dashboard tiles. */
  short: string;
  kind: KpiKind;
  better: 'higher' | 'lower' | 'context';
  fn: FunctionId;
  /** What it measures, in one sentence. */
  means: string;
  /** The formula, in the guide's notation where the guide gives one (pp. 64 to 65). */
  formula?: string;
}

/** What the formatter needs to know about a scenario. */
export interface FormatContext {
  symbol: string;
  unit: string;
  units: string;
  /** The label and unit of the sustainability measure, if there is one. */
  sustainUnit?: string;
}

const K = (def: KpiDef): KpiDef => def;

export const KPI_DEFS: Record<KpiId, KpiDef> = {
  revenue: K({ id: 'revenue', label: 'Sales revenue', short: 'Revenue', kind: 'money', better: 'higher', fn: 'marketing', means: 'What customers paid for the units sold in the period.', formula: 'Sales revenue = price × quantity sold, added over the channels' }),
  avgPrice: K({ id: 'avgPrice', label: 'Average price per unit', short: 'Average price', kind: 'price', better: 'context', fn: 'marketing', means: 'Revenue divided by units sold, across every channel.' }),
  volume: K({ id: 'volume', label: 'Units sold', short: 'Units sold', kind: 'units', better: 'higher', fn: 'marketing', means: 'The units customers bought and the business delivered.' }),
  demand: K({ id: 'demand', label: 'Demand', short: 'Demand', kind: 'units', better: 'higher', fn: 'marketing', means: 'The units customers wanted to buy, whether or not the business could make them.' }),
  lostSales: K({ id: 'lostSales', label: 'Sales lost for lack of capacity', short: 'Lost sales', kind: 'units', better: 'lower', fn: 'operations', means: 'Demand the business could not meet.' }),
  marketShare: K({ id: 'marketShare', label: 'Market share', short: 'Market share', kind: 'percent', better: 'higher', fn: 'marketing', means: 'The business’s sales as a share of the whole market’s, by volume.', formula: 'Market share = (the business’s sales ÷ total sales in the market) × 100' }),
  brand: K({ id: 'brand', label: 'Brand strength', short: 'Brand', kind: 'index', better: 'higher', fn: 'marketing', means: 'An index from 0 to 100 of how customers rate and remember the brand: reviews, reputation and awareness together.' }),
  capacity: K({ id: 'capacity', label: 'Productive capacity', short: 'Capacity', kind: 'units', better: 'context', fn: 'operations', means: 'The most good units the plant and the workforce could make in the period, overtime included.' }),
  utilization: K({ id: 'utilization', label: 'Capacity utilization rate', short: 'Utilization', kind: 'percent', better: 'context', fn: 'operations', means: 'How much of productive capacity was used. Too low wastes fixed costs; close to 100% leaves no slack and strains people and quality.', formula: 'Capacity utilization rate = (actual output ÷ productive capacity) × 100' }),
  productivity: K({ id: 'productivity', label: 'Labour productivity', short: 'Output per worker', kind: 'perWorker', better: 'higher', fn: 'operations', means: 'Units sold per member of the operations workforce in the period.', formula: 'Labour productivity = output ÷ number of workers' }),
  defectRate: K({ id: 'defectRate', label: 'Defect rate', short: 'Defect rate', kind: 'percent', better: 'lower', fn: 'operations', means: 'Units made that failed inspection or came back, as a share of all units made.', formula: 'Defect rate = (defective units ÷ total units made) × 100' }),
  variableCosts: K({ id: 'variableCosts', label: 'Variable costs', short: 'Variable costs', kind: 'money', better: 'lower', fn: 'finance', means: 'Costs that rise and fall with output: materials, energy, other inputs, overtime and fees on sales.' }),
  fixedCosts: K({ id: 'fixedCosts', label: 'Fixed costs', short: 'Fixed costs', kind: 'money', better: 'lower', fn: 'finance', means: 'Costs that do not change with output in the period: wages, overheads, marketing, maintenance and depreciation.' }),
  oneOffCosts: K({ id: 'oneOffCosts', label: 'One-off and profit-related costs', short: 'One-off costs', kind: 'money', better: 'lower', fn: 'finance', means: 'Costs of change and of rewards linked to profit: recruitment, training, redundancy, write-offs, special projects and profit-share bonuses.' }),
  costOfSales: K({ id: 'costOfSales', label: 'Cost of sales', short: 'Cost of sales', kind: 'money', better: 'lower', fn: 'finance', means: 'The materials, energy and other inputs bought for the units made.' }),
  grossProfit: K({ id: 'grossProfit', label: 'Gross profit', short: 'Gross profit', kind: 'money', better: 'higher', fn: 'finance', means: 'Sales revenue less cost of sales.', formula: 'Gross profit = sales revenue − cost of sales' }),
  gpm: K({ id: 'gpm', label: 'Gross profit margin', short: 'Gross margin', kind: 'percent', better: 'higher', fn: 'finance', means: 'Gross profit as a share of sales revenue.', formula: 'Gross profit margin = (gross profit ÷ sales revenue) × 100' }),
  pbit: K({ id: 'pbit', label: 'Profit before interest and tax', short: 'Operating profit', kind: 'money', better: 'higher', fn: 'finance', means: 'What the business earned from trading before paying interest and tax.', formula: 'Profit before interest and tax = gross profit − expenses' }),
  profitMargin: K({ id: 'profitMargin', label: 'Profit margin', short: 'Profit margin', kind: 'percent', better: 'higher', fn: 'finance', means: 'Profit before interest and tax as a share of sales revenue.', formula: 'Profit margin = (profit before interest and tax ÷ sales revenue) × 100' }),
  interest: K({ id: 'interest', label: 'Interest', short: 'Interest', kind: 'money', better: 'lower', fn: 'finance', means: 'Interest on loans and the overdraft.' }),
  profit: K({ id: 'profit', label: 'Profit for the period', short: 'Profit after tax', kind: 'money', better: 'higher', fn: 'finance', means: 'What is left for the owners after interest and tax.', formula: 'Profit for the period = profit before interest and tax − interest − tax' }),
  breakEven: K({ id: 'breakEven', label: 'Break-even output', short: 'Break-even', kind: 'units', better: 'lower', fn: 'finance', means: 'The units needed to cover the period’s fixed costs at its average contribution per unit.', formula: 'Break-even quantity = fixed costs ÷ contribution per unit' }),
  cash: K({ id: 'cash', label: 'Cash at the bank', short: 'Cash', kind: 'money', better: 'higher', fn: 'finance', means: 'Money in the bank account at the end of the period.' }),
  overdraft: K({ id: 'overdraft', label: 'Bank overdraft', short: 'Overdraft', kind: 'money', better: 'lower', fn: 'finance', means: 'What the business owes the bank on its overdraft at the end of the period.' }),
  netCash: K({ id: 'netCash', label: 'Net cash (cash less overdraft)', short: 'Net cash', kind: 'money', better: 'higher', fn: 'finance', means: 'Cash at the bank less any overdraft: negative means the business is living on the bank’s money.' }),
  overdraftHeadroom: K({ id: 'overdraftHeadroom', label: 'Overdraft headroom', short: 'Headroom', kind: 'money', better: 'higher', fn: 'finance', means: 'How much more the business could borrow on its overdraft before reaching the limit.' }),
  overdraftExcess: K({ id: 'overdraftExcess', label: 'Overdraft above its limit', short: 'Over the limit', kind: 'money', better: 'lower', fn: 'finance', means: 'How far the overdraft has gone past the limit the bank agreed.' }),
  debt: K({ id: 'debt', label: 'Loans (non-current liabilities)', short: 'Loans', kind: 'money', better: 'lower', fn: 'finance', means: 'Long-term borrowing outstanding at the end of the period.' }),
  equity: K({ id: 'equity', label: 'Equity', short: 'Equity', kind: 'money', better: 'higher', fn: 'finance', means: 'Share capital plus retained earnings: what the business is worth to its owners on the books.' }),
  gearing: K({ id: 'gearing', label: 'Gearing ratio', short: 'Gearing', kind: 'percent', better: 'lower', fn: 'finance', means: 'The share of long-term finance that is borrowed.', formula: 'Gearing ratio = (non-current liabilities ÷ capital employed) × 100, where capital employed = non-current liabilities + equity' }),
  currentRatio: K({ id: 'currentRatio', label: 'Current ratio', short: 'Current ratio', kind: 'ratio', better: 'higher', fn: 'finance', means: 'How many times current assets cover current liabilities.', formula: 'Current ratio = current assets ÷ current liabilities' }),
  acidTest: K({ id: 'acidTest', label: 'Acid test (quick) ratio', short: 'Acid test', kind: 'ratio', better: 'higher', fn: 'finance', means: 'The same cover without stock, the slowest current asset to turn into cash.', formula: 'Acid test (quick) ratio = (current assets − stock) ÷ current liabilities' }),
  roce: K({ id: 'roce', label: 'Return on capital employed', short: 'ROCE', kind: 'percent', better: 'higher', fn: 'finance', means: 'Profit before interest and tax for a year as a share of the long-term finance invested.', formula: 'ROCE = (profit before interest and tax ÷ capital employed) × 100, where capital employed = non-current liabilities + equity' }),
  debtors: K({ id: 'debtors', label: 'Debtors', short: 'Debtors', kind: 'money', better: 'context', fn: 'finance', means: 'What customers owe at the end of the period.' }),
  stock: K({ id: 'stock', label: 'Stock', short: 'Stock', kind: 'money', better: 'context', fn: 'operations', means: 'Materials and goods held, at cost.' }),
  creditors: K({ id: 'creditors', label: 'Trade creditors', short: 'Creditors', kind: 'money', better: 'context', fn: 'finance', means: 'What the business owes its suppliers at the end of the period.' }),
  debtorDays: K({ id: 'debtorDays', label: 'Debtor days', short: 'Debtor days', kind: 'days', better: 'lower', fn: 'finance', means: 'How many days, on average, customers take to pay.', formula: 'Debtor days = (debtors ÷ total sales revenue) × 365' }),
  creditorDays: K({ id: 'creditorDays', label: 'Creditor days', short: 'Creditor days', kind: 'days', better: 'context', fn: 'finance', means: 'How many days, on average, the business takes to pay suppliers.', formula: 'Creditor days = (creditors ÷ cost of sales) × 365' }),
  stockDays: K({ id: 'stockDays', label: 'Stock turnover (days)', short: 'Stock days', kind: 'days', better: 'lower', fn: 'operations', means: 'How many days’ worth of inputs the business holds.', formula: 'Stock turnover (number of days) = (average stock ÷ cost of sales) × 365, here on closing stock' }),
  headcount: K({ id: 'headcount', label: 'Operations workforce', short: 'Workforce', kind: 'people', better: 'context', fn: 'people', means: 'People employed in operations at the end of the period.' }),
  morale: K({ id: 'morale', label: 'Morale', short: 'Morale', kind: 'index', better: 'higher', fn: 'people', means: 'An index from 0 to 100 of how the workforce feels, built from pay, workload, security and how change is handled.' }),
  turnover: K({ id: 'turnover', label: 'Labour turnover (annual rate)', short: 'Labour turnover', kind: 'percent', better: 'lower', fn: 'people', means: 'Leavers as a share of the workforce, at an annual rate.', formula: 'Labour turnover = (number of staff leaving ÷ average number of staff) × 100' }),
  staffCosts: K({ id: 'staffCosts', label: 'Staff costs', short: 'Staff costs', kind: 'money', better: 'context', fn: 'people', means: 'Wages, overtime and any profit-share bonus for the operations workforce.' }),
  emissionsPerUnit: K({ id: 'emissionsPerUnit', label: 'Emissions per unit', short: 'Carbon per unit', kind: 'perUnit', better: 'lower', fn: 'sustainability', means: 'Greenhouse gas emitted for each unit made, in kilograms of carbon dioxide equivalent.' }),
  emissions: K({ id: 'emissions', label: 'Total emissions', short: 'Emissions', kind: 'tonnes', better: 'lower', fn: 'sustainability', means: 'Greenhouse gas emitted in the period, in tonnes of carbon dioxide equivalent.' }),
  ownership: K({ id: 'ownership', label: 'Founders’ ownership', short: 'Ownership', kind: 'percent', better: 'context', fn: 'finance', means: 'The founders’ or family’s share of the company.' }),
};

export const isKpi = (id: string): id is KpiId => Object.prototype.hasOwnProperty.call(KPI_DEFS, id);

const MINUS = '−';
/** U+2060 WORD JOINER: no line break between a sign and its figure. */
export const JOIN = '\u2060';

/** Money in the dashboard's compact form: £2.38m, £412k, £950, −£41k. */
export function fmtMoneyCompact(v: number, symbol: string): string {
  if (!Number.isFinite(v)) return 'n/a';
  const abs = Math.abs(v);
  // A word joiner keeps the sign on the same line as the figure.
  const sign = v < 0 && abs >= 0.5 ? `${MINUS}${JOIN}` : '';
  if (abs >= 999_500) return `${sign}${symbol}${fmtNumber(abs / 1e6, 2).replace(/\.00$/, '')}m`;
  if (abs >= 9_995) return `${sign}${symbol}${fmtNumber(abs / 1e3, 0)}k`;
  if (abs >= 1_000) return `${sign}${symbol}${fmtNumber(abs / 1e3, 1)}k`;
  return `${sign}${symbol}${fmtNumber(abs, 0)}`;
}

/** Large counts in compact form: 12.6m, 23,400. */
function fmtCount(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 999_500) return `${v < 0 ? MINUS : ''}${fmtNumber(abs / 1e6, abs >= 10e6 ? 1 : 2)}m`;
  return fmtNumber(v, 0);
}

function fmtPrice(v: number, symbol: string): string {
  const abs = Math.abs(v);
  const d = abs < 100 ? 2 : 0;
  return `${v < 0 ? MINUS : ''}${symbol}${fmtNumber(abs, d)}`;
}

/** A KPI value written for people: £2.38m, 78.4%, 1.42, 62 out of 100, 45 days. */
export function fmtKpi(id: KpiId, v: number, ctx: FormatContext): string {
  const def = KPI_DEFS[id];
  if (!Number.isFinite(v)) return 'n/a';
  if (id === 'breakEven' && v < 0) return 'None at this price';
  if ((id === 'currentRatio' || id === 'acidTest') && v >= 99) return 'No current liabilities';
  switch (def.kind) {
    case 'money':
      return fmtMoneyCompact(v, ctx.symbol);
    case 'price':
      return fmtPrice(v, ctx.symbol);
    case 'units':
      return fmtCount(v);
    case 'percent':
      return `${fmtNumber(v, 1)}%`;
    case 'points':
      return fmtNumber(v, 1);
    case 'ratio':
      return fmtNumber(v, 2);
    case 'index':
      return fmtNumber(v, 0);
    case 'people':
      return fmtNumber(v, 0);
    case 'days':
      return `${fmtNumber(v, 0)} days`;
    case 'perUnit':
      // Grams matter for a loaf; a tenth of a kilogram is enough for a room night.
      return `${fmtNumber(v, Math.abs(v) < 1 ? 2 : 1)} kg`;
    case 'tonnes':
      return `${fmtNumber(v, 0)} t`;
    case 'perWorker':
      return fmtCount(v);
    default:
      return fmtNumber(v, 0);
  }
}

/** The unit a KPI is measured in, in words, for labels and table headers. */
export function kpiUnit(id: KpiId, ctx: FormatContext): string {
  const def = KPI_DEFS[id];
  switch (def.kind) {
    case 'units':
      return ctx.units;
    case 'perWorker':
      return `${ctx.units} per worker`;
    case 'index':
      return 'out of 100';
    case 'perUnit':
      return ctx.sustainUnit ?? `kg CO₂e per ${ctx.unit}`;
    case 'tonnes':
      return 'tonnes CO₂e';
    case 'people':
      return 'people';
    default:
      return '';
  }
}

export interface KpiChange {
  /** The change written in the KPI's terms, signed: +£120k, −3.2 points, +1.4%. */
  text: string;
  direction: 'up' | 'down' | 'same';
  /** Better, worse, or simply changed when better depends on context. */
  verdict: 'better' | 'worse' | 'changed' | 'same';
  /** The words that say what the colour shows. */
  words: string;
}

/** The change in a KPI from one period to the next, in words as well as figures. */
export function kpiChange(id: KpiId, before: number, after: number, ctx: FormatContext): KpiChange {
  const def = KPI_DEFS[id];
  // The smallest change worth reporting is half of the last digit shown.
  const scale: Record<KpiKind, number> = { money: 1, price: 100, units: 1, percent: 10, points: 10, ratio: 100, index: 1, people: 1, days: 1, perUnit: 10, tonnes: 1, perWorker: 1 };
  const step = def.kind === 'perUnit' && Math.abs(before) < 1 ? 0.01 : 1 / scale[def.kind];
  const d = after - before;
  if (!Number.isFinite(d) || Math.abs(d) < step / 2 || (def.kind === 'money' && Math.abs(d) < 500)) {
    return { text: 'No change', direction: 'same', verdict: 'same', words: 'No change' };
  }
  const sign = `${d > 0 ? '+' : MINUS}${JOIN}`;
  const abs = Math.abs(d);
  let text: string;
  switch (def.kind) {
    case 'money':
      text = `${sign}${fmtMoneyCompact(abs, ctx.symbol)}`;
      break;
    case 'price':
      text = `${sign}${fmtPrice(abs, ctx.symbol)}`;
      break;
    case 'percent':
      text = `${sign}${fmtNumber(abs, 1)} pts`;
      break;
    case 'index':
      text = `${sign}${fmtNumber(abs, 0)}`;
      break;
    case 'ratio':
      text = `${sign}${fmtNumber(abs, 2)}`;
      break;
    case 'days':
      text = `${sign}${fmtNumber(abs, 0)} days`;
      break;
    case 'perUnit':
      text = `${sign}${fmtNumber(abs, Math.abs(before) < 1 ? 2 : 1)} kg`;
      break;
    case 'tonnes':
      text = `${sign}${fmtNumber(abs, 0)} t`;
      break;
    default:
      text = `${sign}${fmtCount(abs)}`;
  }
  const direction = d > 0 ? 'up' : 'down';
  if (def.better === 'context') return { text, direction, verdict: 'changed', words: d > 0 ? 'Up' : 'Down' };
  const good = def.better === 'higher' ? d > 0 : d < 0;
  return { text, direction, verdict: good ? 'better' : 'worse', words: `${d > 0 ? 'Up' : 'Down'}, ${good ? 'better' : 'worse'}` };
}

/** The KPI values that a scenario's dashboard and tables show, picked from a period's full set. */
export function pick(k: Kpis, ids: KpiId[]): Array<[KpiId, number]> {
  return ids.map((id) => [id, k[id]]);
}
