/**
 * The cash flow forecast. Builds a forecast in the layout of the Business
 * management guide (p. 63, figure 10): opening balance, cash inflows, total
 * cash inflows, cash outflows, total cash outflows, net cash flow and closing
 * balance, with negative figures in brackets. Alongside it, the profit for the
 * same months on an accruals basis, and a reconciliation that explains every
 * difference between the two. Everything is worked in whole cents so that the
 * totals add up exactly.
 */

export interface CashFlowScenario {
  months: string[];
  currency: string;
  opening: number;
  overdraftLimit: number;
  /** The business's own selling price, and units sold at it each month. */
  price: number;
  sold: number[];
  /** Card and platform fees, as a percentage of sales. */
  cardShare: number;
  perUnit: { firing: number; materials: number; pieceRate: number; packaging: number };
  fixed: { rent: number; lease: number; salaries: number; marketing: number; overheads: number; standingCharge: number };
  /** A one-off order invoiced to a customer, made in one month and paid for later. */
  order: { label: string; units: number; price: number; packaging: number; setup: number; month: number; paidMonth: number };
  /** A capital purchase. */
  investment: { label: string; cost: number; month: number; lifeYears: number };
}

export type FinanceOption =
  | { id: string; kind: 'buy' }
  | { id: string; kind: 'lease'; monthly: number }
  | { id: string; kind: 'loan'; amount: number; repayment: number; interest: number }
  | { id: string; kind: 'delay'; month: number }
  | { id: string; kind: 'none' };

export type Measure =
  | { id: string; kind: 'deposit'; share: number }
  | { id: string; kind: 'credit'; months: number }
  | { id: string; kind: 'cut-marketing'; value: number; from: number }
  | { id: string; kind: 'overdraft'; limit: number };

export interface Line {
  id: string;
  label: string;
  values: number[];
  total: number;
}

export type MonthStatus = 'credit' | 'overdraft' | 'beyond';

export interface Forecast {
  months: string[];
  opening: number[];
  inflows: Line[];
  totalIn: number[];
  outflows: Line[];
  totalOut: number[];
  net: number[];
  closing: number[];
  limit: number;
  status: MonthStatus[];
  lowest: { value: number; month: number };
  /** The first month whose closing balance is beyond the overdraft limit, or null. */
  firstBeyond: number | null;
  netCash: number;
  profit: { revenue: number; expenses: Array<{ label: string; value: number }>; total: number };
  /** Profit, plus these, equals the net cash flow for the period. */
  reconciliation: Array<{ label: string; value: number }>;
}

import { fmtMoney } from './format';

const c = (v: number) => Math.round(v * 100);
const e = (cents: number) => cents / 100;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** The forecast for a scenario, a way of paying for the investment and any measures. */
export function forecast(s: CashFlowScenario, finance: FinanceOption = { id: 'buy', kind: 'buy' }, measures: Measure[] = []): Forecast {
  const n = s.months.length;
  const zeros = () => Array.from({ length: n }, () => 0);
  const at = (month: number, cents: number) => {
    const v = zeros();
    if (month >= 0 && month < n) v[month] = cents;
    return v;
  };
  const deposit = measures.find((m) => m.kind === 'deposit');
  const credit = measures.find((m) => m.kind === 'credit');
  const cut = measures.find((m) => m.kind === 'cut-marketing');
  const overdraft = measures.find((m) => m.kind === 'overdraft');

  const made = s.sold.map((q, i) => q + (i === s.order.month ? s.order.units : 0));
  const sales = s.sold.map((q) => c(q * s.price));
  const orderValue = c(s.order.units * s.order.price);
  const depositCents = deposit ? Math.round((orderValue * deposit.share) / 100) : 0;
  const orderIn = s.months.map((_, i) => (i === s.order.month ? depositCents : 0) + (i === s.order.paidMonth ? orderValue - depositCents : 0));

  const materialsUsed = made.map((q) => c(q * s.perUnit.materials));
  const lag = credit ? credit.months : 0;
  const materialsPaid = materialsUsed.map((_, i) => (i - lag >= 0 ? (materialsUsed[i - lag] ?? 0) : 0));
  const marketing = s.months.map((_, i) => c(cut && i >= cut.from ? cut.value : s.fixed.marketing));
  // When, if at all, the investment is paid for in cash.
  const buyMonth = finance.kind === 'buy' || finance.kind === 'loan' ? s.investment.month : finance.kind === 'delay' ? finance.month : null;
  const investmentCents = c(s.investment.cost);

  const inflows: Line[] = [
    { id: 'sales', label: 'Cash sales', values: sales, total: 0 },
    { id: 'order', label: s.order.label, values: orderIn, total: 0 },
  ];
  if (finance.kind === 'loan') inflows.push({ id: 'loan', label: 'Bank loan received', values: at(s.investment.month, c(finance.amount)), total: 0 });

  const outflows: Line[] = [
    { id: 'rent', label: 'Rent', values: s.months.map(() => c(s.fixed.rent)), total: 0 },
    { id: 'lease', label: 'Kiln lease', values: s.months.map(() => c(s.fixed.lease)), total: 0 },
    { id: 'salaries', label: 'Salaries', values: s.months.map(() => c(s.fixed.salaries)), total: 0 },
    { id: 'piece', label: "Throwers' piece rates", values: made.map((q) => c(q * s.perUnit.pieceRate)), total: 0 },
    { id: 'materials', label: 'Clay and glaze', values: materialsPaid, total: 0 },
    { id: 'electricity', label: 'Electricity', values: made.map((q) => c(s.fixed.standingCharge) + c(q * s.perUnit.firing)), total: 0 },
    {
      id: 'packaging',
      label: 'Packaging',
      values: s.sold.map((q, i) => c(q * s.perUnit.packaging) + (i === s.order.month ? c(s.order.units * s.order.packaging) : 0)),
      total: 0,
    },
    { id: 'fees', label: 'Card and platform fees', values: sales.map((v) => Math.round((v * s.cardShare) / 100)), total: 0 },
    { id: 'marketing', label: 'Marketing', values: marketing, total: 0 },
    { id: 'overheads', label: 'Insurance, website and software', values: s.months.map(() => c(s.fixed.overheads)), total: 0 },
    { id: 'setup', label: 'Custom stamp for the order', values: at(s.order.month, c(s.order.setup)), total: 0 },
  ];
  if (buyMonth !== null) outflows.push({ id: 'investment', label: s.investment.label, values: at(buyMonth, investmentCents), total: 0 });
  if (finance.kind === 'lease') outflows.push({ id: 'lease-2', label: 'Lease of the second kiln', values: s.months.map((_, i) => (i >= s.investment.month ? c(finance.monthly) : 0)), total: 0 });
  const repayMonths = finance.kind === 'loan' ? s.months.map((_, i) => i > s.investment.month) : [];
  if (finance.kind === 'loan') outflows.push({ id: 'repayments', label: 'Loan repayments', values: repayMonths.map((r) => (r ? c(finance.repayment) : 0)), total: 0 });

  [...inflows, ...outflows].forEach((l) => (l.total = sum(l.values)));
  const totalIn = s.months.map((_, i) => sum(inflows.map((l) => l.values[i] ?? 0)));
  const totalOut = s.months.map((_, i) => sum(outflows.map((l) => l.values[i] ?? 0)));
  const net = s.months.map((_, i) => (totalIn[i] ?? 0) - (totalOut[i] ?? 0));
  const opening: number[] = [];
  const closing: number[] = [];
  let bal = c(s.opening);
  for (let i = 0; i < n; i++) {
    opening.push(bal);
    bal += net[i] ?? 0;
    closing.push(bal);
  }
  const limit = c(overdraft ? overdraft.limit : s.overdraftLimit);
  const status: MonthStatus[] = closing.map((v) => (v >= 0 ? 'credit' : v >= -limit ? 'overdraft' : 'beyond'));
  let low = 0;
  closing.forEach((v, i) => {
    if (v < (closing[low] ?? 0)) low = i;
  });
  const beyond = status.indexOf('beyond');

  // Profit for the same months, on an accruals basis.
  const owned = buyMonth === null ? 0 : Math.max(0, n - buyMonth);
  const depreciation = buyMonth === null ? 0 : Math.round((investmentCents / s.investment.lifeYears / 12) * owned);
  const repayments = finance.kind === 'loan' ? repayMonths.filter(Boolean).length : 0;
  const interest = finance.kind === 'loan' ? c(finance.interest) * repayments : 0;
  const line = (id: string) => outflows.find((l) => l.id === id)?.total ?? 0;
  const revenue = sum(sales) + orderValue;
  const expenses: Array<{ label: string; value: number }> = [
    { label: 'Production: piece rates, clay and glaze, electricity', value: line('piece') + sum(materialsUsed) + line('electricity') },
    { label: 'Packaging and card fees', value: line('packaging') + line('fees') },
    { label: 'Rent, kiln lease, salaries and overheads', value: line('rent') + line('lease') + line('salaries') + line('overheads') },
    { label: 'Marketing', value: line('marketing') },
    { label: 'Custom stamp for the order', value: line('setup') },
  ];
  if (finance.kind === 'lease') expenses.push({ label: 'Lease of the second kiln', value: line('lease-2') });
  if (depreciation) expenses.push({ label: 'Depreciation of the second kiln', value: depreciation });
  if (interest) expenses.push({ label: 'Interest on the loan', value: interest });
  const profit = revenue - sum(expenses.map((x) => x.value));

  const netCash = sum(net);
  const reconciliation: Array<{ label: string; value: number }> = [];
  if (buyMonth !== null && buyMonth < n) reconciliation.push({ label: `${s.investment.label}: cash paid out, but it is an asset, not an expense`, value: -investmentCents });
  if (depreciation) reconciliation.push({ label: 'Depreciation: an expense, but no cash leaves the business', value: depreciation });
  if (finance.kind === 'loan') {
    reconciliation.push({ label: 'The loan: cash comes in, but it is not revenue', value: c(finance.amount) });
    reconciliation.push({ label: 'Loan repayments, apart from the interest: cash goes out, but they are not an expense', value: -(c(finance.repayment) * repayments - interest) });
  }
  const unpaidMaterials = sum(materialsUsed) - sum(materialsPaid);
  if (unpaidMaterials) reconciliation.push({ label: 'Clay and glaze used but not yet paid for, on credit from the supplier', value: unpaidMaterials });
  const unreceived = orderValue - sum(orderIn);
  if (unreceived) reconciliation.push({ label: `${s.order.label}: revenue earned, but not yet received`, value: -unreceived });

  const toE = (l: Line): Line => ({ ...l, values: l.values.map(e), total: e(l.total) });
  return {
    months: s.months,
    opening: opening.map(e),
    inflows: inflows.map(toE),
    totalIn: totalIn.map(e),
    outflows: outflows.map(toE),
    totalOut: totalOut.map(e),
    net: net.map(e),
    closing: closing.map(e),
    limit: e(limit),
    status,
    lowest: { value: e(closing[low] ?? 0), month: low },
    firstBeyond: beyond === -1 ? null : beyond,
    netCash: e(netCash),
    profit: { revenue: e(revenue), expenses: expenses.map((x) => ({ ...x, value: e(x.value) })), total: e(profit) },
    reconciliation: reconciliation.map((x) => ({ ...x, value: e(x.value) })),
  };
}

/** A figure as the guide prints it in a forecast: 1,234.50, with a negative in brackets, (1,234.50). */
export function bracket(value: number, decimals = 2): string {
  const s = Math.abs(value).toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return value < 0 && Number(Math.abs(value).toFixed(decimals)) !== 0 ? `(${s})` : s;
}

export const STATUS_WORDS: Record<MonthStatus, string> = {
  credit: 'In credit',
  overdraft: 'Overdrawn, within the limit',
  beyond: 'Beyond the overdraft limit',
};

/** A plain reading of the forecast. */
export function readForecast(f: Forecast, currency: string): { headline: string; detail: string } {
  const money = (v: number) => fmtMoney(v, currency, 2);
  const low = f.lowest;
  const lowMonth = f.months[low.month] ?? '';
  if (f.firstBeyond !== null) {
    const months = f.status.filter((x) => x === 'beyond').length;
    return {
      headline: `The balance goes beyond the ${currency}${bracket(f.limit, 0)} overdraft limit in ${f.months[f.firstBeyond]}, and is beyond it in ${months} of the ${f.months.length} months.`,
      detail: `The lowest closing balance is ${money(low.value)} in ${lowMonth}. The bank would not honour payments past the limit, so the forecast needs a change before ${f.months[f.firstBeyond]}.`,
    };
  }
  if (low.value < 0) {
    return {
      headline: `The business is overdrawn at its lowest, ${money(low.value)} in ${lowMonth}, but stays within the ${currency}${bracket(f.limit, 0)} limit.`,
      detail: 'That is workable, at the cost of overdraft interest, and leaves little room if sales fall short of the forecast.',
    };
  }
  return {
    headline: `The balance stays in credit every month. Its lowest point is ${money(low.value)} in ${lowMonth}.`,
    detail: 'The forecast is only as good as its sales estimates: check how far sales could fall before the balance went negative.',
  };
}
