/**
 * The product life cycle simulator (4.5: the product life cycle, investment,
 * profit and cash flow, AO2; extension strategies, AO3).
 *
 * An illustrative model, labelled as such on the page. Year 0 is
 * development. Year 1 is the launch (introduction). In growth, sales rise
 * from the launch level towards the peak along an easing curve, quickly at
 * first and slowly as they near it; in maturity they hold at the peak; in
 * decline they fall by a fixed rate each year. Profit counts depreciation on
 * the capital spending; cash flow counts the spending itself, and the cash
 * tied up in stock and credit as sales grow (and released as they fall).
 *
 * An extension strategy adds a percentage to sales from the year it starts,
 * fading by a number of points a year, for a one-off cost; a price cut
 * instead lowers the price and raises the number sold by the amounts
 * assumed. Several strategies add their uplifts together. Every effect is an
 * assumption the reader can change.
 */
import { asBool, asInt, asList, asNum, asObj, asOneOf, asStr } from './market-kit';

export const STAGES = ['Development', 'Introduction', 'Growth', 'Maturity', 'Decline'] as const;
export type Stage = (typeof STAGES)[number];

export const EXTENSIONS = ['new-market', 'new-version', 'packaging', 'promotion', 'new-uses', 'price-cut'] as const;
export type ExtensionId = (typeof EXTENSIONS)[number];
export const EXTENSION_LABELS: Record<ExtensionId, { label: string; ansoff?: string }> = {
  'new-market': { label: 'New markets', ansoff: 'market development in the Ansoff matrix' },
  'new-version': { label: 'A new version or feature' },
  packaging: { label: 'New packaging or design' },
  promotion: { label: 'New promotion or channels' },
  'new-uses': { label: 'New uses' },
  'price-cut': { label: 'A price cut' },
};

export interface Extension {
  id: ExtensionId;
  on: boolean;
  /** What it is, in the business's terms. */
  detail: string;
  /** Extra sales in the first year, in per cent of what sales would have been. */
  uplift: number;
  /** Points the uplift loses each later year. */
  fade: number;
  /** One-off cost in the first year. */
  cost: number;
}

export interface PlcState {
  product: string;
  currency: string;
  unit: string;
  price: number;
  variableCost: number;
  development: number;
  launchPromotion: number;
  fixedCosts: number;
  /** Promotion as a percentage of revenue in each later stage. */
  promotion: { growth: number; maturity: number; decline: number };
  capex: { year: number; amount: number; life: number };
  /** Stock and trade credit held, as a percentage of the year's revenue. */
  workingCapital: number;
  launch: number;
  peak: number;
  growthYears: number;
  maturityYears: number;
  /** Fall in sales each year of decline, in per cent. */
  decline: number;
  horizon: number;
  extensionYear: number;
  /** For the price cut: the cut in price and the rise in units it is assumed to bring, both in per cent. */
  priceCut: { price: number; units: number };
  extensions: Extension[];
}

export interface PlcYear {
  year: number;
  stage: Stage;
  units: number;
  price: number;
  revenue: number;
  contribution: number;
  fixed: number;
  promotion: number;
  extensionCost: number;
  depreciation: number;
  profit: number;
  capex: number;
  workingCapitalChange: number;
  cash: number;
  cumulative: number;
}

export interface PlcRun {
  years: PlcYear[];
  totalProfit: number;
  /** First year with a positive profit, or null. */
  firstProfit: number | null;
  /** First year with positive cash flow, or null. */
  firstCash: number | null;
  /** First year the cumulative cash flow is zero or more (payback of everything spent so far), or null. */
  payback: number | null;
  /** The lowest cumulative cash flow: the most cash the product needs before it pays its way. */
  peakNeed: number;
  peakNeedYear: number;
  finalCumulative: number;
}

export function stageOf(s: Pick<PlcState, 'growthYears' | 'maturityYears'>, year: number): Stage {
  if (year <= 0) return 'Development';
  if (year === 1) return 'Introduction';
  if (year <= 1 + s.growthYears) return 'Growth';
  if (year <= 1 + s.growthYears + s.maturityYears) return 'Maturity';
  return 'Decline';
}

/** Units sold in a year before any extension strategy. */
export function baseUnits(s: PlcState, year: number): number {
  if (year <= 0) return 0;
  if (year === 1) return s.launch;
  const g = Math.max(1, s.growthYears);
  if (year <= 1 + g) {
    const t = (year - 1) / g;
    return s.launch + (s.peak - s.launch) * (1 - (1 - t) ** 2);
  }
  if (year <= 1 + g + s.maturityYears) return s.peak;
  const k = year - (1 + g + s.maturityYears);
  return s.peak * (1 - s.decline / 100) ** k;
}

/** The combined uplift, in per cent, that the chosen strategies (other than a price cut) add in a year. */
export function upliftIn(s: PlcState, year: number): number {
  if (year < s.extensionYear) return 0;
  const k = year - s.extensionYear;
  return s.extensions.filter((e) => e.on && e.id !== 'price-cut').reduce((n, e) => n + Math.max(0, e.uplift - e.fade * k), 0);
}

export function simulate(s: PlcState, withExtensions = true): PlcRun {
  const years: PlcYear[] = [];
  const cut = withExtensions && s.extensions.some((e) => e.on && e.id === 'price-cut');
  const depYears = Math.max(1, s.capex.life);
  let cumulative = 0;
  let prevWc = 0;
  for (let y = 0; y <= s.horizon; y += 1) {
    const stage = stageOf(s, y);
    const extOn = withExtensions && y >= s.extensionYear;
    let units = baseUnits(s, y) * (1 + (withExtensions ? upliftIn(s, y) : 0) / 100);
    let price = s.price;
    if (cut && extOn && y > 0) {
      price = s.price * (1 - s.priceCut.price / 100);
      units *= 1 + s.priceCut.units / 100;
    }
    const revenue = units * price;
    const contribution = units * (price - s.variableCost);
    const fixed = y >= 1 ? s.fixedCosts : 0;
    const promoShare = stage === 'Growth' ? s.promotion.growth : stage === 'Maturity' ? s.promotion.maturity : stage === 'Decline' ? s.promotion.decline : 0;
    const promotion = y === 1 ? s.launchPromotion : (promoShare / 100) * revenue;
    const extensionCost = withExtensions && y === s.extensionYear ? s.extensions.filter((e) => e.on).reduce((n, e) => n + e.cost, 0) : 0;
    const depreciation = y >= s.capex.year && y < s.capex.year + depYears && s.capex.amount > 0 ? s.capex.amount / depYears : 0;
    const development = y === 0 ? s.development : 0;
    const profit = contribution - fixed - promotion - extensionCost - depreciation - development;
    const capex = y === s.capex.year ? s.capex.amount : 0;
    const wc = (s.workingCapital / 100) * revenue;
    const workingCapitalChange = wc - prevWc;
    prevWc = wc;
    const cash = profit + depreciation - capex - workingCapitalChange;
    cumulative += cash;
    years.push({ year: y, stage, units, price, revenue, contribution, fixed, promotion, extensionCost, depreciation, profit, capex, workingCapitalChange, cash, cumulative });
  }
  const firstProfit = years.find((r) => r.year > 0 && r.profit > 0)?.year ?? null;
  const firstCash = years.find((r) => r.year > 0 && r.cash > 0)?.year ?? null;
  let payback: number | null = null;
  for (const r of years) {
    if (r.year > 0 && r.cumulative >= 0 && years.slice(0, r.year).some((p) => p.cumulative < 0)) {
      payback = r.year;
      break;
    }
  }
  const low = years.reduce((a, b) => (b.cumulative < a.cumulative ? b : a), years[0] ?? ({ cumulative: 0, year: 0 } as PlcYear));
  return {
    years,
    totalProfit: years.reduce((n, r) => n + r.profit, 0),
    firstProfit,
    firstCash,
    payback,
    peakNeed: Math.min(0, low.cumulative),
    peakNeedYear: low.year,
    finalCumulative: years[years.length - 1]?.cumulative ?? 0,
  };
}

export interface PlcProblem {
  where: string;
  message: string;
}

export function validatePlc(s: PlcState): PlcProblem[] {
  const out: PlcProblem[] = [];
  const need = (where: string, ok: boolean, message: string) => ok || out.push({ where, message });
  need('price', s.price > 0, 'Enter a price above zero.');
  need('variableCost', s.variableCost >= 0, 'Variable cost cannot be negative.');
  need('launch', s.launch >= 0, 'Launch sales cannot be negative.');
  need('peak', s.peak > 0, 'Enter peak sales above zero.');
  need('peak', s.peak >= s.launch, 'Peak sales should be at least the launch sales.');
  need('growthYears', s.growthYears >= 1 && s.growthYears <= s.horizon, `Growth lasts from 1 to ${s.horizon} years.`);
  need('maturityYears', s.maturityYears >= 0 && s.maturityYears <= s.horizon, `Maturity lasts from 0 to ${s.horizon} years.`);
  need('decline', s.decline >= 0 && s.decline <= 90, 'Enter a decline from 0 to 90% a year.');
  need('extensionYear', s.extensionYear >= 2 && s.extensionYear <= s.horizon, `Start the extension between year 2 and year ${s.horizon}.`);
  need('capexYear', s.capex.year >= 1 && s.capex.year <= s.horizon, `The equipment is bought between year 1 and year ${s.horizon}.`);
  need('capexLife', s.capex.life >= 1, 'The equipment lasts at least a year.');
  for (const k of ['development', 'launchPromotion', 'fixedCosts', 'capexAmount', 'workingCapital'] as const) {
    const v = k === 'capexAmount' ? s.capex.amount : s[k];
    need(k, v >= 0, 'This cannot be negative.');
  }
  return out;
}

export interface PlcView {
  base: PlcRun;
  ext: PlcRun;
  hasExtension: boolean;
  /** Profit and cash over the horizon that the strategies add (or lose). */
  addedProfit: number;
  addedCash: number;
  /** Cost of the strategies chosen. */
  extensionCost: number;
}

export function plcView(s: PlcState): PlcView {
  const base = simulate(s, false);
  const ext = simulate(s, true);
  const hasExtension = s.extensions.some((e) => e.on);
  return { base, ext, hasExtension, addedProfit: ext.totalProfit - base.totalProfit, addedCash: ext.finalCumulative - base.finalCumulative, extensionCost: s.extensions.filter((e) => e.on).reduce((n, e) => n + e.cost, 0) };
}

/** The year the product would stop covering its costs if decline carried on past the horizon, or null. */
export function lossYear(s: PlcState): number | null {
  if (s.decline <= 0) return null;
  for (let y = 2 + s.growthYears + s.maturityYears; y <= 60; y += 1) {
    const u = baseUnits(s, y);
    const profit = u * (s.price - s.variableCost) - s.fixedCosts - (s.promotion.decline / 100) * u * s.price;
    if (profit < 0) return y;
  }
  return null;
}

export function normalizePlc(raw: unknown, f: PlcState): PlcState | null {
  const o = asObj(raw);
  if (!o) return null;
  const pr = asObj(o.promotion) ?? {};
  const cx = asObj(o.capex) ?? {};
  const pc = asObj(o.priceCut) ?? {};
  const horizon = f.horizon;
  const saved = asList(o.extensions, (x) => {
    const e = asObj(x);
    if (!e) return null;
    const id = asOneOf(e.id, EXTENSIONS, 'new-version');
    return { id, on: asBool(e.on), detail: asStr(e.detail, '', 160), uplift: asNum(e.uplift, 0, 0, 200), fade: asNum(e.fade, 0, 0, 100), cost: asNum(e.cost, 0, 0, 1e9) };
  }, 6);
  // Keep the six strategies in their fixed order, filling any the saved file lacks from the worked example.
  const extensions = EXTENSIONS.map((id) => saved.find((e) => e.id === id) ?? f.extensions.find((e) => e.id === id) ?? { id, on: false, detail: '', uplift: 0, fade: 0, cost: 0 });
  return {
    product: asStr(o.product, f.product, 120),
    currency: asStr(o.currency, f.currency, 4),
    unit: asStr(o.unit, f.unit, 30) || f.unit,
    price: asNum(o.price, f.price, 0, 1e7),
    variableCost: asNum(o.variableCost, f.variableCost, 0, 1e7),
    development: asNum(o.development, f.development, 0, 1e10),
    launchPromotion: asNum(o.launchPromotion, f.launchPromotion, 0, 1e10),
    fixedCosts: asNum(o.fixedCosts, f.fixedCosts, 0, 1e10),
    promotion: { growth: asNum(pr.growth, f.promotion.growth, 0, 100), maturity: asNum(pr.maturity, f.promotion.maturity, 0, 100), decline: asNum(pr.decline, f.promotion.decline, 0, 100) },
    capex: { year: asInt(cx.year, f.capex.year, 1, horizon), amount: asNum(cx.amount, f.capex.amount, 0, 1e10), life: asInt(cx.life, f.capex.life, 1, 50) },
    workingCapital: asNum(o.workingCapital, f.workingCapital, 0, 100),
    launch: asNum(o.launch, f.launch, 0, 1e10),
    peak: asNum(o.peak, f.peak, 0, 1e10),
    growthYears: asInt(o.growthYears, f.growthYears, 1, horizon),
    maturityYears: asInt(o.maturityYears, f.maturityYears, 0, horizon),
    decline: asNum(o.decline, f.decline, 0, 90),
    horizon,
    extensionYear: asInt(o.extensionYear, f.extensionYear, 2, horizon),
    priceCut: { price: asNum(pc.price, f.priceCut.price, 0, 90), units: asNum(pc.units, f.priceCut.units, 0, 500) },
    extensions,
  };
}

export function plcCsvRows(s: PlcState): Array<Array<string | number>> {
  const v = plcView(s);
  const r = (x: number) => Math.round(x * 100) / 100;
  return [
    ['Year', 'Stage', `Units (${s.unit})`, 'Price', 'Revenue', 'Contribution', 'Fixed costs', 'Promotion', 'Extension cost', 'Depreciation', 'Profit', 'Capital spending', 'Change in working capital', 'Net cash flow', 'Cumulative cash flow', 'Profit without extension', 'Cumulative cash without extension'],
    ...v.ext.years.map((y, i) => [y.year, y.stage, r(y.units), r(y.price), r(y.revenue), r(y.contribution), r(y.fixed), r(y.promotion), r(y.extensionCost), r(y.depreciation), r(y.profit), r(y.capex), r(y.workingCapitalChange), r(y.cash), r(y.cumulative), r(v.base.years[i]?.profit ?? 0), r(v.base.years[i]?.cumulative ?? 0)]),
  ];
}
