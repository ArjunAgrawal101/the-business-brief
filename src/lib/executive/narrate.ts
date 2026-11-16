/**
 * The executive simulation in words. Every figure in these sentences comes
 * from the engine, so the words cannot disagree with the numbers: the tokens
 * in the content ({{revenue@2026}}, {{pct:materialPerPiece@2023>2026}},
 * {{d:spareNormal}}), the plain description of a year's levers, and the
 * explanation of why each part of the business moved.
 */
import { fmtNumber } from '../format';
import type { KpiId, YearResult } from './engine';
import { fmtKpi, fmtMoneyCompact, fmtPctChange, fmtPrice, isKpi, JOIN, kpiChange, KPI_DEFS, type Area, type FormatContext } from './kpis';
import type { Executive, Levers } from './schema';
import type { derived } from './sim';

const MINUS = '−';

/** What the sentences need to know about the simulation. */
export interface NarrateContext extends FormatContext {
  /** The foreign currency's code and the export market, for sentences about exports. */
  foreignCode: string;
  market: string;
  fxRef: number;
}

export function narrateContext(sc: Pick<Executive, 'currency' | 'foreign' | 'units' | 'model'>): NarrateContext {
  return {
    symbol: sc.currency.symbol,
    unit: sc.units.singular,
    units: sc.units.plural,
    foreign: sc.foreign.symbol,
    foreignCode: sc.foreign.code,
    market: sc.foreign.market,
    fxRef: sc.model.fxRef,
  };
}

export type Derived = ReturnType<typeof derived>;

/** Write a derived figure in its own kind. */
export function fmtDerived(d: Derived[string], ctx: FormatContext): string {
  switch (d.kind) {
    case 'percent':
      return `${fmtNumber(d.value, 1)}%`;
    case 'wholePercent':
      return `${fmtNumber(d.value, 0)}%`;
    case 'signedPercent':
      return `${d.value > 0 ? '+' : d.value < 0 ? `${MINUS}${JOIN}` : ''}${fmtNumber(Math.abs(d.value), 1)}%`;
    case 'money':
      return fmtMoneyCompact(d.value, ctx.symbol);
    case 'price':
      return fmtPrice(d.value, ctx.symbol);
    case 'units':
      return fmtNumber(Math.round(d.value), 0);
    case 'decimal':
      return fmtNumber(d.value, 1);
    default:
      return fmtNumber(d.value, 2);
  }
}

/* ------------------------------------------------------------------ */
/* Tokens                                                              */
/* ------------------------------------------------------------------ */

const TOKEN = /\{\{\s*([^{}]+?)\s*\}\}/g;

/**
 * A token, read: a derived figure, or a KPI in a year, or its change between
 * two years in its own terms, in per cent with its sign (pct:, for brackets)
 * or in per cent without it (pc:, for a sentence that says which way).
 */
type Parsed = { kind: 'derived'; name: string } | { kind: 'kpi'; id: string; pct: false | 'signed' | 'plain'; year?: string; to?: string };

function parse(inner: string): Parsed | null {
  if (inner.startsWith('d:')) return { kind: 'derived', name: inner.slice(2) };
  const pct = inner.startsWith('pct:') ? 'signed' : inner.startsWith('pc:') ? 'plain' : false;
  const body = pct === 'signed' ? inner.slice(4) : pct === 'plain' ? inner.slice(3) : inner;
  const m = /^([a-zA-Z]+)(?:@(\d{4}|final)(?:>(\d{4}|final))?)?$/.exec(body);
  if (!m) return null;
  return { kind: 'kpi', id: m[1] ?? '', pct, year: m[2], to: m[3] };
}

export interface TokenSource {
  /** Every year the text may quote, history first. */
  years: YearResult[];
  /** The year a bare {{kpi}} means: the last history year in the brief, the year being described in a result. */
  focus: YearResult;
  derived: Derived;
}

function yearOf(src: TokenSource, label: string | undefined): YearResult | undefined {
  if (!label) return src.focus;
  if (label === 'final') return src.years[src.years.length - 1];
  return src.years.find((y) => y.label === label);
}

/** Fill every token in a text; a token that cannot be filled is left as it is (the integrity check reports it). */
export function fillTokens(text: string, src: TokenSource, ctx: FormatContext): string {
  return text.replace(TOKEN, (whole, inner: string) => {
    const t = parse(inner);
    if (!t) return whole;
    if (t.kind === 'derived') {
      const d = src.derived[t.name];
      return d ? fmtDerived(d, ctx) : whole;
    }
    if (!isKpi(t.id)) return whole;
    const id = t.id as KpiId;
    if (t.to) {
      const a = yearOf(src, t.year);
      const b = yearOf(src, t.to);
      if (!a || !b) return whole;
      if (t.pct === 'plain') return `${fmtNumber(Math.abs(((b.kpis[id] - a.kpis[id]) / Math.abs(a.kpis[id] || 1)) * 100), 1)}%`;
      return t.pct ? fmtPctChange(a.kpis[id], b.kpis[id]) : kpiChange(id, a.kpis[id], b.kpis[id], ctx).text;
    }
    if (t.pct) return whole;
    const y = yearOf(src, t.year);
    return y ? fmtKpi(id, y.kpis[id], ctx) : whole;
  });
}

/**
 * The tokens in a text that could not be filled from these years and derived
 * figures, for the integrity check. `planYears` are labels that exist only on
 * a run (allowed but not checked here).
 */
export function badTokens(text: string, years: string[], derivedNames: string[], allowFinal: boolean): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(TOKEN)) {
    const t = parse(m[1] ?? '');
    if (!t) {
      out.push(m[0]);
      continue;
    }
    if (t.kind === 'derived') {
      if (!derivedNames.includes(t.name)) out.push(m[0]);
      continue;
    }
    const okYear = (y: string | undefined) => y === undefined || years.includes(y) || (allowFinal && y === 'final');
    if (!isKpi(t.id) || !okYear(t.year) || !okYear(t.to) || (t.pct && !t.to)) out.push(m[0]);
  }
  const stray = text.replace(TOKEN, '').match(/\{\{|\}\}/g);
  return [...out, ...(stray ?? [])];
}

/* ------------------------------------------------------------------ */
/* A year's levers in words                                            */
/* ------------------------------------------------------------------ */

const money = (v: number, ctx: FormatContext) => fmtMoneyCompact(v, ctx.symbol);
const signedPct = (v: number) => `${v > 0 ? 'up' : 'down'} ${fmtNumber(Math.abs(v), Number.isInteger(v) ? 0 : 1)}%`;

/** A year's plan as short sentences, lever by lever. */
export function describeLevers(l: Levers, ctx: FormatContext): string[] {
  return [
    l.price === 0 ? 'Prices unchanged.' : `Prices ${signedPct(l.price)}.`,
    l.costCut > 0 ? `An efficiency programme cutting overheads by ${fmtNumber(l.costCut, 0)}%.` : 'No efficiency programme.',
    `Marketing: ${money(l.marketing, ctx)}.`,
    l.capacity > 0 ? `New machinery: ${money(l.capacity, ctx)}, in use the year after.` : 'No new machinery.',
    l.people > 0 ? `People programme: ${money(l.people, ctx)}.` : 'No people programme.',
    l.international > 0 ? `International expansion: ${money(l.international, ctx)}.` : 'No spending abroad.',
  ];
}

/** A plan in one line: "+3% price, 5% cut, marketing £1.1m, people £200k". */
export function leversLine(l: Levers, ctx: FormatContext): string {
  const parts = [l.price === 0 ? 'price held' : `price ${l.price > 0 ? '+' : MINUS}${fmtNumber(Math.abs(l.price), 0)}%`];
  if (l.costCut > 0) parts.push(`overheads cut ${fmtNumber(l.costCut, 0)}%`);
  parts.push(`marketing ${money(l.marketing, ctx)}`);
  if (l.capacity > 0) parts.push(`machinery ${money(l.capacity, ctx)}`);
  if (l.people > 0) parts.push(`people ${money(l.people, ctx)}`);
  if (l.international > 0) parts.push(`international ${money(l.international, ctx)}`);
  return parts.join(', ');
}

/* ------------------------------------------------------------------ */
/* Why each part of the business moved                                 */
/* ------------------------------------------------------------------ */

const pts = (v: number) => `${v >= 0 ? '+' : MINUS}${fmtNumber(Math.abs(v), 1)}`;
const pc = (v: number) => `${fmtNumber(v, 1)}%`;
const n0 = (v: number) => fmtNumber(Math.round(v), 0);

export const AREA_LABELS: Record<Area, string> = {
  marketing: 'Customers and the brand',
  operations: 'The workshop',
  people: 'People',
  international: 'Abroad',
  finance: 'Money',
};

/** The explanation of a year against the one before, by area, in plain sentences. */
export function explainYear(r: YearResult, prev: YearResult, ctx: NarrateContext): Record<Area, string[]> {
  const k = r.kpis;
  const p = prev.kpis;
  const b = r.brandParts;
  const m = r.moraleParts;
  const q = r.qualityParts;
  const out: Record<Area, string[]> = { marketing: [], operations: [], people: [], international: [], finance: [] };

  /* Customers and the brand */
  out.marketing.push(
    `The brand moved from ${fmtNumber(b.open, 1)} to ${fmtNumber(b.end, 1)}: ${pts(b.carry)} from last year's marketing arriving, ${pts(b.now)} from this year's, ${pts(b.decay)} as it faded, and ${pts(b.reviews)} from last year's service quality in reviews.`,
  );
  out.marketing.push(
    `Home orders were ${n0(k.homeDemand)} ${ctx.units} (${fmtPctChange(p.homeDemand, k.homeDemand)} on ${prev.label}). Against the opening position the market was ${pc((r.demandParts.market - 1) * 100)} larger, the price against competitors multiplied orders by ${fmtNumber(r.demandParts.price, 2)} and the brand by ${fmtNumber(r.demandParts.brand, 2)}.`,
  );
  out.marketing.push(`The average price was ${fmtPrice(k.price, ctx.symbol)}, ${fmtNumber(k.relativePrice - 100, 1)}% ${k.relativePrice >= 100 ? 'above' : 'below'} competitors' ${fmtPrice(k.competitorPrice, ctx.symbol)}. Market share at home: ${pc(k.marketShare)}.`);

  /* The workshop */
  if (r.arrivals.includes('machinery')) out.operations.push(`New machinery came into use: plant capacity is now ${n0(r.ops.plantCapacity)} ${ctx.units} and each ${ctx.unit} needs ${fmtNumber(r.ops.hoursPerPiece, 2)} hours.`);
  out.operations.push(
    `In normal hours the workforce could make ${n0(r.ops.labourNormal)} ${ctx.units} and the plant ${n0(r.ops.plantCapacity)}; with overtime the most was ${n0(k.capacity)}. ${
      r.ops.binding === 'demand' ? 'Every order was met.' : `${n0(k.lostSales)} orders (${pc(k.lostShare)}) were lost for lack of ${r.ops.binding === 'plant' ? 'machines' : 'people'}.`
    }`,
  );
  out.operations.push(
    k.overtimeHours > 0.5
      ? `Output ran at ${pc(k.load)} of normal-hours capacity, so ${n0(r.ops.overtimeUnits)} ${ctx.units} were made in ${n0(k.overtimeHours)} hours of overtime at a premium.`
      : `Output ran at ${pc(k.load)} of normal-hours capacity: no overtime was needed.`,
  );
  const qParts = [
    q.cuts < 0 ? `${pts(q.cuts)} from cuts so far` : '',
    q.strain < 0 ? `${pts(q.strain)} from running the workshop hard` : '',
    q.morale < 0 ? `${pts(q.morale)} from low morale at the start of the year` : '',
    Math.abs(q.skill) >= 0.05 ? `${pts(q.skill)} from skill` : '',
  ].filter(Boolean);
  out.operations.push(`Service quality was ${fmtNumber(k.quality, 1)} (${fmtNumber(q.base, 0)} at best${qParts.length ? `; ${qParts.join(', ')}` : ''}), and ${pc(k.returnsRate)} of ${ctx.units} came back or were remade.`);

  /* People */
  const shocks = [
    Math.abs(m.recovery) >= 0.05 ? `${pts(m.recovery)} recovering towards its usual level` : '',
    m.news ? `${pts(m.news)} from news nobody chose` : '',
    m.people > 0.05 ? `${pts(m.people)} from the people programme` : '',
    m.cut < -0.05 ? `${pts(m.cut)} from the efficiency programme` : '',
    m.overtime < -0.05 ? `${pts(m.overtime)} from overtime` : '',
  ].filter(Boolean);
  out.people.push(`Morale moved from ${fmtNumber(m.open, 1)} to ${fmtNumber(m.end, 1)}${shocks.length ? `: ${shocks.join(', ')}` : ''}.`);
  out.people.push(`Labour turnover was ${pc(k.turnover)}: ${n0(k.leavers)} people left and were replaced, each new starter making about half as much in the first year.`);
  out.people.push(
    `The skill index is ${fmtNumber(k.skill, 2)} (1.00 at the opening position): it rises with training paid for the year before${r.arrivals.includes('training') ? ', which arrived this year,' : ''} and falls when experienced makers leave.`,
  );

  /* Abroad */
  if (r.intl.open) {
    out.international.push(
      `${n0(k.exportVolume)} ${ctx.units} went to ${ctx.market}, earning ${fmtMoneyCompact(k.exportRevenue, ctx.symbol)} (${pc(k.exportShare)} of revenue). At ${ctx.foreign}${fmtNumber(k.fx, 2)} to the ${ctx.symbol === '£' ? 'pound' : 'unit'}, each ${ctx.unit} earned ${fmtPrice(r.intl.pricePerPiece, ctx.symbol)}; at the planning rate of ${ctx.foreign}${fmtNumber(ctx.fxRef, 2)} it would have earned ${fmtPrice((r.intl.pricePerPiece * k.fx) / ctx.fxRef, ctx.symbol)}.`,
    );
    if ((r.conditions.exportDamage ?? 0) > 0) out.international.push(`${fmtNumber(r.conditions.exportDamage ?? 0, 0)}% of exported ${ctx.units} arrived damaged this year and were replaced.`);
  } else if (r.intl.opensNextYear) {
    out.international.push(`The set-up abroad is complete: exports start next year.`);
  } else if (r.intl.setupPaid > 0) {
    out.international.push(`The set-up abroad is under way; exports start the year after it is complete.`);
  } else {
    out.international.push('Nothing was sold abroad.');
  }

  /* Money */
  out.finance.push(
    `Revenue ${fmtMoneyCompact(k.revenue, ctx.symbol)}, gross profit margin ${pc(k.gpm)}, profit before interest and tax ${fmtMoneyCompact(k.pbit, ctx.symbol)} (a profit margin of ${pc(k.profitMargin)}), profit for the year ${fmtMoneyCompact(k.profit, ctx.symbol)}.`,
  );
  const spent = -r.cash.investing;
  const machinery = -r.cash.capex;
  out.finance.push(
    `Cash from trading was ${fmtMoneyCompact(r.cash.operating, ctx.symbol)}; ${fmtMoneyCompact(spent, ctx.symbol)} went on the plant (${machinery > 0 ? `${fmtMoneyCompact(machinery, ctx.symbol)} of new machinery, the rest upkeep` : 'upkeep alone'}). Net cash ended the year at ${fmtMoneyCompact(k.netCash, ctx.symbol)}${
      k.overdraft <= 0
        ? ', with the overdraft unused'
        : k.headroom >= 0
          ? `: an overdraft ${fmtMoneyCompact(k.headroom, ctx.symbol)} inside its limit`
          : `: an overdraft ${fmtMoneyCompact(-k.headroom, ctx.symbol)} over its limit, so the bank charges a penalty rate and wants a plan`
    }.`,
  );
  out.finance.push(`Return on capital employed: ${pc(k.roce)}.`);
  return out;
}

/** The headline changes of a year, for a screen reader's announcement and the summary line. */
export function headline(r: YearResult, prev: YearResult, ctx: FormatContext): string {
  const parts: Array<[KpiId, string]> = [
    ['revenue', 'revenue'],
    ['pbit', 'operating profit'],
    ['netCash', 'net cash'],
    ['morale', 'morale'],
  ];
  return parts.map(([id, name]) => `${name} ${fmtKpi(id, r.kpis[id], ctx)} (${kpiChange(id, prev.kpis[id], r.kpis[id], ctx).text})`).join(', ');
}

export { KPI_DEFS };
