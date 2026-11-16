/**
 * The executive simulation's engine: one manufacturing business, worked a
 * year at a time.
 *
 * Pure and deterministic, like the Boardroom's engine
 * (src/lib/boardroom/engine.ts): the same opening position, levers and
 * conditions always give the same year, so every plan can be replayed,
 * compared and tested on the server and in the browser alike. Where the
 * Boardroom's engine takes options written as effects, this one takes a
 * budget spread across a handful of levers, which is why it is a module of
 * its own.
 *
 * How one function's decision reaches the others. Each year is worked in this
 * order, and each step names its lag:
 *
 *  1. The world moves. The home market grows, competitors move their prices,
 *     materials and pay go up, and the exchange rate is what it is. Nobody at
 *     the company chooses these.
 *  2. Last year's decisions arrive. Machinery bought last year comes into use
 *     (more plant capacity, fewer hours a piece); last year's training lifts
 *     skill; an export market set up last year opens; half of last year's
 *     marketing reaches the brand.
 *  3. This year's levers. Prices change. An efficiency programme cuts
 *     overheads at once (with a one-off cost); beyond the slack every
 *     organization carries, it leaves a lasting dent in service quality. Marketing builds the brand with diminishing returns,
 *     half now and half next year. The people programme lifts morale now and
 *     skill next year. Capacity investment and export spending are paid now.
 *  4. People. Morale moves part of the way back to its norm, then takes this
 *     year's shocks (news, the efficiency programme, the people programme).
 *     Labour turnover follows morale; leavers are replaced, and new starters
 *     produce only part of a full worker's output. Morale also moves
 *     productivity the same year.
 *  5. The brand and demand. The brand loses a share of its strength each
 *     year, gains what marketing builds, and gains or loses with last year's
 *     service quality (reviews). Home demand follows the market's size, the price
 *     against competitors (price elasticity of demand) and the brand. Export
 *     demand follows the development of the export market and the price.
 *  6. Operations. Capacity is the lower of the plant's and what the workforce
 *     can make in normal hours plus the overtime allowed. Demand beyond it is
 *     lost, in the same share in each market. Output above normal hours is
 *     made in overtime at a premium. Service quality slips when the workshop
 *     runs above a share of its normal capacity, when morale was low at the
 *     start of the year (disengagement shows in the work over time) and while
 *     cuts bite; poorer quality means more pieces returned and remade.
 *  7. Money. Revenue less cost of sales (materials, delivery, freight,
 *     returns and damage) gives gross profit; less expenses (wages, overtime,
 *     recruitment, overheads, the programmes, depreciation) gives profit
 *     before interest and tax. Interest is charged on the opening balances;
 *     tax is a flat rate on a positive profit. Debtors, stock and creditors
 *     follow their days, so profit and cash part company.
 *  8. The end of the year. Overtime strains morale; turnover above its base
 *     erodes next year's skill.
 *
 * Simplifications, stated once: production staff are paid as expenses (cost
 * of sales is the materials and other inputs bought for each piece, as in the
 * Boardroom); the workforce stays the same size because every leaver is
 * replaced; returned pieces are remade at the cost of their inputs and take
 * no capacity; the loan is not repaid within the plan; dividends are the
 * owners' decision, given with the year's conditions, not a lever;
 * there is no relief for a loss against later tax; the opening plant is kept
 * in repair, each year's upkeep matching its depreciation, so its book value
 * stays level while new machinery is written down. Leavers are whole people;
 * nothing else is rounded.
 */
import type { Conditions, Levers, ModelDef, StartDef } from './schema';

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export interface Asset {
  label: string;
  cost: number;
  nbv: number;
  /** Depreciation a year once in use. */
  perYear: number;
  /** The year index from which it is in use. */
  from: number;
  /** Kept in repair: each year as much is spent replacing worn parts as is charged in depreciation, so its book value stays level. */
  upkeep?: boolean;
}

/** The business at the end of a year (or at the opening position). */
export interface State {
  /** Years completed since the opening position. */
  index: number;
  label: string;
  /** Reference values from the opening position: demand factors are measured against them. */
  ref: { marketSize: number; share: number; price: number; competitorPrice: number; brand: number };
  marketSize: number;
  competitorPrice: number;
  price: number;
  brand: number;
  /** Brand points from last year's marketing still to arrive. */
  brandCarry: number;
  /** Last year's service quality, which this year's reviews reflect. */
  quality: number;
  plantCapacity: number;
  hoursPerPiece: number;
  /** Machinery bought last year, arriving at the start of next year. */
  capacityDue: { plant: number; hoursCut: number };
  headcount: number;
  wage: number;
  morale: number;
  /** Productivity index from training and experience (1 at the opening position). */
  skill: number;
  /** Skill from this year's training, arriving next year. */
  skillDue: number;
  /** Per cent of overheads cut by efficiency programmes so far. */
  cutTotal: number;
  materialCost: number;
  otherCost: number;
  overheads: number;
  /** Set-up spent on the export market so far. */
  intlSetupPaid: number;
  /** Whether export sales are made this year (set-up completed in an earlier year). */
  intlOpen: boolean;
  /** Development of the export market carried into next year. */
  intlDev: number;
  netCash: number;
  loans: number;
  assets: Asset[];
  debtors: number;
  stock: number;
  creditors: number;
  shareCapital: number;
  retainedEarnings: number;
  overdraftLimit: number;
  /** True once a year has ended with the overdraft above its limit. */
  breached: boolean;
}

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

/** The headline measures of a year, by KPI id. */
export interface Kpis {
  revenue: number;
  homeRevenue: number;
  exportRevenue: number;
  exportShare: number;
  price: number;
  relativePrice: number;
  competitorPrice: number;
  marketSize: number;
  demand: number;
  homeDemand: number;
  exportDemand: number;
  volume: number;
  homeVolume: number;
  exportVolume: number;
  lostSales: number;
  lostShare: number;
  marketShare: number;
  brand: number;
  quality: number;
  returnsRate: number;
  plantCapacity: number;
  normalCapacity: number;
  capacity: number;
  utilization: number;
  load: number;
  overtimeHours: number;
  overtimeShare: number;
  productivity: number;
  skill: number;
  headcount: number;
  morale: number;
  turnover: number;
  leavers: number;
  materialPerPiece: number;
  costPerPiece: number;
  costOfSales: number;
  grossProfit: number;
  gpm: number;
  overheads: number;
  marketing: number;
  depreciation: number;
  expenses: number;
  pbit: number;
  profitMargin: number;
  interest: number;
  tax: number;
  profit: number;
  cash: number;
  overdraft: number;
  netCash: number;
  headroom: number;
  debt: number;
  equity: number;
  capitalEmployed: number;
  roce: number;
  currentRatio: number;
  acidTest: number;
  gearing: number;
  debtorDays: number;
  creditorDays: number;
  stockDays: number;
  spend: number;
  capex: number;
  fx: number;
}
export type KpiId = keyof Kpis;

export interface YearResult {
  index: number;
  label: string;
  levers: Levers;
  conditions: Conditions;
  kpis: Kpis;
  /** The statement of profit or loss. */
  pl: {
    revenue: number;
    homeRevenue: number;
    exportRevenue: number;
    materials: number;
    other: number;
    freight: number;
    returns: number;
    damage: number;
    costOfSales: number;
    grossProfit: number;
    wages: number;
    overtime: number;
    recruitment: number;
    overheads: number;
    restructuring: number;
    marketing: number;
    people: number;
    international: number;
    depreciation: number;
    expenses: number;
    pbit: number;
    interest: number;
    pbt: number;
    tax: number;
    profit: number;
    dividends: number;
    retained: number;
  };
  /** The cash flow, indirect method, from opening to closing net cash. */
  cash: {
    open: number;
    profit: number;
    depreciation: number;
    debtors: number;
    stock: number;
    creditors: number;
    operating: number;
    capex: number;
    upkeep: number;
    investing: number;
    dividends: number;
    financing: number;
    net: number;
    close: number;
  };
  /** The statement of financial position at the end of the year. */
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
    netAssets: number;
    shareCapital: number;
    retainedEarnings: number;
    equity: number;
  };
  /** How the brand moved: opening, half of last year's marketing, this year's half, decay, reviews. */
  brandParts: { open: number; carry: number; now: number; decay: number; reviews: number; end: number };
  /** How home demand was built: the market against the opening position, and the price and brand factors. */
  demandParts: { market: number; price: number; brand: number };
  /** How morale moved: opening, recovery, news, programmes, the efficiency programme, overtime. */
  moraleParts: { open: number; recovery: number; news: number; people: number; cut: number; start: number; overtime: number; end: number };
  /** How service quality was set: base, the cuts so far, strain, morale, skill. */
  qualityParts: { base: number; cuts: number; strain: number; morale: number; skill: number; end: number };
  ops: {
    plantCapacity: number;
    labourNormal: number;
    labourMax: number;
    normalCapacity: number;
    capacity: number;
    binding: 'demand' | 'plant' | 'labour';
    overtimeUnits: number;
    productivityFactor: number;
    newStarters: number;
    hoursPerPiece: number;
  };
  intl: { open: boolean; setupPaid: number; development: number; opensNextYear: boolean; pricePerPiece: number };
  /** What arrived at the start of the year from earlier decisions, in words. */
  arrivals: string[];
  breached: boolean;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function cloneState(s: State): State {
  return {
    ...s,
    ref: { ...s.ref },
    capacityDue: { ...s.capacityDue },
    assets: s.assets.map((a) => ({ ...a })),
  };
}

/** Diminishing returns to spending: ln(1 + spend ÷ scale), 0 at no spend. */
export const response = (spend: number, scale: number): number => Math.log(1 + Math.max(0, spend) / scale);

/** Home demand before capacity: the market, the price against competitors and the brand, against the opening position. */
export function homeDemand(model: ModelDef, s: Pick<State, 'ref' | 'marketSize' | 'price' | 'competitorPrice'>, brand: number) {
  const market = s.marketSize / s.ref.marketSize;
  const price = Math.pow(s.price / s.competitorPrice / (s.ref.price / s.ref.competitorPrice), -model.elasticity);
  const brandF = Math.max(0.2, 1 + model.brandWeight * (brand - s.ref.brand));
  return { market, price, brand: brandF, demand: s.ref.marketSize * s.ref.share * market * price * brandF };
}

/** Export demand before capacity: zero until the market is open, then its development and the price. */
export function exportDemand(model: ModelDef, s: Pick<State, 'ref' | 'price' | 'intlOpen' | 'intlDev'>): number {
  if (!s.intlOpen) return 0;
  const developed = 1 - Math.exp(-s.intlDev / model.intlScale);
  return model.intlPotential * developed * Math.pow(s.price / s.ref.price, -model.intlElasticity);
}

/* ------------------------------------------------------------------ */
/* The opening position                                                */
/* ------------------------------------------------------------------ */

/**
 * The business at the opening position. Debtors, stock and creditors are set
 * to what its own trading at the opening price implies; retained earnings are
 * whatever makes the statement of financial position balance.
 */
export function originState(model: ModelDef, start: StartDef): State {
  const s: State = {
    index: 0,
    label: start.label,
    ref: { marketSize: start.marketSize, share: start.share, price: start.price, competitorPrice: start.competitorPrice, brand: start.brand },
    marketSize: start.marketSize,
    competitorPrice: start.competitorPrice,
    price: start.price,
    brand: start.brand,
    // As if the opening year's marketing had been running: half of its effect is still to arrive.
    brandCarry: (model.marketingPower * response(start.marketing, model.marketingScale)) / 2,
    quality: start.quality,
    plantCapacity: start.plantCapacity,
    hoursPerPiece: start.hoursPerPiece,
    capacityDue: { plant: 0, hoursCut: 0 },
    headcount: start.headcount,
    wage: start.wage,
    morale: start.morale,
    skill: 1,
    skillDue: 0,
    cutTotal: 0,
    materialCost: start.materialCost,
    otherCost: start.otherCost,
    overheads: start.overheads,
    intlSetupPaid: 0,
    intlOpen: false,
    intlDev: 0,
    netCash: start.cash,
    loans: start.loans,
    assets: [{ label: start.assets.label, cost: start.assets.cost, nbv: start.assets.nbv, perYear: start.assets.nbv / start.assets.life, from: 1, upkeep: true }],
    debtors: 0,
    stock: 0,
    creditors: 0,
    shareCapital: start.shareCapital,
    retainedEarnings: 0,
    overdraftLimit: start.overdraftLimit,
    breached: false,
  };
  const volume = start.marketSize * start.share;
  const costOfSales = volume * (start.materialCost + start.otherCost);
  s.debtors = (volume * start.price * model.debtorDays) / 365;
  s.stock = (costOfSales * model.stockDays) / 365;
  s.creditors = (costOfSales * model.creditorDays) / 365;
  const nca = s.assets.reduce((a, x) => a + x.nbv, 0);
  s.retainedEarnings = nca + s.netCash + s.debtors + s.stock - s.creditors - s.loans - s.shareCapital;
  return s;
}

/* ------------------------------------------------------------------ */
/* One year                                                            */
/* ------------------------------------------------------------------ */

/** Work one year from the state at the end of the last. */
export function runYear(model: ModelDef, prev: State, levers: Levers, cond: Conditions, label: string): { state: State; result: YearResult } {
  const s = cloneState(prev);
  s.index = prev.index + 1;
  s.label = label;
  const i = s.index;
  const arrivals: string[] = [];
  const opening = { netCash: prev.netCash, debtors: prev.debtors, stock: prev.stock, creditors: prev.creditors, overdraft: Math.max(0, -prev.netCash), loans: prev.loans };

  /* 1. The world moves */
  s.marketSize *= 1 + cond.marketGrowth / 100;
  s.competitorPrice *= 1 + cond.competitorPrice / 100;
  s.materialCost *= 1 + cond.materialCost / 100;
  s.wage *= 1 + cond.wage / 100;
  s.overheads = Math.max(0, s.overheads + cond.overheads);

  /* 2. Last year's decisions arrive */
  if (s.capacityDue.plant > 0 || s.capacityDue.hoursCut > 0) {
    s.plantCapacity += s.capacityDue.plant;
    s.hoursPerPiece *= 1 - s.capacityDue.hoursCut;
    arrivals.push('machinery');
    s.capacityDue = { plant: 0, hoursCut: 0 };
  }
  if (s.skillDue > 0) {
    s.skill += s.skillDue;
    arrivals.push('training');
    s.skillDue = 0;
  }
  if (!prev.intlOpen && prev.intlSetupPaid >= model.intlSetup - 1e-6) {
    s.intlOpen = true;
    arrivals.push('export');
  }
  const exportDev = prev.intlDev;

  /* 3. This year's levers */
  s.price *= 1 + levers.price / 100;
  const saving = (s.overheads * levers.costCut) / 100;
  s.overheads -= saving;
  const restructuring = saving * model.cutCost;
  s.cutTotal += levers.costCut;
  const build = model.marketingPower * response(levers.marketing, model.marketingScale);
  const peopleR = response(levers.people, model.peopleScale);
  s.skillDue += model.peopleSkill * peopleR;
  if (levers.capacity > 0) {
    const m = levers.capacity / 1e6;
    s.capacityDue = { plant: s.capacityDue.plant + m * model.capacityPerMillion, hoursCut: 1 - (1 - s.capacityDue.hoursCut) * (1 - Math.min(0.5, m * model.capacityHours)) };
    s.assets.push({ label: 'New machinery', cost: levers.capacity, nbv: levers.capacity, perYear: levers.capacity / model.capacityLife, from: i + 1 });
  }
  // Export spending pays for the set-up first; the rest develops the market (from next year's sales on).
  const setupNeed = Math.max(0, model.intlSetup - s.intlSetupPaid);
  const toSetup = Math.min(levers.international, setupNeed);
  s.intlSetupPaid += toSetup;
  s.intlDev = s.intlDev * (1 - model.intlDecay) + (levers.international - toSetup);

  /* 4. People at the start of the year */
  const recovery = model.moraleRecovery * (model.moraleNorm - prev.morale);
  const peopleBoost = model.peopleMorale * peopleR;
  const cutShock = -model.cutMorale * levers.costCut;
  const moraleStart = clamp(prev.morale + recovery + cond.morale + peopleBoost + cutShock, 0, 100);
  const turnover = Math.max(model.turnoverMin, model.turnoverBase + model.turnoverPerPoint * (model.moraleNorm - moraleStart));
  const leavers = Math.min(s.headcount, Math.round((turnover / 100) * s.headcount));
  const productivityFactor = s.skill * Math.max(0.5, 1 + model.moraleProductivity * (moraleStart - model.moraleNorm));
  const effectiveWorkers = s.headcount - leavers * (1 - model.newStarterOutput);
  const labourNormal = (effectiveWorkers * model.hoursPerWorker * productivityFactor) / s.hoursPerPiece;
  const labourMax = labourNormal * (1 + model.overtimeMax);
  const normalCapacity = Math.min(s.plantCapacity, labourNormal);
  const capacity = Math.min(s.plantCapacity, labourMax);

  /* 5. The brand and demand */
  const reviews = (model.reviewWeight * (prev.quality - model.qualityRef)) / 10;
  const decay = (model.brandDecay / 100) * prev.brand;
  const brand = clamp(prev.brand + prev.brandCarry + build / 2 - decay + reviews, 0, 100);
  const home = homeDemand(model, s, brand);
  const exportD = exportDemand(model, { ...s, intlDev: exportDev });
  const demand = home.demand + exportD;

  /* 6. Operations */
  const volume = Math.min(demand, capacity);
  const fill = demand > 0 ? volume / demand : 1;
  const homeVolume = home.demand * fill;
  const exportVolume = exportD * fill;
  const lost = demand - volume;
  const overtimeUnits = Math.max(0, volume - labourNormal);
  const overtimeHours = productivityFactor > 0 ? (overtimeUnits * s.hoursPerPiece) / productivityFactor : 0;
  const overtimePay = overtimeHours * (s.wage / model.hoursPerWorker) * (1 + model.overtimePremium);
  const load = normalCapacity > 0 ? (volume / normalCapacity) * 100 : 0;
  const binding: YearResult['ops']['binding'] = demand <= capacity + 1e-9 ? 'demand' : s.plantCapacity <= labourMax ? 'plant' : 'labour';

  const qParts = {
    base: model.qualityBase,
    // The first few per cent of cuts remove slack; beyond that they cut into the work itself.
    cuts: -model.cutQuality * Math.max(0, s.cutTotal - model.cutSlack),
    strain: -model.qualityStrain * Math.max(0, load - model.strainThreshold),
    // Disengagement shows in the work over time: quality follows the morale the year opened with.
    morale: -model.qualityMorale * Math.max(0, model.moraleNorm - prev.morale),
    skill: model.qualitySkill * (s.skill - 1),
  };
  const quality = clamp(qParts.base + qParts.cuts + qParts.strain + qParts.morale + qParts.skill, 0, 100);
  const returnsRate = Math.max(model.returnsMin, model.returnsBase + model.returnsPerPoint * (model.qualityRef - quality));

  /* 7. Money */
  const exportPrice = s.price * model.intlPriceRatio * (model.fxRef / cond.fx);
  const homeRevenue = homeVolume * s.price;
  const exportRevenue = exportVolume * exportPrice;
  const revenue = homeRevenue + exportRevenue;
  const inputs = s.materialCost + s.otherCost;
  const materials = volume * s.materialCost;
  const other = volume * s.otherCost;
  const freight = exportVolume * model.intlFreight;
  const returns = volume * (returnsRate / 100) * inputs;
  const damageRate = cond.exportDamage ?? model.intlDamage;
  const damage = exportVolume * (damageRate / 100) * (inputs + model.intlFreight);
  const costOfSales = materials + other + freight + returns + damage;
  const grossProfit = revenue - costOfSales;
  const wages = s.headcount * s.wage;
  const recruitment = leavers * model.recruitCost;
  let depreciation = 0;
  let upkeep = 0;
  for (const a of s.assets) {
    if (i < a.from) continue;
    const d = Math.min(a.nbv, a.perYear);
    depreciation += d;
    a.nbv -= d;
    if (a.upkeep) {
      a.nbv += d;
      upkeep += d;
    }
  }
  const expenses = wages + overtimePay + recruitment + s.overheads + restructuring + levers.marketing + levers.people + levers.international + depreciation;
  const pbit = grossProfit - expenses;
  const interest = opening.loans * model.loanRate + opening.overdraft * model.overdraftRate + Math.max(0, opening.overdraft - prev.overdraftLimit) * model.penaltyRate;
  const pbt = pbit - interest;
  const tax = Math.max(0, pbt) * model.taxRate;
  const profit = pbt - tax;
  const dividends = cond.dividends;
  s.retainedEarnings += profit - dividends;

  // Working capital from its days; export customers pay more slowly.
  const debtors = (homeRevenue * model.debtorDays + exportRevenue * model.intlDebtorDays) / 365;
  const stock = (costOfSales * model.stockDays) / 365;
  const creditors = (costOfSales * model.creditorDays) / 365;
  const operating = profit + depreciation - (debtors - opening.debtors) - (stock - opening.stock) + (creditors - opening.creditors);
  const investing = -(levers.capacity + upkeep);
  const financing = -dividends;
  const net = operating + investing + financing;
  s.netCash = opening.netCash + net;
  s.debtors = debtors;
  s.stock = stock;
  s.creditors = creditors;

  /* 8. The end of the year */
  const skillNow = s.skill;
  const overtimeShare = s.headcount > 0 ? (overtimeHours / (s.headcount * model.hoursPerWorker)) * 100 : 0;
  const overtimeStrain = -model.overtimeStrain * overtimeShare;
  s.morale = clamp(moraleStart + overtimeStrain, 0, 100);
  s.brand = brand;
  s.brandCarry = build / 2;
  s.quality = quality;
  s.skill = Math.max(0.5, s.skill - model.skillLoss * Math.max(0, turnover - model.turnoverBase));

  /* The position at the end of the year */
  const nonCurrentAssets = s.assets.reduce((a, x) => a + x.nbv, 0);
  const cash = Math.max(0, s.netCash);
  const overdraft = Math.max(0, -s.netCash);
  if (overdraft > s.overdraftLimit + 1e-6) s.breached = true;
  const currentAssets = cash + debtors + stock;
  const currentLiabilities = creditors + overdraft;
  const equity = s.shareCapital + s.retainedEarnings;
  const capitalEmployed = s.loans + equity;

  const kpis: Kpis = {
    revenue,
    homeRevenue,
    exportRevenue,
    exportShare: revenue > 0 ? (exportRevenue / revenue) * 100 : 0,
    price: s.price,
    relativePrice: (s.price / s.competitorPrice) * 100,
    competitorPrice: s.competitorPrice,
    marketSize: s.marketSize,
    demand,
    homeDemand: home.demand,
    exportDemand: exportD,
    volume,
    homeVolume,
    exportVolume,
    lostSales: lost,
    lostShare: demand > 0 ? (lost / demand) * 100 : 0,
    marketShare: s.marketSize > 0 ? (homeVolume / s.marketSize) * 100 : 0,
    brand,
    quality,
    returnsRate,
    plantCapacity: s.plantCapacity,
    normalCapacity,
    capacity,
    utilization: capacity > 0 ? (volume / capacity) * 100 : 0,
    load,
    overtimeHours,
    overtimeShare,
    productivity: s.headcount > 0 ? volume / s.headcount : 0,
    skill: skillNow,
    headcount: s.headcount,
    morale: s.morale,
    // Measured as the guide measures it: leavers ÷ average staff × 100 (every leaver is replaced, so the average is the headcount).
    turnover: s.headcount > 0 ? (leavers / s.headcount) * 100 : 0,
    leavers,
    materialPerPiece: s.materialCost,
    costPerPiece: volume > 0 ? costOfSales / volume : 0,
    costOfSales,
    grossProfit,
    gpm: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
    overheads: s.overheads,
    marketing: levers.marketing,
    depreciation,
    expenses,
    pbit,
    profitMargin: revenue > 0 ? (pbit / revenue) * 100 : 0,
    interest,
    tax,
    profit,
    cash,
    overdraft,
    netCash: s.netCash,
    headroom: s.overdraftLimit - overdraft,
    debt: s.loans,
    equity,
    capitalEmployed,
    roce: capitalEmployed > 0 ? (pbit / capitalEmployed) * 100 : 0,
    currentRatio: currentLiabilities > 0 ? currentAssets / currentLiabilities : 99,
    acidTest: currentLiabilities > 0 ? (currentAssets - stock) / currentLiabilities : 99,
    gearing: capitalEmployed > 0 ? (s.loans / capitalEmployed) * 100 : 0,
    debtorDays: revenue > 0 ? (debtors / revenue) * 365 : 0,
    creditorDays: costOfSales > 0 ? (creditors / costOfSales) * 365 : 0,
    stockDays: costOfSales > 0 ? (stock / costOfSales) * 365 : 0,
    spend: levers.marketing + levers.capacity + levers.people + levers.international,
    capex: levers.capacity,
    fx: cond.fx,
  };

  const result: YearResult = {
    index: i,
    label,
    levers: { ...levers },
    conditions: { ...cond },
    kpis,
    pl: {
      revenue,
      homeRevenue,
      exportRevenue,
      materials,
      other,
      freight,
      returns,
      damage,
      costOfSales,
      grossProfit,
      wages,
      overtime: overtimePay,
      recruitment,
      overheads: s.overheads,
      restructuring,
      marketing: levers.marketing,
      people: levers.people,
      international: levers.international,
      depreciation,
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
      debtors: -(debtors - opening.debtors),
      stock: -(stock - opening.stock),
      creditors: creditors - opening.creditors,
      operating,
      capex: -levers.capacity,
      upkeep: -upkeep,
      investing,
      dividends: -dividends,
      financing,
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
      loans: s.loans,
      netAssets: nonCurrentAssets + currentAssets - currentLiabilities - s.loans,
      shareCapital: s.shareCapital,
      retainedEarnings: s.retainedEarnings,
      equity,
    },
    brandParts: { open: prev.brand, carry: prev.brandCarry, now: build / 2, decay: -decay, reviews, end: brand },
    demandParts: { market: home.market, price: home.price, brand: home.brand },
    moraleParts: { open: prev.morale, recovery, news: cond.morale, people: peopleBoost, cut: cutShock, start: moraleStart, overtime: overtimeStrain, end: s.morale },
    qualityParts: { ...qParts, end: quality },
    ops: {
      plantCapacity: s.plantCapacity,
      labourNormal,
      labourMax,
      normalCapacity,
      capacity,
      binding,
      overtimeUnits,
      productivityFactor,
      newStarters: leavers,
      hoursPerPiece: s.hoursPerPiece,
    },
    intl: { open: s.intlOpen, setupPaid: s.intlSetupPaid, development: s.intlDev, opensNextYear: !s.intlOpen && s.intlSetupPaid >= model.intlSetup - 1e-6, pricePerPiece: exportPrice },
    arrivals,
    breached: s.breached,
  };
  return { state: s, result };
}

/* ------------------------------------------------------------------ */
/* Identities the tests and the integrity check run                    */
/* ------------------------------------------------------------------ */

/** The accounting identities every year must satisfy; returns the ones that fail. */
export function identityErrors(r: YearResult, tolerance = 1e-6): string[] {
  const out: string[] = [];
  const near = (a: number, b: number, what: string) => {
    const scale = Math.max(1, Math.abs(a), Math.abs(b));
    if (Math.abs(a - b) > tolerance * scale) out.push(`${what}: ${a} against ${b}`);
  };
  const p = r.pl;
  const k = r.kpis;
  near(p.revenue, p.homeRevenue + p.exportRevenue, 'revenue = home revenue + export revenue');
  near(p.costOfSales, p.materials + p.other + p.freight + p.returns + p.damage, 'cost of sales = its parts');
  near(p.grossProfit, p.revenue - p.costOfSales, 'gross profit = revenue − cost of sales');
  near(p.expenses, p.wages + p.overtime + p.recruitment + p.overheads + p.restructuring + p.marketing + p.people + p.international + p.depreciation, 'expenses = their parts');
  near(p.pbit, p.grossProfit - p.expenses, 'profit before interest and tax = gross profit − expenses');
  near(p.pbt, p.pbit - p.interest, 'profit before tax = PBIT − interest');
  near(p.profit, p.pbt - p.tax, 'profit for the year = profit before tax − tax');
  near(r.cash.operating, p.profit + p.depreciation + r.cash.debtors + r.cash.stock + r.cash.creditors, 'operating cash flow reconciles to profit');
  near(r.cash.investing, r.cash.capex + r.cash.upkeep, 'investing = capacity investment + upkeep');
  near(r.cash.financing, r.cash.dividends, 'financing = dividends (no loans are raised or repaid)');
  near(r.cash.close, r.cash.open + r.cash.operating + r.cash.investing + r.cash.financing, 'closing cash = opening cash + operating + investing + financing');
  near(r.position.netAssets, r.position.equity, 'net assets = equity');
  near(r.position.cash - r.position.overdraft, r.cash.close, 'the bank balance in the position matches the cash flow');
  near(k.volume, k.homeVolume + k.exportVolume, 'volume = home + export');
  near(k.demand, k.volume + k.lostSales, 'demand = volume + lost sales');
  if (k.volume > k.capacity * (1 + 1e-9) + 1e-6) out.push(`volume ${k.volume} exceeds capacity ${k.capacity}`);
  if (k.utilization < -1e-9 || k.utilization > 100 + 1e-6) out.push(`utilization ${k.utilization} is outside 0 to 100`);
  for (const [id, v] of Object.entries(k)) if (!Number.isFinite(v)) out.push(`${id} is not a finite number`);
  return out;
}
