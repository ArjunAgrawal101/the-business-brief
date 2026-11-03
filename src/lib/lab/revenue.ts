/**
 * Entrepreneurship and Innovation Lab: the revenue model planner. A
 * twelve-month forecast of revenue by stream, for products sold by the unit
 * through a channel and for subscriptions. Pure functions shared by the
 * planner, its script, the business plan digest and the unit tests.
 *
 * Customers and orders are whole numbers. Each month's units, new subscribers
 * and lost subscribers are rounded to the nearest whole number before revenue
 * is calculated, so every row of the table adds up exactly.
 *
 * Total revenue and revenue streams are IB content (3.3, AO2). Subscriptions,
 * churn and channel fees are enrichment: standard start-up terms that the
 * guide does not use. A forecast is not a fact; the sensitivity table shows
 * how much the year depends on each assumption.
 */
import { fmtMoney, fmtNumber, round } from '../format';

export const MONTHS = 12;
export const MAX_STREAMS = 4;

export interface UnitStream {
  id: string;
  kind: 'units';
  label: string;
  /** Price per unit or order. */
  price: number;
  /** Units or orders in the first month. */
  units: number;
  /** Growth in units, per cent a month. */
  growth: number;
  /** Share of revenue kept by the channel (a marketplace or delivery app), per cent. */
  fee: number;
}

export interface SubscriptionStream {
  id: string;
  kind: 'subscription';
  label: string;
  /** Price per subscriber per month. */
  price: number;
  /** Subscribers already paying before month 1. */
  start: number;
  /** New subscribers in the first month. */
  joining: number;
  /** Growth in new subscribers, per cent a month. */
  growth: number;
  /** Share of last month's subscribers who leave each month, per cent. */
  churn: number;
  fee: number;
}

export type Stream = UnitStream | SubscriptionStream;

export interface StreamMonth {
  id: string;
  /** Units or orders sold; for a subscription, the subscribers billed this month. */
  units: number;
  joined: number;
  left: number;
  revenue: number;
  fees: number;
}

export interface RevenueMonth {
  month: number;
  streams: StreamMonth[];
  revenue: number;
  fees: number;
  /** Revenue after channel fees. */
  net: number;
}

export interface StreamTotal {
  id: string;
  label: string;
  kind: Stream['kind'];
  revenue: number;
  fees: number;
  net: number;
  /** Share of the year's revenue, per cent. */
  share: number;
  /** Units sold in the year; for a subscription, subscriber-months billed. */
  units: number;
}

export interface RevenueModel {
  streams: Stream[];
  months: RevenueMonth[];
  totals: StreamTotal[];
  revenue: number;
  fees: number;
  net: number;
  first: number;
  last: number;
  /** Month 12's revenue as a multiple of month 1's. */
  multiple: number | null;
  /** Subscribers paying in the last month, across all subscription streams. */
  endSubscribers: number;
  /** Subscribers lost over the year, across all subscription streams. */
  lost: number;
}

/** Nearest whole number, halves rounded up. */
const whole = (v: number) => Math.max(0, round(v, 0));

export function revenuePlan(streams: Stream[], months = MONTHS): RevenueModel {
  const rows: RevenueMonth[] = [];
  const active = new Map<string, number>(streams.filter((s) => s.kind === 'subscription').map((s) => [s.id, (s as SubscriptionStream).start]));
  for (let m = 1; m <= months; m += 1) {
    const cells: StreamMonth[] = streams.map((s) => {
      const g = (1 + s.growth / 100) ** (m - 1);
      if (s.kind === 'units') {
        const units = whole(s.units * g);
        const revenue = units * s.price;
        return { id: s.id, units, joined: 0, left: 0, revenue, fees: (revenue * s.fee) / 100 };
      }
      const before = active.get(s.id) ?? 0;
      const joined = whole(s.joining * g);
      const left = Math.min(before, whole((before * s.churn) / 100));
      const now = before - left + joined;
      active.set(s.id, now);
      const revenue = now * s.price;
      return { id: s.id, units: now, joined, left, revenue, fees: (revenue * s.fee) / 100 };
    });
    const revenue = cells.reduce((n, c) => n + c.revenue, 0);
    const fees = cells.reduce((n, c) => n + c.fees, 0);
    rows.push({ month: m, streams: cells, revenue, fees, net: revenue - fees });
  }
  const revenue = rows.reduce((n, r) => n + r.revenue, 0);
  const fees = rows.reduce((n, r) => n + r.fees, 0);
  const totals: StreamTotal[] = streams.map((s, i) => {
    const r = rows.reduce((n, row) => n + (row.streams[i]?.revenue ?? 0), 0);
    const f = rows.reduce((n, row) => n + (row.streams[i]?.fees ?? 0), 0);
    return { id: s.id, label: s.label, kind: s.kind, revenue: r, fees: f, net: r - f, share: revenue > 0 ? (r / revenue) * 100 : 0, units: rows.reduce((n, row) => n + (row.streams[i]?.units ?? 0), 0) };
  });
  const first = rows[0]?.revenue ?? 0;
  const last = rows[rows.length - 1]?.revenue ?? 0;
  const lastRow = rows[rows.length - 1];
  return {
    streams,
    months: rows,
    totals,
    revenue,
    fees,
    net: revenue - fees,
    first,
    last,
    multiple: first > 0 ? last / first : null,
    endSubscribers: streams.reduce((n, s, i) => n + (s.kind === 'subscription' ? (lastRow?.streams[i]?.units ?? 0) : 0), 0),
    lost: rows.reduce((n, r) => n + r.streams.reduce((k, c) => k + c.left, 0), 0),
  };
}

/* ---------- What if? Plausible setbacks, one assumption at a time ---------- */

export interface Sensitivity {
  id: 'price' | 'volume' | 'growth' | 'churn';
  label: string;
  revenue: number;
  change: number;
  /** Change as a share of the forecast year's revenue, per cent. */
  changePct: number | null;
}

/**
 * Each assumption made worse on its own, the others held, by a plausible
 * setback rather than a common percentage: prices 10% lower (a rival
 * undercuts), starting sales 20% lower (a slow launch), growth halved and,
 * for subscriptions, churn doubled. The setbacks differ in size because the
 * assumptions differ in how uncertain they are.
 */
export function revenueSensitivity(streams: Stream[], months = MONTHS): Sensitivity[] {
  const base = revenuePlan(streams, months).revenue;
  const run = (id: Sensitivity['id'], label: string, f: (s: Stream) => Stream): Sensitivity => {
    const revenue = revenuePlan(streams.map(f), months).revenue;
    return { id, label, revenue, change: revenue - base, changePct: base > 0 ? ((revenue - base) / base) * 100 : null };
  };
  const out = [
    run('price', 'Prices 10% lower', (s) => ({ ...s, price: s.price * 0.9 })),
    run('volume', 'Starting sales 20% lower', (s) => (s.kind === 'units' ? { ...s, units: s.units * 0.8 } : { ...s, joining: s.joining * 0.8 })),
    run('growth', 'Monthly growth halved', (s) => ({ ...s, growth: s.growth / 2 })),
  ];
  if (streams.some((s) => s.kind === 'subscription')) out.push(run('churn', 'Churn doubled', (s) => (s.kind === 'subscription' ? { ...s, churn: Math.min(100, s.churn * 2) } : s)));
  return out;
}

/* ---------- Validation ---------- */

export interface FieldProblem {
  /** "<stream id>:<field>" */
  field: string;
  message: string;
}

export type StreamDraft =
  | { id: string; kind: 'units'; label: string; price: number | null; units: number | null; growth: number | null; fee: number | null }
  | { id: string; kind: 'subscription'; label: string; price: number | null; start: number | null; joining: number | null; growth: number | null; churn: number | null; fee: number | null };

export function validateStreams(drafts: StreamDraft[]): FieldProblem[] {
  const out: FieldProblem[] = [];
  if (!drafts.length) out.push({ field: 'list', message: 'Add at least one revenue stream.' });
  if (drafts.length > MAX_STREAMS) out.push({ field: 'list', message: `Use at most ${MAX_STREAMS} streams.` });
  const num = (d: StreamDraft, key: string, v: number | null, rule: (n: number) => string | null) => {
    if (v === null || !Number.isFinite(v)) out.push({ field: `${d.id}:${key}`, message: 'Enter a number.' });
    else {
      const msg = rule(v);
      if (msg) out.push({ field: `${d.id}:${key}`, message: msg });
    }
  };
  const nonNeg = (n: number) => (n < 0 ? 'Cannot be negative.' : null);
  const wholeNonNeg = (n: number) => (n < 0 ? 'Cannot be negative.' : !Number.isInteger(n) ? 'Use a whole number.' : null);
  const growth = (n: number) => (n < -50 || n > 100 ? 'Use a monthly rate from −50% to 100%.' : null);
  const pct = (n: number) => (n < 0 || n > 100 ? 'Use a percentage from 0 to 100.' : null);
  for (const d of drafts) {
    if (!d.label.trim()) out.push({ field: `${d.id}:label`, message: 'Name the stream.' });
    num(d, 'price', d.price, nonNeg);
    num(d, 'growth', d.growth, growth);
    num(d, 'fee', d.fee, pct);
    if (d.kind === 'units') num(d, 'units', d.units, wholeNonNeg);
    else {
      num(d, 'start', d.start, wholeNonNeg);
      num(d, 'joining', d.joining, wholeNonNeg);
      num(d, 'churn', d.churn, pct);
    }
  }
  return out;
}

export function streamsFromDrafts(drafts: StreamDraft[]): Stream[] {
  return drafts.map((d) =>
    d.kind === 'units'
      ? { id: d.id, kind: 'units', label: d.label.trim(), price: d.price ?? 0, units: d.units ?? 0, growth: d.growth ?? 0, fee: d.fee ?? 0 }
      : { id: d.id, kind: 'subscription', label: d.label.trim(), price: d.price ?? 0, start: d.start ?? 0, joining: d.joining ?? 0, growth: d.growth ?? 0, churn: d.churn ?? 0, fee: d.fee ?? 0 },
  );
}

/* ---------- Reading the result ---------- */

export function readRevenue(m: RevenueModel, sens: Sensitivity[], currency: string): { reading: string; implication: string } {
  const money = (v: number) => fmtMoney(v, currency, 0);
  if (m.revenue <= 0) return { reading: 'The forecast shows no revenue. Enter a price and some sales.', implication: '' };
  const biggest = [...m.totals].sort((a, b) => b.revenue - a.revenue)[0];
  const parts = [`The forecast year brings in ${money(m.revenue)}, from ${money(m.first)} in month 1 to ${money(m.last)} in month ${m.months.length}${m.multiple !== null ? ` (${fmtNumber(m.multiple, 1)} times as much)` : ''}.`];
  if (biggest && m.totals.length > 1) parts.push(`Largest stream: ${biggest.label}, with ${fmtNumber(biggest.share, 0)}% of the year's revenue.`);
  if (m.fees > 0) parts.push(`Channel fees take ${money(m.fees)}, leaving ${money(m.net)}.`);
  if (m.streams.some((s) => s.kind === 'subscription')) parts.push(`${fmtNumber(m.endSubscribers)} subscribers are paying in month ${m.months.length}, after ${fmtNumber(m.lost)} cancellations over the year.`);
  const worst = [...sens].sort((a, b) => a.change - b.change)[0];
  const implication =
    worst && worst.change < 0
      ? `Of the ${['no', 'one', 'two', 'three', 'four'][sens.length] ?? sens.length} setbacks tested, ${worst.label.toLowerCase()} costs the year the most: ${money(-worst.change)}, or ${fmtNumber(Math.abs(worst.changePct ?? 0), 0)}% of the forecast. Each setback is a plausible bad case, not a prediction. Test the assumption behind the costliest one with real customers before committing money to it.`
      : '';
  return { reading: parts.join(' '), implication };
}
