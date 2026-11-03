/**
 * The Boardroom engine: one business, worked period by period.
 *
 * Pure and deterministic. The same state and the same decisions always give
 * the same result: nothing here is random, reads the clock or touches the page,
 * so every path through a scenario can be replayed, compared and tested, on the
 * server (the casebook and the board pack) and in the browser (the live
 * simulation) alike.
 *
 * How one function's decision reaches the others. Each period is worked in
 * this order, and each step names its lag:
 *
 *  1. Effects arrive. Lagged effects that fall due (the second half of a
 *     marketing push, a shortage ending) are applied first, then the event that
 *     happened between rounds, then the board's decision, and then any
 *     investment whose lag has run out comes into use.
 *  2. People, at the start of the period. Morale moves a share of the way back
 *     towards its norm, then takes any shock: a pay change, redundancies, an
 *     announcement. Labour turnover this period follows morale now (low morale,
 *     more leavers), and leavers are replaced unless hiring is frozen. New
 *     starters produce only part of a full worker's output in their first
 *     period. Morale also moves productivity, the same period.
 *  3. Marketing. The brand moves with marketing spend above or below the level
 *     that holds it steady: half of the effect now, half next period. In a
 *     service business, morale away from its norm moves the brand too, because
 *     staff are part of the product. Demand in each channel follows the market's
 *     size, price against competitors (price elasticity of demand), the brand
 *     and, for green-minded customers, the cut in emissions per unit. Contracts
 *     fix their own volume.
 *  4. Operations. Productive capacity is the lower of the plant's capacity and
 *     what the workforce can make in normal hours plus the overtime allowed.
 *     Contracts are served first; demand beyond capacity is lost. Units above
 *     what normal hours can make are made in overtime at a premium. Where the
 *     scenario has a defect measure, defects rise when the plant is rushed and
 *     when morale is low, and defective units waste materials and hours.
 *  5. Finance. Revenue less variable, fixed and one-off costs gives profit
 *     before interest and tax. Interest is charged on the loans and overdraft
 *     at the start of the period (new borrowing pays interest from the next
 *     period). Tax is a flat rate on positive profit. Debtors, stock and
 *     creditors follow from their days, so profit and cash part company:
 *     faster growth ties up more cash. A negative bank balance is an overdraft;
 *     the part above its limit pays a penalty rate.
 *  6. People and brand, at the end of the period. Overtime strains morale;
 *     idle hours unsettle it. Lost sales and defects cost brand points.
 *
 * Simplifications, stated once: all staff costs are expenses (cost of sales is
 * the materials, energy and other inputs bought for each unit, so the guide's
 * creditor days and stock turnover formulas match the days used here); tax and
 * interest are paid in the period they arise; all loans are non-current
 * liabilities; there are no other current assets or liabilities.
 *
 * People are whole: leavers and hires are rounded to whole persons. Nothing
 * else is rounded; rounding is for display only.
 */
import type { CapexDef, Change, ChannelDef, Effects, ModelDef, StartDef } from './schema';

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export interface ChannelState {
  id: string;
  label: string;
  price: number;
  /** Price at which the channel's demand was set; competitor price moves shift it. */
  priceRef: number;
  demand: number;
  /** Market size when the channel's demand was set. */
  marketRef: number;
  elasticity: number;
  brandWeight: number;
  greenWeight: number;
  debtorDays: number;
  contracted: boolean;
  priority: number;
  extraCost: number;
}

export interface Loan {
  label: string;
  principal: number;
  rate: number;
}

export interface Asset {
  id: string;
  label: string;
  cost: number;
  nbv: number;
  /** Depreciation per period once in use. */
  perPeriod: number;
  /** The period index from which it is in use. */
  startsAt: number;
  /** Effects applied when it comes into use. */
  effects?: Effects;
  inUse: boolean;
}

export interface Pending {
  due: number;
  effects: Effects;
  note: string;
}

export interface State {
  /** Periods completed since the start. */
  index: number;
  label: string;
  marketSize: number;
  marketGrowth: number;
  channels: ChannelState[];
  marketing: number;
  brand: number;
  /** Brand points from last period's marketing still to arrive. */
  brandCarry: number;
  brandRef: number;
  materialCost: number;
  energyCost: number;
  otherCost: number;
  overheads: number;
  maintenance: number;
  plantCapacity: number;
  hoursPerUnit: number;
  overtimeMax: number;
  /** Productivity multiplier from training and practice. */
  skill: number;
  defectBase: number;
  emissionsPerUnit: number;
  emissionsRef: number;
  headcount: number;
  wage: number;
  morale: number;
  replaceLeavers: boolean;
  /** Share of profit before interest and tax paid to staff as a bonus. */
  profitShare: number;
  /** Share of each period's profit paid out as dividends. */
  payout: number;
  /** Cash less overdraft. */
  netCash: number;
  loans: Loan[];
  assets: Asset[];
  debtorsBy: Record<string, number>;
  stock: number;
  creditors: number;
  shareCapital: number;
  retainedEarnings: number;
  ownership: number;
  creditorDays: number;
  stockDays: number;
  overdraftLimit: number;
  overdraftRate: number;
  loanRate: number;
  factoring: { channel: string; days: number; feeRate: number } | null;
  pending: Pending[];
  flags: Record<string, string | number | boolean>;
}

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

export interface ChannelResult {
  id: string;
  label: string;
  price: number;
  demand: number;
  volume: number;
  lost: number;
  revenue: number;
  contracted: boolean;
  debtorDays: number;
  /** Demand factors against the channel's reference: market, price, brand, green. */
  factors: { market: number; price: number; brand: number; green: number };
}

/** The headline measures of one period, by KPI id. */
export interface Kpis {
  revenue: number;
  avgPrice: number;
  volume: number;
  demand: number;
  lostSales: number;
  marketShare: number;
  brand: number;
  capacity: number;
  utilization: number;
  productivity: number;
  defectRate: number;
  variableCosts: number;
  fixedCosts: number;
  oneOffCosts: number;
  costOfSales: number;
  grossProfit: number;
  gpm: number;
  pbit: number;
  profitMargin: number;
  interest: number;
  profit: number;
  /** Units a period needed to cover recurring fixed costs at this period's average contribution; −1 when there is none. */
  breakEven: number;
  cash: number;
  overdraft: number;
  netCash: number;
  overdraftHeadroom: number;
  overdraftExcess: number;
  debt: number;
  equity: number;
  gearing: number;
  currentRatio: number;
  acidTest: number;
  roce: number;
  debtors: number;
  stock: number;
  creditors: number;
  debtorDays: number;
  creditorDays: number;
  stockDays: number;
  headcount: number;
  morale: number;
  turnover: number;
  staffCosts: number;
  emissionsPerUnit: number;
  emissions: number;
  ownership: number;
}
export type KpiId = keyof Kpis;

export interface PeriodResult {
  index: number;
  label: string;
  kpis: Kpis;
  channels: ChannelResult[];
  /** Operations detail. */
  ops: {
    plantCapacity: number;
    labourNormal: number;
    labourMax: number;
    produced: number;
    overtimeUnits: number;
    overtimeHours: number;
    overtimePay: number;
    hoursPaid: number;
    labourUse: number;
    defectUnits: number;
    defectCost: number;
    productivityFactor: number;
    avgHeadcount: number;
    binding: 'demand' | 'plant' | 'labour';
  };
  /** The statement of profit or loss lines. */
  pl: {
    revenue: number;
    materials: number;
    energy: number;
    other: number;
    channelExtras: number;
    costOfSales: number;
    grossProfit: number;
    wages: number;
    overtime: number;
    bonus: number;
    overheads: number;
    marketing: number;
    maintenance: number;
    depreciation: number;
    training: number;
    recruitment: number;
    redundancy: number;
    factoring: number;
    badDebts: number;
    oneOffs: Array<{ label: string; amount: number }>;
    otherIncome: number;
    gain: number;
    expenses: number;
    pbit: number;
    interest: number;
    pbt: number;
    tax: number;
    profit: number;
    dividends: number;
    retained: number;
  };
  /** The cash flow, indirect method, reconciling opening to closing net cash. */
  cash: {
    open: number;
    profit: number;
    depreciation: number;
    gain: number;
    debtors: number;
    stock: number;
    creditors: number;
    operating: number;
    capex: number;
    proceeds: number;
    investing: number;
    borrowed: number;
    repaid: number;
    equity: number;
    dividends: number;
    financing: number;
    net: number;
    close: number;
  };
  /** The statement of financial position at the end of the period. */
  position: {
    nonCurrentAssets: number;
    cash: number;
    debtors: number;
    stock: number;
    currentAssets: number;
    totalAssets: number;
    overdraft: number;
    creditors: number;
    currentLiabilities: number;
    loans: number;
    nonCurrentLiabilities: number;
    netAssets: number;
    shareCapital: number;
    retainedEarnings: number;
    equity: number;
  };
  people: {
    open: number;
    hired: number;
    redundancies: number;
    leavers: number;
    replaced: number;
    close: number;
    turnover: number;
    morale: { prev: number; recovery: number; shocks: number; wage: number; layoffs: number; overtime: number; idle: number; end: number };
  };
  brandParts: { prev: number; marketingNow: number; carry: number; shocks: number; service: number; lostSales: number; defects: number; end: number };
  /** What arrived this period: lagged effects, events and decisions, in words supplied by their authors. */
  arrivals: string[];
  flags: Record<string, string | number | boolean>;
  overdraftLimit: number;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function applyChange(value: number, c: Change | undefined): number {
  if (!c) return value;
  let v = value;
  if (c.to !== undefined) v = c.to;
  if (c.by !== undefined) v += c.by;
  if (c.pct !== undefined) v *= 1 + c.pct / 100;
  return v;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function cloneState(s: State): State {
  return JSON.parse(JSON.stringify(s)) as State;
}

function channelFrom(def: ChannelDef, model: ModelDef, marketSize: number): ChannelState {
  return {
    id: def.id,
    label: def.label,
    price: def.price,
    priceRef: def.price,
    demand: def.demand,
    marketRef: marketSize,
    elasticity: def.elasticity ?? model.elasticity,
    brandWeight: def.brandWeight ?? model.brandWeight,
    greenWeight: def.greenWeight ?? model.greenWeight,
    debtorDays: def.debtorDays,
    contracted: def.contracted,
    priority: def.priority ?? (def.contracted ? 1 : 2),
    extraCost: def.extraCost,
  };
}

/** The share of the year one period is. */
const yearShare = (m: ModelDef) => m.period.days / 365;

/* ------------------------------------------------------------------ */
/* Effects                                                             */
/* ------------------------------------------------------------------ */

/** Money and people moved by effects at the start of a period; the period's result reports them. */
interface Movements {
  capex: number;
  proceeds: number;
  gain: number;
  borrowed: number;
  repaid: number;
  equity: number;
  dividends: number;
  hired: number;
  redundancies: number;
  redundancyCost: number;
  training: number;
  moraleShock: number;
  wageChangePct: number;
  brandShock: number;
  badDebts: number;
  oneOffs: Array<{ label: string; amount: number }>;
  income: number;
  arrivals: string[];
}

const noMovements = (): Movements => ({
  capex: 0,
  proceeds: 0,
  gain: 0,
  borrowed: 0,
  repaid: 0,
  equity: 0,
  dividends: 0,
  hired: 0,
  redundancies: 0,
  redundancyCost: 0,
  training: 0,
  moraleShock: 0,
  wageChangePct: 0,
  brandShock: 0,
  badDebts: 0,
  oneOffs: [],
  income: 0,
  arrivals: [],
});

/**
 * Apply one set of effects to the state at the start of period `index`.
 * The order is fixed: flags, market and channels, marketing, operations,
 * people, finance, investment, one-off items, then lagged effects are queued.
 */
function applyEffects(model: ModelDef, s: State, e: Effects, index: number, mv: Movements): void {
  if (e.flags) Object.assign(s.flags, e.flags);

  /* Market and channels */
  s.marketSize = applyChange(s.marketSize, e.marketSize);
  s.marketGrowth = applyChange(s.marketGrowth, e.marketGrowth);
  for (const def of e.addChannels ?? []) {
    s.channels = s.channels.filter((c) => c.id !== def.id);
    s.channels.push(channelFrom(def, model, s.marketSize));
  }
  if (e.removeChannels?.length) s.channels = s.channels.filter((c) => !e.removeChannels?.includes(c.id));
  for (const c of s.channels) {
    if (!c.contracted && e.price) c.price = applyChange(c.price, e.price);
    if (e.prices?.[c.id]) c.price = applyChange(c.price, e.prices[c.id]);
    if (e.demand?.[c.id]) c.demand = Math.max(0, applyChange(c.demand, e.demand[c.id]));
    if (e.channelDays?.[c.id]) c.debtorDays = Math.max(0, applyChange(c.debtorDays, e.channelDays[c.id]));
    if (e.channelCost?.[c.id]) c.extraCost = Math.max(0, applyChange(c.extraCost, e.channelCost[c.id]));
    if (!c.contracted && e.competitorPrice) c.priceRef = applyChange(c.priceRef, e.competitorPrice);
  }
  s.marketing = Math.max(0, applyChange(s.marketing, e.marketing));
  if (e.brand) mv.brandShock += e.brand;

  /* Operations */
  s.plantCapacity = Math.max(0, applyChange(s.plantCapacity, e.plantCapacity));
  s.hoursPerUnit = Math.max(1e-9, applyChange(s.hoursPerUnit, e.hoursPerUnit));
  s.materialCost = Math.max(0, applyChange(s.materialCost, e.materialCost));
  s.energyCost = Math.max(0, applyChange(s.energyCost, e.energyCost));
  s.otherCost = Math.max(0, applyChange(s.otherCost, e.otherCost));
  s.emissionsPerUnit = Math.max(0, applyChange(s.emissionsPerUnit, e.emissionsPerUnit));
  s.defectBase = clamp(applyChange(s.defectBase, e.defectBase), 0, 40);
  s.overheads = Math.max(0, applyChange(s.overheads, e.overheads));
  s.maintenance = Math.max(0, applyChange(s.maintenance, e.maintenance));
  s.stockDays = Math.max(0, applyChange(s.stockDays, e.stockDays));

  /* People */
  if (e.redundancies) {
    const n = Math.min(e.redundancies, s.headcount - 1);
    mv.redundancies += n;
    mv.redundancyCost += n * (e.redundancyPay ?? 0);
    s.headcount -= n;
  }
  if (e.hire) {
    mv.hired += e.hire;
    s.headcount += e.hire;
  }
  if (e.wage) {
    const before = s.wage;
    s.wage = Math.max(0, applyChange(s.wage, e.wage));
    mv.wageChangePct += before > 0 ? ((s.wage - before) / before) * 100 : 0;
  }
  if (e.replaceLeavers !== undefined) s.replaceLeavers = e.replaceLeavers;
  s.overtimeMax = Math.max(0, applyChange(s.overtimeMax, e.overtimeMax));
  if (e.training) mv.training += e.training;
  s.skill = Math.max(0.1, applyChange(s.skill, e.skill));
  if (e.morale) mv.moraleShock += e.morale;
  s.profitShare = clamp(applyChange(s.profitShare, e.profitShare), 0, 0.5);

  /* Finance */
  if (e.borrow) {
    s.loans.push({ label: e.borrow.label ?? 'Bank loan', principal: e.borrow.amount, rate: e.borrow.rate ?? s.loanRate });
    mv.borrowed += e.borrow.amount;
  }
  if (e.refinance) {
    const amount = Math.min(e.refinance.max, Math.max(0, -s.netCash));
    if (amount > 0) {
      s.loans.push({ label: e.refinance.label ?? 'Term loan', principal: amount, rate: e.refinance.rate ?? s.loanRate });
      mv.borrowed += amount;
    }
  }
  if (e.repay) {
    let left = e.repay;
    for (const l of s.loans) {
      const r = Math.min(left, l.principal);
      l.principal -= r;
      left -= r;
      mv.repaid += r;
    }
    s.loans = s.loans.filter((l) => l.principal > 1e-9);
  }
  if (e.equity) {
    mv.equity += e.equity.amount;
    s.shareCapital += e.equity.amount;
    s.ownership *= 1 - e.equity.stake / 100;
  }
  if (e.dividend) mv.dividends += e.dividend;
  s.payout = clamp(applyChange(s.payout, e.payout), 0, 1);
  if (e.factoring !== undefined) s.factoring = e.factoring === false ? null : { ...e.factoring };
  s.creditorDays = Math.max(0, applyChange(s.creditorDays, e.creditorDays));
  s.overdraftLimit = Math.max(0, applyChange(s.overdraftLimit, e.overdraftLimit));
  s.overdraftRate = Math.max(0, applyChange(s.overdraftRate, e.overdraftRate));
  s.loanRate = Math.max(0, applyChange(s.loanRate, e.loanRate));
  if (e.sellAsset) {
    const a = s.assets.find((x) => x.id === e.sellAsset?.asset);
    if (a) {
      mv.proceeds += e.sellAsset.proceeds;
      mv.gain += e.sellAsset.proceeds - a.nbv;
      s.assets = s.assets.filter((x) => x !== a);
      s.overheads += e.sellAsset.rent;
    }
  }
  if (e.writeOff) {
    const owed = s.debtorsBy[e.writeOff.channel] ?? 0;
    const w = owed * e.writeOff.share;
    s.debtorsBy[e.writeOff.channel] = owed - w;
    mv.badDebts += w;
  }

  /* Investment: paid now, in use after its lag */
  for (const p of e.capex ?? []) addCapex(s, p, index, mv);

  /* One-off items */
  for (const c of e.costs ?? []) mv.oneOffs.push({ ...c });
  for (const i of e.income ?? []) mv.income += i.amount;

  /* Lags */
  for (const l of e.later ?? []) s.pending.push({ due: index + l.after, effects: l.effects, note: l.note });
}

function addCapex(s: State, p: CapexDef, index: number, mv: Movements): void {
  mv.capex += p.cost;
  s.assets.push({ id: p.id, label: p.label, cost: p.cost, nbv: p.cost, perPeriod: p.cost / p.life, startsAt: index + p.after, effects: p.effects, inUse: false });
}

/* ------------------------------------------------------------------ */
/* Operating a period: demand, capacity, volume and costs              */
/* ------------------------------------------------------------------ */

interface Operation {
  channels: ChannelResult[];
  demand: number;
  volume: number;
  produced: number;
  lost: number;
  revenue: number;
  plantCapacity: number;
  labourNormal: number;
  labourMax: number;
  capacity: number;
  utilization: number;
  overtimeUnits: number;
  overtimeHours: number;
  overtimePay: number;
  hoursPaid: number;
  labourUse: number;
  defectRate: number;
  defectUnits: number;
  defectCost: number;
  productivityFactor: number;
  materials: number;
  energy: number;
  other: number;
  channelExtras: number;
  binding: 'demand' | 'plant' | 'labour';
}

/** The green score: the per cent cut in emissions per unit against the reference (negative if worse). */
export function greenScore(s: Pick<State, 'emissionsPerUnit' | 'emissionsRef'>): number {
  return s.emissionsRef > 0 ? (1 - s.emissionsPerUnit / s.emissionsRef) * 100 : 0;
}

function channelDemand(c: ChannelState, s: State, brand: number): ChannelResult['factors'] & { demand: number } {
  if (c.contracted) return { market: 1, price: 1, brand: 1, green: 1, demand: c.demand };
  const market = c.marketRef > 0 ? s.marketSize / c.marketRef : 1;
  const price = Math.pow(c.price / c.priceRef, -c.elasticity);
  const brandF = Math.max(0.2, 1 + c.brandWeight * (brand - s.brandRef));
  const green = Math.max(0.2, 1 + c.greenWeight * greenScore(s));
  return { market, price, brand: brandF, green, demand: c.demand * market * price * brandF * green };
}

/**
 * Demand, capacity, volume and the costs that follow from them, for a state
 * whose people and brand are already set for the period.
 */
function operate(model: ModelDef, s: State, avgHeadcount: number, newStarters: number, moraleStart: number, brand: number): Operation {
  const hoursPaid = avgHeadcount * model.hoursPerWorker;
  const productivityFactor = s.skill * Math.max(0.5, 1 + model.moraleProductivity * (moraleStart - model.moraleNorm));
  const effectiveWorkers = Math.max(0, avgHeadcount - newStarters * (1 - model.newStarterOutput));
  const effectiveHours = effectiveWorkers * model.hoursPerWorker * productivityFactor;
  const labourNormal = effectiveHours / s.hoursPerUnit;
  const labourMax = labourNormal * (1 + s.overtimeMax);
  const rawCapacity = Math.min(s.plantCapacity, labourMax);

  const demands = s.channels.map((c) => ({ c, ...channelDemand(c, s, brand) }));
  const demand = demands.reduce((a, d) => a + d.demand, 0);

  // Defects: rushing (utilization above a threshold, judged before defects) and low morale add to the base rate.
  let defectRate = 0;
  if (model.defects) {
    const u0 = rawCapacity > 0 ? (Math.min(demand, rawCapacity) / rawCapacity) * 100 : 0;
    defectRate = clamp(s.defectBase + model.defects.strain * Math.max(0, u0 - model.defects.threshold) + model.defects.morale * Math.max(0, model.moraleNorm - moraleStart), 0, 40);
  }
  const good = 1 - defectRate / 100;
  const capacity = rawCapacity * good;

  // Serve contracts first, then the rest, by priority; the remainder of demand is lost.
  let left = capacity;
  const order = [...demands].sort((a, b) => a.c.priority - b.c.priority);
  const served = new Map<string, number>();
  for (const d of order) {
    const v = Math.min(d.demand, Math.max(0, left));
    served.set(d.c.id, v);
    left -= v;
  }
  const channels: ChannelResult[] = demands.map((d) => {
    const volume = served.get(d.c.id) ?? 0;
    return {
      id: d.c.id,
      label: d.c.label,
      price: d.c.price,
      demand: d.demand,
      volume,
      lost: d.demand - volume,
      revenue: volume * d.c.price,
      contracted: d.c.contracted,
      debtorDays: s.factoring?.channel === d.c.id ? s.factoring.days : d.c.debtorDays,
      factors: { market: d.market, price: d.price, brand: d.brand, green: d.green },
    };
  });
  const volume = channels.reduce((a, c) => a + c.volume, 0);
  const revenue = channels.reduce((a, c) => a + c.revenue, 0);
  const produced = good > 0 ? volume / good : volume;
  const defectUnits = produced - volume;

  const overtimeUnits = Math.max(0, produced - labourNormal);
  const effectivePerPaidHour = hoursPaid > 0 ? effectiveHours / hoursPaid : 1;
  const overtimeHours = effectivePerPaidHour > 0 ? (overtimeUnits * s.hoursPerUnit) / effectivePerPaidHour : 0;
  const overtimePay = overtimeHours * (s.wage / model.hoursPerWorker) * (1 + model.overtimePremium);
  const labourUse = labourNormal > 0 ? (Math.min(produced, labourNormal) / labourNormal) * 100 : 0;

  const materials = produced * s.materialCost;
  const energy = produced * s.energyCost;
  const other = produced * s.otherCost;
  const channelExtras = channels.reduce((a, c) => a + c.volume * (s.channels.find((x) => x.id === c.id)?.extraCost ?? 0), 0);
  const defectCost = defectUnits * (s.materialCost + s.energyCost + s.otherCost);
  const utilization = rawCapacity > 0 ? (produced / rawCapacity) * 100 : 0;
  const binding: Operation['binding'] = demand <= capacity + 1e-9 ? 'demand' : s.plantCapacity <= labourMax ? 'plant' : 'labour';

  return {
    channels,
    demand,
    volume,
    produced,
    lost: Math.max(0, demand - volume),
    revenue,
    plantCapacity: s.plantCapacity,
    labourNormal,
    labourMax,
    capacity,
    utilization,
    overtimeUnits,
    overtimeHours,
    overtimePay,
    hoursPaid,
    labourUse,
    defectRate,
    defectUnits,
    defectCost,
    productivityFactor,
    materials,
    energy,
    other,
    channelExtras,
    binding,
  };
}

/* ------------------------------------------------------------------ */
/* The starting state                                                  */
/* ------------------------------------------------------------------ */

/**
 * The state at the start of the first period. Debtors, stock and creditors are
 * set to what the starting business's own trading implies; retained earnings
 * are whatever makes the statement of financial position balance.
 */
export function originState(model: ModelDef, start: StartDef): State {
  const s: State = {
    index: 0,
    label: start.label,
    marketSize: start.marketSize,
    marketGrowth: start.marketGrowth,
    channels: start.channels.map((c) => channelFrom(c, model, start.marketSize)),
    marketing: start.marketing,
    brand: start.brand,
    brandCarry: 0,
    brandRef: start.brand,
    materialCost: start.materialCost,
    energyCost: start.energyCost,
    otherCost: start.otherCost,
    overheads: start.overheads,
    maintenance: start.maintenance,
    plantCapacity: start.plantCapacity,
    hoursPerUnit: start.hoursPerUnit,
    overtimeMax: start.overtimeMax,
    skill: 1,
    defectBase: start.defectBase,
    emissionsPerUnit: start.emissionsPerUnit,
    emissionsRef: start.emissionsPerUnit,
    headcount: start.headcount,
    wage: start.wage,
    morale: start.morale,
    replaceLeavers: start.replaceLeavers,
    profitShare: 0,
    payout: start.payout,
    netCash: start.cash,
    loans: start.loans.map((l) => ({ ...l })),
    assets: start.assets.map((a) => ({ id: a.id, label: a.label, cost: a.cost, nbv: a.nbv, perPeriod: a.nbv / a.life, startsAt: 0, inUse: true })),
    debtorsBy: {},
    stock: 0,
    creditors: 0,
    shareCapital: start.shareCapital,
    retainedEarnings: 0,
    ownership: start.ownership,
    creditorDays: start.creditorDays,
    stockDays: start.stockDays,
    overdraftLimit: start.overdraftLimit,
    overdraftRate: start.overdraftRate,
    loanRate: start.loanRate,
    factoring: null,
    pending: [],
    flags: {},
  };
  const op = operate(model, s, s.headcount, 0, s.morale, s.brand);
  const days = model.period.days;
  for (const c of op.channels) s.debtorsBy[c.id] = (c.revenue * c.debtorDays) / days;
  const purchases = op.materials + op.energy + op.other + op.channelExtras;
  s.stock = (purchases * s.stockDays) / days;
  s.creditors = (purchases * s.creditorDays) / days;
  const nbv = s.assets.reduce((a, x) => a + x.nbv, 0);
  const debtors = Object.values(s.debtorsBy).reduce((a, b) => a + b, 0);
  const loans = s.loans.reduce((a, l) => a + l.principal, 0);
  s.retainedEarnings = nbv + s.netCash + debtors + s.stock - s.creditors - loans - s.shareCapital;
  return s;
}

/* ------------------------------------------------------------------ */
/* One period                                                          */
/* ------------------------------------------------------------------ */

export interface EffectsIn {
  effects: Effects;
  /** Who or what caused them, for the trace. */
  note?: string;
}

/**
 * Work one period. `inputs` are applied in order at its start, after any
 * lagged effects that fall due. Returns the new state and the period's result.
 */
export function runPeriod(model: ModelDef, prev: State, inputs: EffectsIn[], label: string): { state: State; result: PeriodResult } {
  const s = cloneState(prev);
  s.index = prev.index + 1;
  s.label = label;
  const i = s.index;
  const mv = noMovements();
  const opening = {
    netCash: prev.netCash,
    debtors: Object.values(prev.debtorsBy).reduce((a, b) => a + b, 0),
    stock: prev.stock,
    creditors: prev.creditors,
    loans: prev.loans.map((l) => ({ ...l })),
    overdraft: Math.max(0, -prev.netCash),
    overdraftLimit: prev.overdraftLimit,
    overdraftRate: prev.overdraftRate,
    headcount: prev.headcount,
    morale: prev.morale,
    brand: prev.brand,
  };

  /* 1. Effects arrive: lagged ones first, then the inputs */
  const due = s.pending.filter((p) => p.due <= i);
  s.pending = s.pending.filter((p) => p.due > i);
  for (const p of due) {
    applyEffects(model, s, p.effects, i, mv);
    mv.arrivals.push(p.note);
  }
  for (const input of inputs) {
    applyEffects(model, s, input.effects, i, mv);
    if (input.note) mv.arrivals.push(input.note);
  }
  // Investments come into use after the period's decisions, so one bought with no lag works this period.
  for (const a of s.assets) {
    if (!a.inUse && a.startsAt <= i) {
      a.inUse = true;
      if (a.effects) applyEffects(model, s, a.effects, i, mv);
      mv.arrivals.push(`${a.label} came into use.`);
    }
  }

  /* 2. People at the start of the period */
  const recovery = model.moraleRecovery * (model.moraleNorm - opening.morale);
  const headBeforeCuts = s.headcount + mv.redundancies - mv.hired;
  const layoffPct = headBeforeCuts > 0 ? (mv.redundancies / headBeforeCuts) * 100 : 0;
  const wageEffect = model.wageMorale * mv.wageChangePct;
  const layoffEffect = -model.layoffShock * layoffPct;
  const moraleStart = clamp(opening.morale + recovery + mv.moraleShock + wageEffect + layoffEffect, 0, 100);
  const turnover = Math.max(model.turnoverMin, model.turnoverBase + model.turnoverPerPoint * (model.moraleNorm - moraleStart));
  const leavers = Math.min(s.headcount, Math.round((turnover / 100) * s.headcount * yearShare(model)));
  const replaced = s.replaceLeavers ? leavers : 0;
  const headStart = s.headcount;
  s.headcount = s.headcount - leavers + replaced;
  // Leavers who are not replaced go, on average, halfway through the period.
  const avgHeadcount = (headStart + s.headcount) / 2;
  const newStarters = mv.hired + replaced;

  /* 3. Marketing: the brand at the start of the period, then demand */
  const spendGap = (s.marketing - model.marketingNorm) / model.marketingNorm;
  const room = spendGap >= 0 ? (100 - opening.brand) / 50 : opening.brand / 50;
  const marketingTotal = model.marketingEffect * spendGap * room;
  const marketingNow = marketingTotal / 2;
  const carry = s.brandCarry;
  const service = (model.serviceWeight * (moraleStart - model.moraleNorm)) / 10;
  const brandStart = clamp(opening.brand + carry + marketingNow + mv.brandShock + service, 0, 100);
  s.marketSize *= 1 + s.marketGrowth;

  /* 4. Operations */
  const op = operate(model, s, avgHeadcount, newStarters, moraleStart, brandStart);

  /* 5. Finance */
  const days = model.period.days;
  const wages = avgHeadcount * s.wage;
  const recruitment = newStarters * model.recruitCost;
  const factoringFee = s.factoring ? (op.channels.find((c) => c.id === s.factoring?.channel)?.revenue ?? 0) * s.factoring.feeRate : 0;
  let depreciation = 0;
  for (const a of s.assets) {
    if (!a.inUse) continue;
    const d = Math.min(a.nbv, a.perPeriod);
    depreciation += d;
    a.nbv -= d;
  }
  const oneOffTotal = mv.oneOffs.reduce((a, o) => a + o.amount, 0);
  // Materials, energy and other inputs are bought for every unit made, defective ones included; defectCost is the part of them wasted.
  const costOfSales = op.materials + op.energy + op.other + op.channelExtras;
  const grossProfit = op.revenue - costOfSales;
  const otherIncome = mv.income + mv.gain;
  const expensesBeforeBonus =
    wages + op.overtimePay + s.overheads + s.marketing + s.maintenance + depreciation + mv.training + recruitment + mv.redundancyCost + factoringFee + mv.badDebts + oneOffTotal;
  // Profit-related pay: a share of the profit the period makes before the bonus itself.
  const bonus = s.profitShare * Math.max(0, grossProfit - expensesBeforeBonus + otherIncome);
  const expenses = expensesBeforeBonus + bonus;
  const pbit = grossProfit - expenses + otherIncome;
  const ys = yearShare(model);
  const loanInterest = opening.loans.reduce((a, l) => a + l.principal * l.rate * ys, 0);
  const overdraftInterest =
    opening.overdraft * opening.overdraftRate * ys + Math.max(0, opening.overdraft - opening.overdraftLimit) * model.penaltyRate * ys;
  const interest = loanInterest + overdraftInterest;
  const pbt = pbit - interest;
  const tax = Math.max(0, pbt) * model.taxRate;
  const profit = pbt - tax;
  const dividends = mv.dividends + s.payout * Math.max(0, profit);
  s.retainedEarnings += profit - dividends;

  // Working capital from its days.
  const debtorsBy: Record<string, number> = {};
  for (const c of op.channels) debtorsBy[c.id] = (c.revenue * c.debtorDays) / days;
  const purchases = costOfSales;
  const stock = (purchases * s.stockDays) / days;
  const creditors = (purchases * s.creditorDays) / days;
  const debtors = Object.values(debtorsBy).reduce((a, b) => a + b, 0);

  const cashOperating = profit + depreciation - mv.gain - (debtors - opening.debtors) - (stock - opening.stock) + (creditors - opening.creditors);
  const cashInvesting = -mv.capex + mv.proceeds;
  const cashFinancing = mv.borrowed - mv.repaid + mv.equity - dividends;
  const net = cashOperating + cashInvesting + cashFinancing;
  s.netCash = opening.netCash + net;
  s.debtorsBy = debtorsBy;
  s.stock = stock;
  s.creditors = creditors;

  /* 6. People and brand at the end of the period */
  const overtimeShare = op.hoursPaid > 0 ? (op.overtimeHours / op.hoursPaid) * 100 : 0;
  const overtimeEffect = -model.overtimeStrain * overtimeShare;
  const idleEffect = (-model.idleStrain * Math.max(0, 85 - op.labourUse)) / 10;
  s.morale = clamp(moraleStart + overtimeEffect + idleEffect, 0, 100);

  const lostShare = op.demand > 0 ? (op.lost / op.demand) * 100 : 0;
  const lostEffect = (-model.lostSalesPenalty * lostShare) / 10;
  const defectEffect = model.defects ? -model.defects.brand * Math.max(0, op.defectRate - s.defectBase) : 0;
  s.brand = clamp(brandStart + lostEffect + defectEffect, 0, 100);
  s.brandCarry = marketingTotal - marketingNow;

  /* Sustainability */
  const emissions = (op.produced * s.emissionsPerUnit) / 1000;

  /* Statement of financial position */
  const nonCurrentAssets = s.assets.reduce((a, x) => a + x.nbv, 0);
  const cash = Math.max(0, s.netCash);
  const overdraft = Math.max(0, -s.netCash);
  // The bank remembers: once the overdraft has gone over its limit at a period end, the flag stays set.
  if (overdraft > s.overdraftLimit + 1e-6) s.flags.overdraftBreached = true;
  const currentAssets = cash + debtors + stock;
  const currentLiabilities = creditors + overdraft;
  const loans = s.loans.reduce((a, l) => a + l.principal, 0);
  const equity = s.shareCapital + s.retainedEarnings;
  const capitalEmployed = loans + equity;

  const variableCosts = costOfSales + op.overtimePay + factoringFee;
  const fixedCosts = wages + s.overheads + s.marketing + s.maintenance + depreciation;
  const oneOffCosts = mv.training + recruitment + mv.redundancyCost + mv.badDebts + oneOffTotal + bonus;
  const avgPrice = op.volume > 0 ? op.revenue / op.volume : 0;
  const vcPerUnit = op.volume > 0 ? variableCosts / op.volume : 0;
  const unitContribution = avgPrice - vcPerUnit;

  const kpis: Kpis = {
    revenue: op.revenue,
    avgPrice,
    volume: op.volume,
    demand: op.demand,
    lostSales: op.lost,
    marketShare: s.marketSize > 0 ? (op.volume / s.marketSize) * 100 : 0,
    brand: s.brand,
    capacity: op.capacity,
    utilization: op.utilization,
    productivity: avgHeadcount > 0 ? op.volume / avgHeadcount : 0,
    defectRate: op.defectRate,
    variableCosts,
    fixedCosts,
    oneOffCosts,
    costOfSales,
    grossProfit,
    gpm: op.revenue > 0 ? (grossProfit / op.revenue) * 100 : 0,
    pbit,
    profitMargin: op.revenue > 0 ? (pbit / op.revenue) * 100 : 0,
    interest,
    profit,
    breakEven: unitContribution > 0 ? fixedCosts / unitContribution : -1,
    cash,
    overdraft,
    netCash: s.netCash,
    overdraftHeadroom: s.overdraftLimit - overdraft,
    overdraftExcess: Math.max(0, overdraft - s.overdraftLimit),
    debt: loans,
    equity,
    gearing: capitalEmployed > 0 ? (loans / capitalEmployed) * 100 : 0,
    currentRatio: currentLiabilities > 0 ? currentAssets / currentLiabilities : 99,
    acidTest: currentLiabilities > 0 ? (currentAssets - stock) / currentLiabilities : 99,
    roce: capitalEmployed > 0 ? ((pbit * model.period.perYear) / capitalEmployed) * 100 : 0,
    debtors,
    stock,
    creditors,
    debtorDays: op.revenue > 0 ? (debtors / op.revenue) * days : 0,
    creditorDays: costOfSales > 0 ? (creditors / costOfSales) * days : 0,
    stockDays: costOfSales > 0 ? (stock / costOfSales) * days : 0,
    headcount: s.headcount,
    morale: s.morale,
    turnover,
    staffCosts: wages + op.overtimePay + bonus,
    emissionsPerUnit: s.emissionsPerUnit,
    emissions,
    ownership: s.ownership,
  };

  const result: PeriodResult = {
    index: i,
    label,
    kpis,
    channels: op.channels,
    ops: {
      plantCapacity: op.plantCapacity,
      labourNormal: op.labourNormal,
      labourMax: op.labourMax,
      produced: op.produced,
      overtimeUnits: op.overtimeUnits,
      overtimeHours: op.overtimeHours,
      overtimePay: op.overtimePay,
      hoursPaid: op.hoursPaid,
      labourUse: op.labourUse,
      defectUnits: op.defectUnits,
      defectCost: op.defectCost,
      productivityFactor: op.productivityFactor,
      avgHeadcount,
      binding: op.binding,
    },
    pl: {
      revenue: op.revenue,
      materials: op.materials,
      energy: op.energy,
      other: op.other,
      channelExtras: op.channelExtras,
      costOfSales,
      grossProfit,
      wages,
      overtime: op.overtimePay,
      bonus,
      overheads: s.overheads,
      marketing: s.marketing,
      maintenance: s.maintenance,
      depreciation,
      training: mv.training,
      recruitment,
      redundancy: mv.redundancyCost,
      factoring: factoringFee,
      badDebts: mv.badDebts,
      oneOffs: mv.oneOffs,
      otherIncome: mv.income,
      gain: mv.gain,
      expenses,
      pbit,
      interest,
      pbt,
      tax,
      profit,
      dividends,
      retained: profit - dividends,
    },
    cash: {
      open: opening.netCash,
      profit,
      depreciation,
      gain: -mv.gain,
      debtors: -(debtors - opening.debtors),
      stock: -(stock - opening.stock),
      creditors: creditors - opening.creditors,
      operating: cashOperating,
      capex: -mv.capex,
      proceeds: mv.proceeds,
      investing: cashInvesting,
      borrowed: mv.borrowed,
      repaid: -mv.repaid,
      equity: mv.equity,
      dividends: -dividends,
      financing: cashFinancing,
      net,
      close: s.netCash,
    },
    position: {
      nonCurrentAssets,
      cash,
      debtors,
      stock,
      currentAssets,
      totalAssets: nonCurrentAssets + currentAssets,
      overdraft,
      creditors,
      currentLiabilities,
      loans,
      nonCurrentLiabilities: loans,
      netAssets: nonCurrentAssets + currentAssets - currentLiabilities - loans,
      shareCapital: s.shareCapital,
      retainedEarnings: s.retainedEarnings,
      equity,
    },
    people: {
      open: opening.headcount,
      hired: mv.hired,
      redundancies: mv.redundancies,
      leavers,
      replaced,
      close: s.headcount,
      turnover,
      morale: { prev: opening.morale, recovery, shocks: mv.moraleShock, wage: wageEffect, layoffs: layoffEffect, overtime: overtimeEffect, idle: idleEffect, end: s.morale },
    },
    brandParts: { prev: opening.brand, marketingNow, carry, shocks: mv.brandShock, service, lostSales: lostEffect, defects: defectEffect, end: s.brand },
    arrivals: mv.arrivals,
    flags: { ...s.flags },
    overdraftLimit: s.overdraftLimit,
  };
  return { state: s, result };
}

/* ------------------------------------------------------------------ */
/* Identities the tests check                                          */
/* ------------------------------------------------------------------ */

/** The accounting identities every period must satisfy; returns the ones that fail. */
export function identityErrors(r: PeriodResult, tolerance = 1e-6): string[] {
  const out: string[] = [];
  const near = (a: number, b: number, what: string) => {
    const scale = Math.max(1, Math.abs(a), Math.abs(b));
    if (Math.abs(a - b) > tolerance * scale) out.push(`${what}: ${a} against ${b}`);
  };
  const k = r.kpis;
  const p = r.pl;
  near(p.revenue, r.channels.reduce((a, c) => a + c.price * c.volume, 0), 'revenue = price × volume, by channel');
  near(p.grossProfit, p.revenue - p.costOfSales, 'gross profit = revenue − cost of sales');
  near(p.pbit, p.revenue + p.otherIncome + p.gain - k.variableCosts - k.fixedCosts - k.oneOffCosts, 'PBIT = revenue + other income − variable − fixed − one-off costs');
  near(p.pbt, p.pbit - p.interest, 'profit before tax = PBIT − interest');
  near(p.profit, p.pbt - p.tax, 'profit for the period = profit before tax − tax');
  near(r.cash.close, r.cash.open + r.cash.operating + r.cash.investing + r.cash.financing, 'closing cash = opening cash + operating + investing + financing');
  near(r.cash.operating, p.profit + p.depreciation + r.cash.gain + r.cash.debtors + r.cash.stock + r.cash.creditors, 'operating cash flow reconciles to profit');
  near(r.position.netAssets, r.position.equity, 'net assets = equity');
  near(r.position.cash - r.position.overdraft, r.cash.close, 'the bank balance in the position matches the cash flow');
  near(k.volume, r.channels.reduce((a, c) => a + c.volume, 0), 'volume = the channels’ volumes');
  if (k.volume > k.capacity * (1 + 1e-9) + 1e-6) out.push(`volume ${k.volume} exceeds capacity ${k.capacity}`);
  if (k.utilization < -1e-9 || k.utilization > 100 + 1e-6) out.push(`utilization ${k.utilization} is outside 0 to 100`);
  for (const [id, v] of Object.entries(k)) if (Number.isNaN(v)) out.push(`${id} is not a number`);
  return out;
}
