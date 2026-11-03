/**
 * The Boardroom in words. Everything here turns engine numbers into sentences:
 * the tokens in authored narratives ({{cash}}, {{morale.change}}), the plain
 * description of what an option involves, and the explanation of why each
 * part of the business moved. Every figure in these sentences comes from the
 * engine, so the words cannot disagree with the numbers.
 */
import { fmtNumber } from '../format';
import type { KpiId, Kpis, PeriodResult } from './engine';
import { fmtKpi, fmtMoneyCompact, isKpi, JOIN, kpiChange, KPI_DEFS, type FormatContext } from './kpis';
import type { Change, Effects, Scenario } from './schema';
import type { FunctionId } from './roles';

const MINUS = '−';

/** What the sentences need to know about the scenario. */
export interface NarrateContext extends FormatContext {
  /** "quarter" or "year". */
  period: string;
  channels: Record<string, string>;
  assets: Record<string, string>;
  /** Whether the scenario reports defects and a sustainability measure. */
  hasDefects: boolean;
  hasSustainability: boolean;
}

/** Every channel and asset label a scenario defines, wherever it is defined. */
export function narrateContext(sc: Pick<Scenario, 'currency' | 'units' | 'sustainability' | 'model' | 'start' | 'history' | 'rounds'>): NarrateContext {
  const channels: Record<string, string> = {};
  const assets: Record<string, string> = {};
  const visit = (e: Effects | undefined) => {
    if (!e) return;
    for (const c of e.addChannels ?? []) channels[c.id] = c.label;
    for (const p of e.capex ?? []) {
      assets[p.id] = p.label;
      visit(p.effects);
    }
    for (const l of e.later ?? []) visit(l.effects);
  };
  for (const c of sc.start.channels) channels[c.id] = c.label;
  for (const a of sc.start.assets) assets[a.id] = a.label;
  sc.history.forEach((h) => visit(h.effects));
  for (const r of sc.rounds) {
    visit(r.given?.effects);
    for (const o of r.options) {
      visit(o.effects);
      o.when.forEach((w) => visit(w.effects));
    }
    r.event?.variants.forEach((v) => visit(v.effects));
  }
  return {
    symbol: sc.currency.symbol,
    unit: sc.units.singular,
    units: sc.units.plural,
    sustainUnit: sc.sustainability?.unit,
    period: sc.model.period.unit,
    channels,
    assets,
    hasDefects: Boolean(sc.model.defects),
    hasSustainability: Boolean(sc.sustainability),
  };
}

/* ------------------------------------------------------------------ */
/* Tokens                                                              */
/* ------------------------------------------------------------------ */

const TOKEN = /\{\{\s*([a-zA-Z]+)(?:\.(prev|change))?\s*\}\}/g;

/** The tokens a text uses that are not KPIs (the integrity check reports them). */
export function unknownTokens(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(TOKEN)) if (!isKpi(m[1] ?? '')) out.push(m[0]);
  const stray = text.replace(TOKEN, '').match(/\{\{[^}]*\}\}?/g);
  return [...out, ...(stray ?? [])];
}

/** Fill {{kpi}}, {{kpi.prev}} and {{kpi.change}} from a period's figures and the one before. */
export function fillTokens(text: string, now: Kpis, prev: Kpis | undefined, ctx: FormatContext): string {
  return text.replace(TOKEN, (whole, id: string, part?: string) => {
    if (!isKpi(id)) return whole;
    if (part === 'prev') return prev ? fmtKpi(id, prev[id], ctx) : fmtKpi(id, now[id], ctx);
    if (part === 'change') return prev ? kpiChange(id, prev[id], now[id], ctx).text : 'no change';
    return fmtKpi(id, now[id], ctx);
  });
}

/* ------------------------------------------------------------------ */
/* What an option involves                                             */
/* ------------------------------------------------------------------ */

const money = (v: number, ctx: NarrateContext) => fmtMoneyCompact(v, ctx.symbol);
const price = (v: number, ctx: NarrateContext) => `${ctx.symbol}${fmtNumber(v, v < 100 && !Number.isInteger(Math.round(v * 100) / 100) ? 2 : 0)}`;
const count = (v: number) => (Math.abs(v) >= 999_500 ? `${fmtNumber(v / 1e6, 2).replace(/\.?0+$/, '')} million` : fmtNumber(v, 0));
const pct = (v: number) => `${fmtNumber(Math.abs(v), Number.isInteger(v) ? 0 : 1)}%`;
const per = (ctx: NarrateContext) => `a ${ctx.period}`;
const periods = (n: number, ctx: NarrateContext) => `${n} ${ctx.period}${n === 1 ? '' : 's'}`;

/** A change to a quantity, in words: "to £1,280", "up 4%", "down £25". */
function changeWords(c: Change, fmt: (v: number) => string): string {
  const parts: string[] = [];
  if (c.to !== undefined) parts.push(`to ${fmt(c.to)}`);
  if (c.by !== undefined) parts.push(`${c.by >= 0 ? 'up' : 'down'} ${fmt(Math.abs(c.by))}`);
  if (c.pct !== undefined) parts.push(`${c.pct >= 0 ? 'up' : 'down'} ${pct(c.pct)}`);
  return parts.join(', then ');
}

export interface DescribeOptions {
  /** Include the model's assumptions (brand and morale shocks, market moves), not only the levers. */
  assumptions?: boolean;
}

/** What a set of effects does, as short plain sentences, in the order the engine applies them. */
/** Lower-case the first letter of a sentence joined onto another, unless it starts with a name. */
function joinCase(line: string, ctx: NarrateContext): string {
  const names = [...Object.values(ctx.channels), ...Object.values(ctx.assets)];
  if (names.some((n) => line.startsWith(n)) || /^[A-Z]{2}/.test(line)) return line;
  return `${line.charAt(0).toLowerCase()}${line.slice(1)}`;
}

export function describeEffects(e: Effects, ctx: NarrateContext, o: DescribeOptions = {}): string[] {
  const out: string[] = [];
  const ch = (id: string) => ctx.channels[id] ?? id;
  const assume = (s: string) => {
    if (o.assumptions) out.push(s);
  };

  if (e.marketSize) assume(`The whole market changes, ${changeWords(e.marketSize, count)} ${ctx.units} ${per(ctx)}.`);
  if (e.marketGrowth) assume(`Market growth changes, ${changeWords(e.marketGrowth, (v) => `${fmtNumber(v * 100, 1)}%`)} ${per(ctx)}.`);
  if (e.competitorPrice) assume(`Competitors’ prices move ${changeWords(e.competitorPrice, (v) => price(v, ctx))}.`);
  for (const c of e.addChannels ?? []) {
    out.push(
      `New: ${c.label}, ${count(c.demand)} ${ctx.units} ${per(ctx)} at ${price(c.price, ctx)}${c.contracted ? ' under contract' : ''}, paid in ${fmtNumber(c.debtorDays, 0)} days${c.extraCost ? `, with an extra ${price(c.extraCost, ctx)} of cost ${c.contracted ? 'a' : 'for each'} ${ctx.unit}` : ''}.`,
    );
  }
  for (const id of e.removeChannels ?? []) out.push(`${ch(id)} ends.`);
  if (e.price) out.push(`Prices in every open channel ${changeWords(e.price, (v) => price(v, ctx))}.`);
  for (const [id, c] of Object.entries(e.prices ?? {})) out.push(`${ch(id)}: price ${changeWords(c, (v) => price(v, ctx))} a ${ctx.unit}.`);
  for (const [id, c] of Object.entries(e.demand ?? {})) out.push(`${ch(id)}: volume ${changeWords(c, count)} ${ctx.units} ${per(ctx)}.`);
  for (const [id, c] of Object.entries(e.channelDays ?? {})) out.push(`${ch(id)}: payment ${changeWords(c, (v) => `${fmtNumber(v, 0)} days`)}.`);
  for (const [id, c] of Object.entries(e.channelCost ?? {})) out.push(`${ch(id)}: extra cost ${changeWords(c, (v) => price(v, ctx))} a ${ctx.unit}.`);
  if (e.marketing) out.push(`Marketing spend ${changeWords(e.marketing, (v) => money(v, ctx))} ${per(ctx)}.`);
  if (e.brand) assume(`Brand strength ${e.brand > 0 ? '+' : MINUS}${fmtNumber(Math.abs(e.brand), 0)} points at once.`);

  if (e.plantCapacity) out.push(`Plant capacity ${changeWords(e.plantCapacity, count)} ${ctx.units} ${per(ctx)}.`);
  if (e.hoursPerUnit) out.push(`Labour time for each ${ctx.unit} ${changeWords(e.hoursPerUnit, (v) => `${fmtNumber(v, 4)} hours`)}.`);
  if (e.materialCost) out.push(`Materials ${changeWords(e.materialCost, (v) => price(v, ctx))} a ${ctx.unit}.`);
  if (e.energyCost) out.push(`Energy ${changeWords(e.energyCost, (v) => price(v, ctx))} a ${ctx.unit}.`);
  if (e.otherCost) out.push(`Other inputs ${changeWords(e.otherCost, (v) => price(v, ctx))} a ${ctx.unit}.`);
  if (e.emissionsPerUnit) out.push(`Emissions for each ${ctx.unit} ${changeWords(e.emissionsPerUnit, (v) => `${fmtNumber(v, 1)} kg`)}.`);
  if (e.defectBase) out.push(`Underlying defect rate ${changeWords(e.defectBase, (v) => `${fmtNumber(v, 1)} points`)}.`);
  if (e.overheads) out.push(`Overheads ${changeWords(e.overheads, (v) => money(v, ctx))} ${per(ctx)}.`);
  if (e.maintenance) out.push(`Maintenance ${changeWords(e.maintenance, (v) => money(v, ctx))} ${per(ctx)}.`);
  if (e.stockDays) out.push(`Stock held ${changeWords(e.stockDays, (v) => `${fmtNumber(v, 0)} days’ worth`)}.`);

  if (e.redundancies) out.push(`${fmtNumber(e.redundancies, 0)} redundancies${e.redundancyPay ? `, at ${money(e.redundancyPay, ctx)} each` : ''}.`);
  if (e.hire) out.push(`Hire ${fmtNumber(e.hire, 0)} people.`);
  if (e.wage) out.push(e.wage.to === undefined && !e.wage.by && !e.wage.pct ? 'Pay stays where it is: no rise.' : `Pay ${changeWords(e.wage, (v) => money(v, ctx))}.`);
  if (e.replaceLeavers === false) out.push('Stop replacing people who leave.');
  if (e.replaceLeavers === true) out.push('Replace people who leave.');
  if (e.overtimeMax) out.push(`Overtime allowed ${changeWords(e.overtimeMax, (v) => `${fmtNumber(v * 100, 0)}% of normal hours`)}.`);
  if (e.training) out.push(`Training: ${money(e.training, ctx)} this ${ctx.period}.`);
  if (e.skill) out.push(`Productivity ${changeWords(e.skill, (v) => fmtNumber(v, 2))}.`);
  if (e.profitShare) out.push(`Staff share ${pct((e.profitShare.to ?? 0) * 100)} of profit before interest and tax.`);
  if (e.morale) assume(`Morale ${e.morale > 0 ? '+' : MINUS}${fmtNumber(Math.abs(e.morale), 0)} points at the announcement.`);

  if (e.borrow) out.push(`Borrow ${money(e.borrow.amount, ctx)}${e.borrow.rate !== undefined ? ` at ${pct(e.borrow.rate * 100)} a year` : ' at the bank’s rate for new loans'}.`);
  if (e.refinance) out.push(`Convert up to ${money(e.refinance.max, ctx)} of the overdraft into a loan${e.refinance.rate !== undefined ? ` at ${pct(e.refinance.rate * 100)} a year` : ' at the bank’s rate for new loans'}.`);
  if (e.repay) out.push(`Repay up to ${money(e.repay, ctx)} of loans.`);
  if (e.equity) out.push(`Sell ${pct(e.equity.stake)} of the company for ${money(e.equity.amount, ctx)}.`);
  if (e.dividend) out.push(`Pay a dividend of ${money(e.dividend, ctx)}.`);
  if (e.payout) out.push(`Pay out ${changeWords(e.payout, (v) => pct(v * 100))} of profit as dividends.`);
  if (e.factoring === false) out.push('End the factoring agreement.');
  else if (e.factoring) out.push(`Factor ${ch(e.factoring.channel)}’s invoices: cash in ${fmtNumber(e.factoring.days, 0)} days on average, for a fee of ${pct(e.factoring.feeRate * 100)} of their value.`);
  if (e.creditorDays) out.push(`Suppliers paid ${changeWords(e.creditorDays, (v) => `in ${fmtNumber(v, 0)} days`)}.`);
  if (e.overdraftLimit) out.push(`Overdraft limit ${changeWords(e.overdraftLimit, (v) => money(v, ctx))}.`);
  if (e.overdraftRate) out.push(`Overdraft interest ${changeWords(e.overdraftRate, (v) => `${fmtNumber(v * 100, 1)} points`)}.`);
  if (e.loanRate) out.push(`New loans cost ${changeWords(e.loanRate, (v) => pct(v * 100))} a year.`);
  if (e.sellAsset) out.push(`Sell the ${(ctx.assets[e.sellAsset.asset] ?? e.sellAsset.asset).toLowerCase()} for ${money(e.sellAsset.proceeds, ctx)} and lease it back at ${money(e.sellAsset.rent, ctx)} ${per(ctx)}.`);
  if (e.writeOff) out.push(`Write off ${pct(e.writeOff.share * 100)} of what ${ch(e.writeOff.channel)} owes.`);

  for (const p of e.capex ?? []) {
    const when = p.after === 0 ? `in use this ${ctx.period}` : `in use ${p.after === 1 ? `from next ${ctx.period}` : `after ${periods(p.after, ctx)}`}`;
    out.push(`Invest ${money(p.cost, ctx)} in ${p.label.charAt(0).toLowerCase()}${p.label.slice(1)}: ${when}, written off over ${periods(p.life, ctx)}.`);
    if (p.effects) for (const line of describeEffects(p.effects, ctx, o)) out.push(`Once in use: ${joinCase(line, ctx)}`);
  }
  for (const c of e.costs ?? []) out.push(`One-off cost: ${c.label.charAt(0).toLowerCase()}${c.label.slice(1)}, ${money(c.amount, ctx)}.`);
  for (const i of e.income ?? []) out.push(`One-off income: ${i.label.charAt(0).toLowerCase()}${i.label.slice(1)}, ${money(i.amount, ctx)}.`);
  for (const l of e.later ?? []) {
    const lines = describeEffects(l.effects, ctx, o);
    if (lines.length) out.push(`${l.after === 1 ? `Next ${ctx.period}` : `After ${periods(l.after, ctx)}`}: ${lines.map((x) => joinCase(x, ctx)).join(' ')}`);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Why each part of the business moved                                 */
/* ------------------------------------------------------------------ */

const k = (id: KpiId, v: number, ctx: FormatContext) => fmtKpi(id, v, ctx);
const signed = (v: number, d = 1) => `${v >= 0 ? '+' : MINUS}${JOIN}${fmtNumber(Math.abs(v), d)}`;
const signedMoney = (v: number, ctx: FormatContext) => `${v >= 0 ? '+' : MINUS}${JOIN}${fmtMoneyCompact(Math.abs(v), ctx.symbol)}`;

function listJoin(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** The demand drivers of the open (non-contract) channels against the previous period, as approximate percentages. */
function demandDrivers(now: PeriodResult, prev: PeriodResult | undefined): Array<{ what: string; pct: number }> {
  if (!prev) return [];
  const sums = { market: 0, price: 0, brand: 0, green: 0, weight: 0 };
  for (const c of now.channels) {
    if (c.contracted) continue;
    const p = prev.channels.find((x) => x.id === c.id);
    if (!p || p.demand <= 0) continue;
    const w = p.demand;
    sums.market += w * Math.log(c.factors.market / p.factors.market);
    sums.price += w * Math.log(c.factors.price / p.factors.price);
    sums.brand += w * Math.log(c.factors.brand / p.factors.brand);
    sums.green += w * Math.log(c.factors.green / p.factors.green);
    sums.weight += w;
  }
  if (sums.weight <= 0) return [];
  const toPct = (x: number) => (Math.exp(x / sums.weight) - 1) * 100;
  return [
    { what: 'price against competitors', pct: toPct(sums.price) },
    { what: 'brand strength', pct: toPct(sums.brand) },
    { what: 'market growth', pct: toPct(sums.market) },
    { what: 'the lower carbon footprint', pct: toPct(sums.green) },
  ].filter((d) => Math.abs(d.pct) >= 0.5);
}

/** Sentences explaining one period, grouped by the part of the business they belong to. */
export function explain(now: PeriodResult, prev: PeriodResult | undefined, ctx: NarrateContext): Record<FunctionId, string[]> {
  const out: Record<FunctionId, string[]> = { marketing: [], operations: [], people: [], finance: [], sustainability: [] };
  const n = now.kpis;
  const p = prev?.kpis;

  /* Marketing */
  const drivers = demandDrivers(now, prev);
  if (p && Math.abs(n.demand - p.demand) / Math.max(1, p.demand) >= 0.005) {
    const move = ((n.demand - p.demand) / p.demand) * 100;
    out.marketing.push(
      `Demand ${move >= 0 ? 'rose' : 'fell'} ${pct(move)} to ${count(n.demand)} ${ctx.units}${
        drivers.length ? `. In the open channels, ${listJoin(drivers.map((d) => `${d.what} ${d.pct >= 0 ? 'added' : 'took off'} about ${pct(d.pct)}`))}` : ''
      }.`,
    );
  } else {
    out.marketing.push(`Demand was ${count(n.demand)} ${ctx.units}${p ? ', much as before' : ''}.`);
  }
  for (const c of now.channels) if (c.contracted && c.volume > 0) out.marketing.push(`${c.label} took ${count(c.volume)} ${ctx.units} under contract at ${price(c.price, ctx)}.`);
  out.marketing.push(`Revenue ${k('revenue', n.revenue, ctx)} at an average ${price(n.avgPrice, ctx)} a ${ctx.unit}; market share ${k('marketShare', n.marketShare, ctx)}.`);
  const b = now.brandParts;
  const bParts: string[] = [];
  if (Math.abs(b.marketingNow + b.carry) >= 0.05) bParts.push(`marketing ${signed(b.marketingNow + b.carry)}`);
  if (Math.abs(b.shocks) >= 0.05) bParts.push(`events and decisions ${signed(b.shocks)}`);
  if (Math.abs(b.service) >= 0.05) bParts.push(`service from staff ${signed(b.service)}`);
  if (Math.abs(b.lostSales) >= 0.05) bParts.push(`disappointed customers ${signed(b.lostSales)}`);
  if (Math.abs(b.defects) >= 0.05) bParts.push(`defects ${signed(b.defects)}`);
  if (bParts.length) out.marketing.push(`Brand strength went from ${fmtNumber(b.prev, 1)} to ${fmtNumber(b.end, 1)}: ${listJoin(bParts)}.`);

  /* Operations */
  const o = now.ops;
  if (n.lostSales > 0.5) {
    out.operations.push(
      `Demand of ${count(n.demand)} outran productive capacity of ${count(n.capacity)}: ${count(n.lostSales)} sales were lost. ${o.binding === 'labour' ? 'The workforce, not the plant, was the limit.' : 'The plant was the limit.'}`,
    );
  } else {
    out.operations.push(`The business made ${count(o.produced)} ${ctx.units}, using ${k('utilization', n.utilization, ctx)} of productive capacity.`);
  }
  if (o.overtimeUnits > 0.5) {
    out.operations.push(`Normal hours covered ${count(o.labourNormal)} ${ctx.units}; the other ${count(o.overtimeUnits)} needed ${count(o.overtimeHours)} hours of overtime, costing ${money(o.overtimePay, ctx)}.`);
  }
  if (o.labourUse < 85) out.operations.push(`Staff had work for ${fmtNumber(o.labourUse, 0)}% of their normal hours: paid time the business could not use.`);
  out.operations.push(`Output per worker: ${count(n.productivity)} ${ctx.units}.`);
  if (ctx.hasDefects) out.operations.push(`Defect rate ${k('defectRate', n.defectRate, ctx)}: ${count(o.defectUnits)} ${ctx.units} scrapped or returned, wasting ${money(o.defectCost, ctx)} of inputs.`);
  for (const a of now.arrivals) out.operations.push(a);

  /* People */
  const pe = now.people;
  const moves: string[] = [];
  if (pe.hired) moves.push(`${pe.hired} hired`);
  if (pe.redundancies) moves.push(`${pe.redundancies} made redundant`);
  if (pe.leavers) moves.push(`${pe.leavers} left${pe.replaced ? ` and ${pe.replaced === pe.leavers ? 'were' : `${pe.replaced} were`} replaced` : ' and were not replaced'}`);
  out.people.push(`${moves.length ? `${listJoin(moves).charAt(0).toUpperCase()}${listJoin(moves).slice(1)}; the` : 'The'} workforce ended the ${ctx.period} at ${pe.close}.`);
  out.people.push(`Labour turnover ran at ${fmtNumber(pe.turnover, 1)}% a year${now.pl.recruitment > 0 ? `; recruiting and inducting new starters cost ${money(now.pl.recruitment, ctx)}` : ''}.`);
  const m = pe.morale;
  const mParts: string[] = [];
  if (Math.abs(m.recovery) >= 0.05) mParts.push(`${m.recovery >= 0 ? 'settling back' : 'drifting back'} towards normal ${signed(m.recovery)}`);
  if (Math.abs(m.shocks) >= 0.05) mParts.push(`how the change was received ${signed(m.shocks)}`);
  if (Math.abs(m.wage) >= 0.05) mParts.push(`pay ${signed(m.wage)}`);
  if (Math.abs(m.layoffs) >= 0.05) mParts.push(`redundancies ${signed(m.layoffs)}`);
  if (Math.abs(m.overtime) >= 0.05) mParts.push(`overtime ${signed(m.overtime)}`);
  if (Math.abs(m.idle) >= 0.05) mParts.push(`idle time and job worries ${signed(m.idle)}`);
  out.people.push(`Morale went from ${fmtNumber(m.prev, 1)} to ${fmtNumber(m.end, 1)}${mParts.length ? `: ${listJoin(mParts)}` : ''}.`);
  if (now.pl.bonus > 0.5) out.people.push(`The profit share paid ${money(now.pl.bonus, ctx)}.`);

  /* Finance */
  const pl = now.pl;
  out.finance.push(`Profit before interest and tax ${k('pbit', n.pbit, ctx)} (${k('profitMargin', n.profitMargin, ctx)} of revenue); after ${money(pl.interest, ctx)} of interest and ${money(pl.tax, ctx)} of tax, profit for the ${ctx.period} was ${k('profit', n.profit, ctx)}.`);
  const items = [...pl.oneOffs.map((x) => `${x.label.toLowerCase()} ${money(x.amount, ctx)}`)];
  if (pl.redundancy > 0.5) items.push(`redundancy pay ${money(pl.redundancy, ctx)}`);
  if (pl.training > 0.5) items.push(`training ${money(pl.training, ctx)}`);
  if (pl.badDebts > 0.5) items.push(`bad debts ${money(pl.badDebts, ctx)}`);
  if (pl.factoring > 0.5) items.push(`factoring fees ${money(pl.factoring, ctx)}`);
  if (items.length) out.finance.push(`Costs of change in the ${ctx.period}: ${listJoin(items)}.`);
  if (pl.gain > 0.5) out.finance.push(`A one-off gain of ${money(pl.gain, ctx)} on the sale of an asset is inside that profit; it will not recur.`);
  const c = now.cash;
  const bridge: string[] = [`profit ${signedMoney(c.profit, ctx)}`];
  if (Math.abs(c.depreciation) >= 500) bridge.push(`depreciation added back ${signedMoney(c.depreciation, ctx)}`);
  if (Math.abs(c.gain) >= 500) bridge.push(`the gain, which is not cash, ${signedMoney(c.gain, ctx)}`);
  if (Math.abs(c.debtors) >= 500) bridge.push(`debtors ${signedMoney(c.debtors, ctx)}`);
  if (Math.abs(c.stock) >= 500) bridge.push(`stock ${signedMoney(c.stock, ctx)}`);
  if (Math.abs(c.creditors) >= 500) bridge.push(`creditors ${signedMoney(c.creditors, ctx)}`);
  if (Math.abs(c.capex) >= 500) bridge.push(`investment ${signedMoney(c.capex, ctx)}`);
  if (Math.abs(c.proceeds) >= 500) bridge.push(`asset sales ${signedMoney(c.proceeds, ctx)}`);
  if (Math.abs(c.borrowed) >= 500) bridge.push(`new borrowing ${signedMoney(c.borrowed, ctx)}`);
  if (Math.abs(c.repaid) >= 500) bridge.push(`loans repaid ${signedMoney(c.repaid, ctx)}`);
  if (Math.abs(c.equity) >= 500) bridge.push(`new shares ${signedMoney(c.equity, ctx)}`);
  if (Math.abs(c.dividends) >= 500) bridge.push(`dividends ${signedMoney(c.dividends, ctx)}`);
  out.finance.push(`Net cash went from ${money(c.open, ctx)} to ${money(c.close, ctx)}: ${listJoin(bridge)}.`);
  if (n.overdraft > 0.5) {
    out.finance.push(
      `The overdraft stood at ${money(n.overdraft, ctx)} against a limit of ${money(now.overdraftLimit, ctx)}${n.overdraftExcess > 0.5 ? `: ${money(n.overdraftExcess, ctx)} over it, and the bank charges a penalty rate on the excess` : ''}.`,
    );
  }
  out.finance.push(`Current ratio ${k('currentRatio', n.currentRatio, ctx)}, acid test ${k('acidTest', n.acidTest, ctx)}, gearing ${k('gearing', n.gearing, ctx)}.`);

  /* Sustainability */
  if (ctx.hasSustainability) {
    const change = p ? kpiChange('emissionsPerUnit', p.emissionsPerUnit, n.emissionsPerUnit, ctx) : undefined;
    out.sustainability.push(
      `Emissions ${fmtNumber(n.emissions, 0)} tonnes of CO₂e: ${fmtKpi('emissionsPerUnit', n.emissionsPerUnit, ctx)} for each ${ctx.unit}${change && change.direction !== 'same' ? ` (${change.text})` : ''}.`,
    );
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* How a decision flowed across the business                           */
/* ------------------------------------------------------------------ */

const FLOW: Record<FunctionId, KpiId[]> = {
  marketing: ['volume', 'marketShare', 'brand', 'avgPrice'],
  operations: ['utilization', 'lostSales', 'defectRate', 'productivity'],
  people: ['morale', 'turnover', 'headcount'],
  finance: ['pbit', 'netCash', 'acidTest', 'gearing'],
  sustainability: ['emissionsPerUnit'],
};

/** Is a change big enough to report in the flow? */
function notable(id: KpiId, before: number, after: number): boolean {
  const def = KPI_DEFS[id];
  const d = after - before;
  switch (def.kind) {
    case 'percent':
      return Math.abs(d) >= 0.8;
    case 'index':
      return Math.abs(d) >= 1.5;
    case 'ratio':
      return Math.abs(d) >= 0.08;
    case 'people':
      return Math.abs(d) >= 1;
    case 'perUnit':
      return Math.abs(d) >= Math.max(0.05, Math.abs(before) * 0.03);
    default:
      return Math.abs(d) >= Math.max(1, Math.abs(before) * 0.03);
  }
}

export interface FlowStep {
  fn: FunctionId;
  changes: Array<{ id: KpiId; text: string; verdict: string }>;
}

/** The notable changes of a period, function by function, starting from the one that led the decision. */
export function flow(now: PeriodResult, prev: PeriodResult, lead: FunctionId, ctx: NarrateContext): FlowStep[] {
  const order = (['marketing', 'operations', 'people', 'finance', 'sustainability'] as FunctionId[]).filter((f) => f !== 'sustainability' || ctx.hasSustainability);
  const start = order.indexOf(lead);
  const ordered = start > 0 ? [...order.slice(start), ...order.slice(0, start)] : order;
  return ordered
    .map((fn) => ({
      fn,
      changes: FLOW[fn]
        .filter((id) => (id !== 'defectRate' || ctx.hasDefects) && notable(id, prev.kpis[id], now.kpis[id]))
        .slice(0, 2)
        .map((id) => {
          const c = kpiChange(id, prev.kpis[id], now.kpis[id], ctx);
          const word = c.verdict === 'better' || c.verdict === 'worse' ? `, ${c.verdict}` : '';
          return { id, text: `${KPI_DEFS[id].short} ${c.text}${word}`, verdict: c.verdict };
        }),
    }))
    .filter((s) => s.changes.length > 0);
}

/** The function a role leads. */
export const ROLE_FUNCTION: Record<string, FunctionId> = { ceo: 'finance', finance: 'finance', marketing: 'marketing', operations: 'operations', hr: 'people' };

export const FUNCTION_LABELS: Record<FunctionId, string> = {
  marketing: 'Marketing',
  operations: 'Operations',
  people: 'People',
  finance: 'Finance',
  sustainability: 'Sustainability',
};

/** Plain words for the flags that event conditions test, used in the casebook. The integrity check requires an entry for every flag a condition names. */
export const FLAG_WORDS: Record<string, string> = {
  factoring: 'the board chose to factor invoices',
  overdraftBreached: 'the overdraft has gone over its limit at any quarter end',
  automated: 'the automated line was chosen',
  cobots: 'the robotic cells were chosen',
  thirdShift: 'the third shift was chosen',
  cuts: 'the board made redundancies',
  eco: 'the hotel was repositioned as eco-certified',
  bigBlock: 'the tour-operator block was expanded',
};
