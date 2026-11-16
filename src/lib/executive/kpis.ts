/**
 * The executive simulation's measures: what each KPI is called, how it is
 * written, which way is better and which part of the business it belongs to.
 * One definition for the dashboard, the exhibits, the scorecards and the
 * tokens in the content, on the server and in the browser. Money is written
 * the Boardroom's way (src/lib/boardroom/kpis.ts), so the two read alike.
 */
import { fmtNumber } from '../format';
import { fmtMoneyCompact, JOIN } from '../boardroom/kpis';
import type { KpiId } from './engine';

export { fmtMoneyCompact, JOIN };

export type KpiKind = 'money' | 'price' | 'units' | 'percent' | 'index' | 'ratio' | 'people' | 'days' | 'hours' | 'rate' | 'factor';
export type Area = 'finance' | 'marketing' | 'operations' | 'people' | 'international';

export interface KpiDef {
  id: KpiId;
  label: string;
  /** A short label for the dashboard tiles. */
  short: string;
  kind: KpiKind;
  better: 'higher' | 'lower' | 'context';
  area: Area;
  means: string;
  /** The formula, in the guide's words where the guide gives one. */
  formula?: string;
}

const K = (d: KpiDef) => d;

export const KPI_DEFS: Record<KpiId, KpiDef> = {
  revenue: K({ id: 'revenue', label: 'Sales revenue', short: 'Revenue', kind: 'money', better: 'higher', area: 'marketing', means: 'What customers at home and abroad paid for the pieces delivered in the year.', formula: 'Sales revenue = price × quantity sold, added over the markets' }),
  homeRevenue: K({ id: 'homeRevenue', label: 'Sales revenue at home', short: 'Home revenue', kind: 'money', better: 'higher', area: 'marketing', means: 'Revenue from customers in the home market.' }),
  exportRevenue: K({ id: 'exportRevenue', label: 'Export revenue', short: 'Export revenue', kind: 'money', better: 'higher', area: 'international', means: 'Revenue from the export market, converted at the year’s exchange rate.' }),
  exportShare: K({ id: 'exportShare', label: 'Exports as a share of revenue', short: 'Export share', kind: 'percent', better: 'context', area: 'international', means: 'The share of revenue earned abroad.' }),
  price: K({ id: 'price', label: 'Average price per piece', short: 'Price', kind: 'price', better: 'context', area: 'marketing', means: 'The average price of a piece at home, after the year’s price change.' }),
  relativePrice: K({ id: 'relativePrice', label: 'Price against competitors', short: 'Relative price', kind: 'index', better: 'context', area: 'marketing', means: 'The company’s average price as a percentage of competitors’ average: 110 means 10% dearer.' }),
  competitorPrice: K({ id: 'competitorPrice', label: 'Competitors’ average price', short: 'Rivals’ price', kind: 'price', better: 'context', area: 'marketing', means: 'The average price of comparable pieces from competitors.' }),
  marketSize: K({ id: 'marketSize', label: 'Home market', short: 'Market', kind: 'units', better: 'context', area: 'marketing', means: 'Pieces bought in the home market in the year, from every maker.' }),
  demand: K({ id: 'demand', label: 'Orders (demand)', short: 'Orders', kind: 'units', better: 'higher', area: 'marketing', means: 'The pieces customers ordered, whether or not the workshop could make them.' }),
  homeDemand: K({ id: 'homeDemand', label: 'Orders at home', short: 'Home orders', kind: 'units', better: 'higher', area: 'marketing', means: 'Pieces ordered by customers at home.' }),
  exportDemand: K({ id: 'exportDemand', label: 'Export orders', short: 'Export orders', kind: 'units', better: 'higher', area: 'international', means: 'Pieces ordered through the export distributor.' }),
  volume: K({ id: 'volume', label: 'Pieces delivered', short: 'Delivered', kind: 'units', better: 'higher', area: 'operations', means: 'Pieces made and delivered to customers.' }),
  homeVolume: K({ id: 'homeVolume', label: 'Pieces delivered at home', short: 'Home pieces', kind: 'units', better: 'higher', area: 'marketing', means: 'Pieces delivered to customers at home.' }),
  exportVolume: K({ id: 'exportVolume', label: 'Pieces exported', short: 'Exported', kind: 'units', better: 'higher', area: 'international', means: 'Pieces delivered to the export distributor.' }),
  lostSales: K({ id: 'lostSales', label: 'Orders lost for lack of capacity', short: 'Lost orders', kind: 'units', better: 'lower', area: 'operations', means: 'Orders the workshop could not make in time, which customers cancelled.' }),
  lostShare: K({ id: 'lostShare', label: 'Share of orders lost', short: 'Orders lost', kind: 'percent', better: 'lower', area: 'operations', means: 'Lost orders as a share of all orders.' }),
  marketShare: K({ id: 'marketShare', label: 'Market share at home', short: 'Market share', kind: 'percent', better: 'higher', area: 'marketing', means: 'The company’s pieces as a share of all pieces sold in the home market.', formula: 'Market share = (the company’s sales ÷ total sales in the market) × 100' }),
  brand: K({ id: 'brand', label: 'Brand strength', short: 'Brand', kind: 'index', better: 'higher', area: 'marketing', means: 'An index from 0 to 100 of how customers rate and remember the brand.' }),
  quality: K({ id: 'quality', label: 'Service quality', short: 'Service quality', kind: 'index', better: 'higher', area: 'operations', means: 'An index from 0 to 100 of the finish of each piece and how reliably it arrives on the promised date.' }),
  returnsRate: K({ id: 'returnsRate', label: 'Pieces returned or remade', short: 'Returns', kind: 'percent', better: 'lower', area: 'operations', means: 'Pieces sent back or remade for a fault, as a share of pieces delivered.' }),
  plantCapacity: K({ id: 'plantCapacity', label: 'Plant capacity', short: 'Plant capacity', kind: 'units', better: 'context', area: 'operations', means: 'The most pieces the machines and floor space could produce in a year.' }),
  normalCapacity: K({ id: 'normalCapacity', label: 'Capacity in normal hours', short: 'Normal capacity', kind: 'units', better: 'context', area: 'operations', means: 'The pieces the workforce and the plant could make without overtime.' }),
  capacity: K({ id: 'capacity', label: 'Productive capacity, with overtime', short: 'Capacity', kind: 'units', better: 'context', area: 'operations', means: 'The most pieces the workshop could make, overtime included.' }),
  utilization: K({ id: 'utilization', label: 'Capacity utilization rate', short: 'Utilization', kind: 'percent', better: 'context', area: 'operations', means: 'Output as a share of productive capacity (overtime included).', formula: 'Capacity utilization rate = (actual output ÷ productive capacity) × 100' }),
  load: K({ id: 'load', label: 'Load on normal hours', short: 'Load', kind: 'percent', better: 'context', area: 'operations', means: 'Output as a share of what normal hours can make: above 100 means overtime, and well above 90 strains quality.' }),
  overtimeHours: K({ id: 'overtimeHours', label: 'Overtime hours', short: 'Overtime', kind: 'hours', better: 'lower', area: 'operations', means: 'Hours worked beyond normal hours, paid at a premium.' }),
  overtimeShare: K({ id: 'overtimeShare', label: 'Overtime as a share of normal hours', short: 'Overtime share', kind: 'percent', better: 'lower', area: 'people', means: 'Overtime hours as a percentage of the normal hours paid.' }),
  productivity: K({ id: 'productivity', label: 'Labour productivity', short: 'Pieces per worker', kind: 'units', better: 'higher', area: 'operations', means: 'Pieces delivered per member of the production workforce in the year.', formula: 'Labour productivity = output ÷ number of workers' }),
  skill: K({ id: 'skill', label: 'Skill index', short: 'Skill', kind: 'factor', better: 'higher', area: 'people', means: 'How much a worker makes in an hour, from training and experience, against the opening position (1.00).' }),
  headcount: K({ id: 'headcount', label: 'Production workforce', short: 'Workforce', kind: 'people', better: 'context', area: 'people', means: 'People employed in the workshop.' }),
  morale: K({ id: 'morale', label: 'Morale', short: 'Morale', kind: 'index', better: 'higher', area: 'people', means: 'An index from 0 to 100 of how the workforce feels, from the annual staff survey.' }),
  turnover: K({ id: 'turnover', label: 'Labour turnover', short: 'Labour turnover', kind: 'percent', better: 'lower', area: 'people', means: 'Leavers as a share of the workforce in the year.', formula: 'Labour turnover = (number of staff leaving ÷ average number of staff) × 100' }),
  leavers: K({ id: 'leavers', label: 'Leavers', short: 'Leavers', kind: 'people', better: 'lower', area: 'people', means: 'People who left the workshop in the year (each was replaced).' }),
  materialPerPiece: K({ id: 'materialPerPiece', label: 'Materials per piece', short: 'Materials each', kind: 'price', better: 'lower', area: 'operations', means: 'Timber, finishes and fittings for one piece.' }),
  costPerPiece: K({ id: 'costPerPiece', label: 'Cost of sales per piece', short: 'Cost of sales each', kind: 'price', better: 'lower', area: 'finance', means: 'Cost of sales divided by pieces delivered: materials, delivery, freight, returns and damage.' }),
  costOfSales: K({ id: 'costOfSales', label: 'Cost of sales', short: 'Cost of sales', kind: 'money', better: 'lower', area: 'finance', means: 'Materials, delivery and other inputs for the pieces delivered, with freight, returns and damage.' }),
  grossProfit: K({ id: 'grossProfit', label: 'Gross profit', short: 'Gross profit', kind: 'money', better: 'higher', area: 'finance', means: 'Sales revenue less cost of sales.', formula: 'Gross profit = sales revenue − cost of sales' }),
  gpm: K({ id: 'gpm', label: 'Gross profit margin', short: 'Gross margin', kind: 'percent', better: 'higher', area: 'finance', means: 'Gross profit as a share of sales revenue.', formula: 'Gross profit margin = (gross profit ÷ sales revenue) × 100' }),
  overheads: K({ id: 'overheads', label: 'Overheads', short: 'Overheads', kind: 'money', better: 'lower', area: 'finance', means: 'Showrooms, offices, support staff and other costs that do not change with output.' }),
  marketing: K({ id: 'marketing', label: 'Marketing spend', short: 'Marketing', kind: 'money', better: 'context', area: 'marketing', means: 'The year’s marketing spend.' }),
  depreciation: K({ id: 'depreciation', label: 'Depreciation', short: 'Depreciation', kind: 'money', better: 'context', area: 'finance', means: 'The year’s share of the cost of the workshop’s buildings and machinery.' }),
  expenses: K({ id: 'expenses', label: 'Expenses', short: 'Expenses', kind: 'money', better: 'lower', area: 'finance', means: 'Every cost below gross profit: wages, overtime, overheads, the programmes and depreciation.' }),
  pbit: K({ id: 'pbit', label: 'Profit before interest and tax', short: 'Operating profit', kind: 'money', better: 'higher', area: 'finance', means: 'What the business earned from trading before interest and tax.', formula: 'Profit before interest and tax = gross profit − expenses' }),
  profitMargin: K({ id: 'profitMargin', label: 'Profit margin', short: 'Profit margin', kind: 'percent', better: 'higher', area: 'finance', means: 'Profit before interest and tax as a share of sales revenue.', formula: 'Profit margin = (profit before interest and tax ÷ sales revenue) × 100' }),
  interest: K({ id: 'interest', label: 'Interest', short: 'Interest', kind: 'money', better: 'lower', area: 'finance', means: 'Interest on the loan and the overdraft.' }),
  tax: K({ id: 'tax', label: 'Tax', short: 'Tax', kind: 'money', better: 'context', area: 'finance', means: 'Tax on the year’s profit.' }),
  profit: K({ id: 'profit', label: 'Profit for the year', short: 'Profit after tax', kind: 'money', better: 'higher', area: 'finance', means: 'What is left for the owners after interest and tax.', formula: 'Profit for the period = profit before tax − tax' }),
  cash: K({ id: 'cash', label: 'Cash at the bank', short: 'Cash', kind: 'money', better: 'higher', area: 'finance', means: 'Money in the bank at the end of the year.' }),
  overdraft: K({ id: 'overdraft', label: 'Bank overdraft', short: 'Overdraft', kind: 'money', better: 'lower', area: 'finance', means: 'What the business owes on its overdraft at the end of the year.' }),
  netCash: K({ id: 'netCash', label: 'Net cash (cash less overdraft)', short: 'Net cash', kind: 'money', better: 'higher', area: 'finance', means: 'Cash at the bank less any overdraft: negative means the business is living on the bank’s money.' }),
  headroom: K({ id: 'headroom', label: 'Overdraft headroom', short: 'Headroom', kind: 'money', better: 'higher', area: 'finance', means: 'How much more the business could borrow before reaching its overdraft limit; negative means over the limit.' }),
  debt: K({ id: 'debt', label: 'Loans (non-current liabilities)', short: 'Loans', kind: 'money', better: 'lower', area: 'finance', means: 'Long-term borrowing outstanding at the end of the year.' }),
  equity: K({ id: 'equity', label: 'Equity', short: 'Equity', kind: 'money', better: 'higher', area: 'finance', means: 'Share capital plus retained earnings.' }),
  capitalEmployed: K({ id: 'capitalEmployed', label: 'Capital employed', short: 'Capital employed', kind: 'money', better: 'context', area: 'finance', means: 'Long-term finance in the business: loans plus equity.', formula: 'Capital employed = non-current liabilities + equity' }),
  roce: K({ id: 'roce', label: 'Return on capital employed', short: 'ROCE', kind: 'percent', better: 'higher', area: 'finance', means: 'Profit before interest and tax as a share of the long-term finance invested.', formula: 'ROCE = (profit before interest and tax ÷ capital employed) × 100' }),
  currentRatio: K({ id: 'currentRatio', label: 'Current ratio', short: 'Current ratio', kind: 'ratio', better: 'higher', area: 'finance', means: 'How many times current assets cover current liabilities.', formula: 'Current ratio = current assets ÷ current liabilities' }),
  acidTest: K({ id: 'acidTest', label: 'Acid test (quick) ratio', short: 'Acid test', kind: 'ratio', better: 'higher', area: 'finance', means: 'The same cover without stock.', formula: 'Acid test (quick) ratio = (current assets − stock) ÷ current liabilities' }),
  gearing: K({ id: 'gearing', label: 'Gearing ratio', short: 'Gearing', kind: 'percent', better: 'lower', area: 'finance', means: 'The share of capital employed that is borrowed.', formula: 'Gearing ratio = (non-current liabilities ÷ capital employed) × 100' }),
  debtorDays: K({ id: 'debtorDays', label: 'Debtor days', short: 'Debtor days', kind: 'days', better: 'lower', area: 'finance', means: 'How many days, on average, customers take to pay.', formula: 'Debtor days = (debtors ÷ total sales revenue) × 365' }),
  creditorDays: K({ id: 'creditorDays', label: 'Creditor days', short: 'Creditor days', kind: 'days', better: 'context', area: 'finance', means: 'How many days, on average, the business takes to pay its suppliers.', formula: 'Creditor days = (creditors ÷ cost of sales) × 365' }),
  stockDays: K({ id: 'stockDays', label: 'Stock turnover (days)', short: 'Stock days', kind: 'days', better: 'lower', area: 'operations', means: 'How many days of inputs the business holds.', formula: 'Stock turnover (number of days) = (average stock ÷ cost of sales) × 365, here on closing stock' }),
  spend: K({ id: 'spend', label: 'Budget spent', short: 'Budget spent', kind: 'money', better: 'context', area: 'finance', means: 'Marketing, capacity investment, the people programme and international expansion, together.' }),
  capex: K({ id: 'capex', label: 'Capacity investment', short: 'Investment', kind: 'money', better: 'context', area: 'operations', means: 'Machinery bought in the year.' }),
  fx: K({ id: 'fx', label: 'Exchange rate', short: 'Exchange rate', kind: 'rate', better: 'context', area: 'international', means: 'Units of the foreign currency for one unit of the home currency in the year.' }),
};

export const isKpi = (id: string): id is KpiId => Object.prototype.hasOwnProperty.call(KPI_DEFS, id);

const MINUS = '−';

/** What the formatter needs to know about the simulation. */
export interface FormatContext {
  symbol: string;
  unit: string;
  units: string;
  /** The foreign currency's symbol, for the exchange rate. */
  foreign: string;
}

function fmtCount(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 999_500) return `${v < 0 ? MINUS : ''}${fmtNumber(abs / 1e6, abs >= 10e6 ? 1 : 2)}m`;
  return fmtNumber(v, 0);
}

/** A price: £862, or £0.95 below 100. */
export function fmtPrice(v: number, symbol: string): string {
  const abs = Math.abs(v);
  return `${v < 0 ? `${MINUS}${JOIN}` : ''}${symbol}${fmtNumber(abs, abs < 100 ? 2 : 0)}`;
}

/** A KPI written for people: £18.4m, 4.2%, 1.42, 62, 45 days, €1.15. */
export function fmtKpi(id: KpiId, v: number, ctx: FormatContext): string {
  const def = KPI_DEFS[id];
  if (!Number.isFinite(v)) return 'n/a';
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
    case 'index':
      return fmtNumber(v, 0);
    case 'ratio':
      return fmtNumber(v, 2);
    case 'factor':
      return fmtNumber(v, 2);
    case 'people':
      return fmtNumber(v, 0);
    case 'days':
      return `${fmtNumber(v, 0)} days`;
    case 'hours':
      return fmtCount(v);
    case 'rate':
      return `${ctx.foreign}${fmtNumber(v, 2)}`;
    default:
      return fmtNumber(v, 0);
  }
}

/** The unit a KPI is counted in, in words, for tiles and table headers. */
export function kpiUnit(id: KpiId, ctx: FormatContext): string {
  switch (KPI_DEFS[id].kind) {
    case 'units':
      return id === 'productivity' ? `${ctx.units} per worker` : ctx.units;
    case 'index':
      return id === 'relativePrice' ? 'competitors = 100' : 'out of 100';
    case 'people':
      return 'people';
    case 'hours':
      return 'hours';
    case 'rate':
      return `per ${ctx.symbol}1`;
    case 'factor':
      return 'opening = 1.00';
    default:
      return '';
  }
}

export interface KpiChange {
  text: string;
  direction: 'up' | 'down' | 'same';
  verdict: 'better' | 'worse' | 'changed' | 'same';
  words: string;
}

/** The change in a KPI between two years, in figures and in words. */
export function kpiChange(id: KpiId, before: number, after: number, ctx: FormatContext): KpiChange {
  const def = KPI_DEFS[id];
  const steps: Record<KpiKind, number> = { money: 500, price: 0.5, units: 0.5, percent: 0.05, index: 0.5, ratio: 0.005, factor: 0.005, people: 0.5, days: 0.5, hours: 0.5, rate: 0.005 };
  const d = after - before;
  if (!Number.isFinite(d) || Math.abs(d) < steps[def.kind]) return { text: 'No change', direction: 'same', verdict: 'same', words: 'No change' };
  const sign = `${d > 0 ? '+' : MINUS}${JOIN}`;
  const abs = Math.abs(d);
  let text: string;
  switch (def.kind) {
    case 'money':
      text = `${sign}${fmtMoneyCompact(abs, ctx.symbol)}`;
      break;
    case 'price':
      // A change in a price of hundreds of pounds is shown in whole pounds.
      text = `${sign}${Math.abs(before) >= 100 ? `${ctx.symbol}${fmtNumber(abs, 0)}` : fmtPrice(abs, ctx.symbol)}`;
      break;
    case 'percent':
      text = `${sign}${fmtNumber(abs, 1)} pts`;
      break;
    case 'ratio':
    case 'factor':
      text = `${sign}${fmtNumber(abs, 2)}`;
      break;
    case 'rate':
      text = `${sign}${ctx.foreign}${fmtNumber(abs, 2)}`;
      break;
    case 'days':
      text = `${sign}${fmtNumber(abs, 0)} days`;
      break;
    default:
      text = `${sign}${fmtCount(abs)}`;
  }
  const direction = d > 0 ? 'up' : 'down';
  if (def.better === 'context') return { text, direction, verdict: 'changed', words: d > 0 ? 'Up' : 'Down' };
  const good = def.better === 'higher' ? d > 0 : d < 0;
  return { text, direction, verdict: good ? 'better' : 'worse', words: `${d > 0 ? 'Up' : 'Down'}, ${good ? 'better' : 'worse'}` };
}

/** A percentage change between two values, signed: +4.2%, −1.9%. */
export function fmtPctChange(before: number, after: number): string {
  if (!Number.isFinite(before) || Math.abs(before) < 1e-12) return 'n/a';
  const p = ((after - before) / Math.abs(before)) * 100;
  if (Math.abs(p) < 0.05) return 'no change';
  return `${p > 0 ? '+' : MINUS}${JOIN}${fmtNumber(Math.abs(p), 1)}%`;
}
