/**
 * The capacity utilization and productivity calculator (5.6, HL), for the
 * reader's own figures and for two periods side by side. Pure functions,
 * shared by the page, its script and the tests.
 *
 * Two formulas are the guide's (p. 65): capacity utilization rate = actual
 * output ÷ productive capacity × 100, and productivity rate = total output ÷
 * total input × 100. The guide gives no formula for the defect rate, labour
 * productivity, capital productivity or operating leverage, so the standard
 * forms used in the notes on production planning are used and labelled.
 *
 * Conventions, stated on the page: every unit produced uses capacity, so
 * capacity utilization counts units produced; productivity counts good output,
 * which is what customers pay for (defective units that are reworked and sold
 * count as good; scrapped ones do not).
 */
import type { Working } from './finance';
import { fmtMoney, fmtNumber } from './format';
import { utilizationBand } from './operations';

export interface PeriodInputs {
  /** Productive capacity, in units a period. */
  capacity: number;
  /** Units produced in the period, before inspection. */
  made: number;
  /** Units that failed the quality standard at inspection. */
  defects: number;
  /** Workers, or labour hours (see `labour` in the settings). */
  labour: number;
  /** Capital input, such as machine hours. */
  capital: number;
  /** Selling price of one good unit. */
  price: number;
  /** Total costs of the period, fixed and variable: the total input, valued at cost. */
  inputCost: number;
  /** Fixed costs of the period. */
  fixedCosts: number;
}

export interface ProductionSettings {
  /** What happens to defective units: reworked and sold, or scrapped. */
  defects: 'reworked' | 'scrapped';
  /** How labour input is measured. */
  labour: 'workers' | 'hours';
}

export interface ProductionModel {
  inputs: PeriodInputs;
  goodOutput: number;
  /** Per cent of productive capacity used. */
  utilization: number | null;
  spare: number;
  defectRate: number | null;
  labourProductivity: number | null;
  capitalProductivity: number | null;
  outputValue: number;
  productivityRate: number | null;
  fixedCostPerUnit: number | null;
  variableCosts: number;
  contribution: number;
  operatingProfit: number;
  /** Degree of operating leverage: total contribution ÷ operating profit; null at or below break-even. */
  operatingLeverage: number | null;
}

const per = (a: number, b: number) => (b > 0 ? a / b : null);

export function productionModel(i: PeriodInputs, s: ProductionSettings): ProductionModel {
  const goodOutput = s.defects === 'reworked' ? i.made : Math.max(0, i.made - i.defects);
  const outputValue = goodOutput * i.price;
  const variableCosts = i.inputCost - i.fixedCosts;
  const contribution = outputValue - variableCosts;
  const operatingProfit = outputValue - i.inputCost;
  const u = per(i.made, i.capacity);
  const d = per(i.defects, i.made);
  const p = per(outputValue, i.inputCost);
  return {
    inputs: i,
    goodOutput,
    utilization: u === null ? null : u * 100,
    spare: Math.max(0, i.capacity - i.made),
    defectRate: d === null ? null : d * 100,
    labourProductivity: per(goodOutput, i.labour),
    capitalProductivity: per(goodOutput, i.capital),
    outputValue,
    productivityRate: p === null ? null : p * 100,
    fixedCostPerUnit: per(i.fixedCosts, goodOutput),
    variableCosts,
    contribution,
    operatingProfit,
    operatingLeverage: operatingProfit > 0 ? contribution / operatingProfit : null,
  };
}

export const PERIOD_KEYS: Array<keyof PeriodInputs> = ['capacity', 'made', 'defects', 'labour', 'capital', 'price', 'inputCost', 'fixedCosts'];

export interface FieldProblem {
  field: keyof PeriodInputs;
  message: string;
}

/** Problems with one period's inputs, by field. */
export function validatePeriod(raw: Record<keyof PeriodInputs, number | null>): FieldProblem[] {
  const out: FieldProblem[] = [];
  for (const k of PERIOD_KEYS) {
    const v = raw[k];
    if (v === null || !Number.isFinite(v)) out.push({ field: k, message: 'Enter a number.' });
    else if (v < 0) out.push({ field: k, message: 'Cannot be negative.' });
  }
  if (out.length) return out;
  const r = raw as PeriodInputs;
  if (r.capacity <= 0) out.push({ field: 'capacity', message: 'Capacity must be more than zero.' });
  if (r.made > r.capacity) out.push({ field: 'made', message: 'Units produced cannot be more than productive capacity. Raise capacity, or lower output.' });
  if (r.defects > r.made) out.push({ field: 'defects', message: 'More units cannot fail inspection than were produced.' });
  if (r.inputCost <= 0) out.push({ field: 'inputCost', message: 'Total costs must be more than zero.' });
  if (r.fixedCosts > r.inputCost) out.push({ field: 'fixedCosts', message: 'Fixed costs are part of total costs, so they cannot be larger.' });
  return out;
}

/** The change from one period to the next: percentage points for rates, units for the rest. */
export function change(a: number | null, b: number | null): number | null {
  return a === null || b === null ? null : b - a;
}

/* ---------- Words ---------- */

export interface Units {
  one: string;
  many: string;
  period: string;
}

const dp = (v: number, d = 2) => fmtNumber(v, Number.isInteger(v) ? 0 : d);
const pct = (v: number | null, d = 1) => (v === null ? 'n/a' : `${fmtNumber(v, d)}%`);

/** What a capacity utilization rate means, from the platform's rule of thumb (operations.ts). */
export function readUtilization(m: ProductionModel, u: Units): { reading: string; implication: string } {
  if (m.utilization === null) return { reading: 'Enter a capacity above zero.', implication: '' };
  const band = utilizationBand(m.utilization);
  const reading = `${pct(m.utilization)} of capacity is used: ${dp(m.inputs.made)} of ${dp(m.inputs.capacity)} ${u.many}, leaving ${dp(m.spare)} ${m.spare === 1 ? u.one : u.many} of spare capacity.`;
  const implication = {
    low: 'Much of the capacity stands idle, so the fixed costs are spread over few units and each one carries a lot of them. Winning more orders, or selling the spare capacity, would cut the cost of each unit; cutting capacity would save cost but limit growth.',
    comfortable: 'There is room for more orders without strain, and the fixed costs are spread over a reasonable output.',
    busy: 'The fixed costs are spread thinly, which is efficient, but there is little room for a rush order, a breakdown or maintenance.',
    full: 'The business is at or near full capacity. An extra order would displace regular work or need more capacity, and a breakdown would stop production.',
  }[band];
  return { reading, implication };
}

/** A sentence comparing the two periods, naming the measures that moved most. */
export function readComparison(a: ProductionModel, b: ProductionModel, names: { a: string; b: string }, u: Units, currency: string): string {
  const parts: string[] = [];
  const du = change(a.utilization, b.utilization);
  if (du !== null && Math.abs(du) > 0.05) parts.push(`capacity utilization ${du > 0 ? 'rose' : 'fell'} by ${fmtNumber(Math.abs(du), 1)} percentage points`);
  if (a.fixedCostPerUnit !== null && b.fixedCostPerUnit !== null && Math.abs(b.fixedCostPerUnit - a.fixedCostPerUnit) > 0.005) {
    parts.push(`the fixed cost carried by each ${u.one} ${b.fixedCostPerUnit > a.fixedCostPerUnit ? 'rose' : 'fell'} from ${fmtMoney(a.fixedCostPerUnit, currency, 2)} to ${fmtMoney(b.fixedCostPerUnit, currency, 2)}`);
  }
  const dr = change(a.productivityRate, b.productivityRate);
  if (dr !== null && Math.abs(dr) > 0.05) parts.push(`the productivity rate ${dr > 0 ? 'rose' : 'fell'} by ${fmtNumber(Math.abs(dr), 1)} points`);
  const dd = change(a.defectRate, b.defectRate);
  if (dd !== null && Math.abs(dd) > 0.005) parts.push(`the defect rate ${dd > 0 ? 'rose' : 'fell'} by ${fmtNumber(Math.abs(dd), 2)} points`);
  if (!parts.length) return `The two periods are almost the same on every measure.`;
  const lev = a.operatingLeverage !== null && b.operatingLeverage !== null ? ` Operating leverage moved from ${fmtNumber(a.operatingLeverage, 1)} to ${fmtNumber(b.operatingLeverage, 1)}: the closer output is to break-even, the more sharply profit responds to a change in sales.` : '';
  return `From ${names.a} to ${names.b}, ${parts.join(', ')}.${lev}`;
}

/* ---------- Workings ---------- */

export type MeasureKey = 'utilization' | 'defect' | 'labour' | 'capital' | 'productivity' | 'fixed' | 'leverage';

export const MEASURES: Array<{ key: MeasureKey; name: string; guide: boolean }> = [
  { key: 'utilization', name: 'Capacity utilization rate', guide: true },
  { key: 'defect', name: 'Defect rate', guide: false },
  { key: 'labour', name: 'Labour productivity', guide: false },
  { key: 'capital', name: 'Capital productivity', guide: false },
  { key: 'productivity', name: 'Productivity rate', guide: true },
  { key: 'fixed', name: 'Fixed cost per unit', guide: false },
  { key: 'leverage', name: 'Degree of operating leverage', guide: false },
];

/** The value of each measure, for tables and comparison. */
export function measureValue(m: ProductionModel, k: MeasureKey): number | null {
  return { utilization: m.utilization, defect: m.defectRate, labour: m.labourProductivity, capital: m.capitalProductivity, productivity: m.productivityRate, fixed: m.fixedCostPerUnit, leverage: m.operatingLeverage }[k];
}

/** A measure formatted with its unit. */
export function measureText(m: ProductionModel, k: MeasureKey, u: Units, currency: string, s: ProductionSettings, capitalLabel: string): string {
  const v = measureValue(m, k);
  if (v === null) return k === 'leverage' ? 'not meaningful' : 'n/a';
  switch (k) {
    case 'utilization':
      return pct(v, 1);
    case 'defect':
      return pct(v, 2);
    case 'productivity':
      return pct(v, 1);
    case 'labour':
      return `${fmtNumber(v, 2)} ${u.many} ${s.labour === 'workers' ? 'per worker' : 'per labour hour'}`;
    case 'capital':
      return `${fmtNumber(v, 2)} ${u.many} per ${capitalLabel.replace(/s$/, '')}`;
    case 'fixed':
      return fmtMoney(v, currency, 2);
    case 'leverage':
      return fmtNumber(v, 2);
  }
}

export function productionWorkings(m: ProductionModel, u: Units, currency: string, s: ProductionSettings, capitalLabel: string): Record<MeasureKey, Working> {
  const i = m.inputs;
  const money = (v: number) => fmtMoney(v, currency, Number.isInteger(v) ? 0 : 2);
  const good = `${dp(m.goodOutput)} good ${u.many}${s.defects === 'scrapped' && i.defects > 0 ? ` (${dp(i.made)} produced − ${dp(i.defects)} scrapped)` : ''}`;
  const labourUnit = s.labour === 'workers' ? 'workers' : 'labour hours';
  const div = (a: number, b: number, d = 4) => fmtNumber(a / b, d);
  const capUnit = capitalLabel.replace(/s$/, '');
  return {
    utilization: {
      given: [
        { label: `Actual output: ${u.many} produced this ${u.period}`, value: dp(i.made) },
        { label: 'Productive capacity', value: `${dp(i.capacity)} ${u.many}` },
      ],
      formula: 'Capacity utilization rate = actual output ÷ productive capacity × 100',
      substitution: `= ${dp(i.made)} ÷ ${dp(i.capacity)} × 100`,
      steps: m.utilization === null ? ['Capacity is zero, so the rate cannot be calculated.'] : [`${dp(i.made)} ÷ ${dp(i.capacity)} = ${div(i.made, i.capacity)}`, `${div(i.made, i.capacity)} × 100 = ${pct(m.utilization, 2)}`],
      answer: pct(m.utilization, 1),
      value: m.utilization,
      unit: 'per cent of productive capacity',
      note: 'The guide gives this formula (p. 65).',
    },
    defect: {
      given: [
        { label: `${u.many} that failed inspection`, value: dp(i.defects) },
        { label: `${u.many} produced`, value: dp(i.made) },
      ],
      formula: 'Defect rate = units that fail to meet the quality standard ÷ units produced × 100',
      substitution: `= ${dp(i.defects)} ÷ ${dp(i.made)} × 100`,
      steps: m.defectRate === null ? ['Nothing was produced, so the rate cannot be calculated.'] : [`${dp(i.defects)} ÷ ${dp(i.made)} = ${div(i.defects, i.made)}`, `${div(i.defects, i.made)} × 100 = ${pct(m.defectRate, 2)}`],
      answer: pct(m.defectRate, 2),
      value: m.defectRate,
      unit: `per cent of the ${u.many} produced`,
      note: "The standard form; the guide's list of formulas does not give one.",
    },
    labour: {
      given: [
        { label: 'Good output', value: good },
        { label: `Labour input, in ${labourUnit}`, value: dp(i.labour) },
      ],
      formula: `Labour productivity = good output ÷ ${s.labour === 'workers' ? 'number of workers' : 'labour hours'}`,
      substitution: `= ${dp(m.goodOutput)} ÷ ${dp(i.labour)}`,
      steps: m.labourProductivity === null ? ['No labour input is entered, so it cannot be calculated.'] : [`${dp(m.goodOutput)} ÷ ${dp(i.labour)} = ${fmtNumber(m.labourProductivity, 3)}`],
      answer: m.labourProductivity === null ? 'n/a' : `${dp(m.labourProductivity)} ${u.many}`,
      value: m.labourProductivity,
      unit: `good ${u.many} ${s.labour === 'workers' ? 'per worker' : 'per labour hour'} this ${u.period}`,
      note: "The standard form; the guide's list of formulas does not give one.",
    },
    capital: {
      given: [
        { label: 'Good output', value: good },
        { label: `Capital input, in ${capitalLabel}`, value: dp(i.capital) },
      ],
      formula: `Capital productivity = good output ÷ capital input (${capitalLabel})`,
      substitution: `= ${dp(m.goodOutput)} ÷ ${dp(i.capital)}`,
      steps: m.capitalProductivity === null ? ['No capital input is entered, so it cannot be calculated.'] : [`${dp(m.goodOutput)} ÷ ${dp(i.capital)} = ${fmtNumber(m.capitalProductivity, 3)}`],
      answer: m.capitalProductivity === null ? 'n/a' : `${dp(m.capitalProductivity)} ${u.many}`,
      value: m.capitalProductivity,
      unit: `good ${u.many} per ${capUnit}`,
      note: "The standard form; the guide's list of formulas does not give one.",
    },
    productivity: {
      given: [
        { label: 'Total output: good output × selling price', value: `${dp(m.goodOutput)} × ${money(i.price)} = ${money(m.outputValue)}` },
        { label: 'Total input: all the costs of the period', value: money(i.inputCost) },
      ],
      formula: 'Productivity rate = total output ÷ total input × 100',
      substitution: `= ${money(m.outputValue)} ÷ ${money(i.inputCost)} × 100`,
      steps: m.productivityRate === null ? ['Total input is zero, so the rate cannot be calculated.'] : [`${dp(m.outputValue)} ÷ ${dp(i.inputCost)} = ${div(m.outputValue, i.inputCost)}`, `${div(m.outputValue, i.inputCost)} × 100 = ${pct(m.productivityRate, 2)}`],
      answer: pct(m.productivityRate, 1),
      value: m.productivityRate,
      unit: 'per cent: output value for each 100 of input value',
      note: 'The guide gives this formula (p. 65) without saying how to measure output and input. Both are valued in the same currency here, output at its selling price and input at its cost, so that the result is a percentage.',
    },
    fixed: {
      given: [
        { label: 'Fixed costs this period', value: money(i.fixedCosts) },
        { label: 'Good output', value: good },
      ],
      formula: `Fixed cost per ${u.one} = fixed costs ÷ good output`,
      substitution: `= ${money(i.fixedCosts)} ÷ ${dp(m.goodOutput)}`,
      steps: m.fixedCostPerUnit === null ? ['There is no good output, so it cannot be calculated.'] : [`${dp(i.fixedCosts)} ÷ ${dp(m.goodOutput)} = ${fmtNumber(m.fixedCostPerUnit, 4)}`],
      answer: m.fixedCostPerUnit === null ? 'n/a' : fmtMoney(m.fixedCostPerUnit, currency, 2),
      value: m.fixedCostPerUnit,
      unit: `${currency} of fixed costs carried by each ${u.one}`,
      note: 'Shows why capacity utilization matters: the same fixed costs are shared by more units when more capacity is used.',
    },
    leverage: {
      given: [
        { label: 'Total contribution: total output − variable costs', value: `${money(m.outputValue)} − ${money(m.variableCosts)} = ${money(m.contribution)}` },
        { label: 'Operating profit: total contribution − fixed costs', value: `${money(m.contribution)} − ${money(i.fixedCosts)} = ${money(m.operatingProfit)}` },
      ],
      formula: 'Degree of operating leverage = total contribution ÷ operating profit',
      substitution: `= ${money(m.contribution)} ÷ ${money(m.operatingProfit)}`,
      steps: m.operatingLeverage === null ? ['Operating profit is zero or negative: the business is at or below break-even, where the measure is not meaningful.'] : [`${dp(m.contribution)} ÷ ${dp(m.operatingProfit)} = ${fmtNumber(m.operatingLeverage, 4)}`],
      answer: m.operatingLeverage === null ? 'not meaningful' : fmtNumber(m.operatingLeverage, 2),
      value: m.operatingLeverage,
      unit: 'times: the percentage change in operating profit for each 1% change in sales',
      note: 'The guide names operating leverage but gives no formula. This is the degree of operating leverage, as in the notes on production planning; variable costs are total costs less fixed costs.',
    },
  };
}

/** Interpretation and implication for each working. */
export function productionNotes(m: ProductionModel, u: Units, currency: string): Record<MeasureKey, { interpretation: string; implication: string }> {
  const util = readUtilization(m, u);
  return {
    utilization: { interpretation: util.reading, implication: util.implication },
    defect: {
      interpretation: m.defectRate === null ? 'Not available.' : `${fmtNumber(m.defectRate, 2)}% of the ${u.many} produced failed inspection.`,
      implication: 'Each defect costs twice: the rework or scrap, and any defect that reaches a customer. Preventing defects usually costs less than finding them.',
    },
    labour: {
      interpretation: m.labourProductivity === null ? 'Not available.' : `Each unit of labour input produced ${fmtNumber(m.labourProductivity, 2)} good ${u.many}.`,
      implication: 'Compare it across periods or with a rival: on its own the figure says little, and long hours can hold output up even when each hour produces less.',
    },
    capital: {
      interpretation: m.capitalProductivity === null ? 'Not available.' : `The machines produced ${fmtNumber(m.capitalProductivity, 2)} good ${u.many} for each unit of capital input.`,
      implication: 'Idle or slow machines lower it; maintenance, better scheduling and fewer defects raise it without new investment.',
    },
    productivity: {
      interpretation: m.productivityRate === null ? 'Not available.' : `Every ${fmtMoney(100, currency, 0)} of inputs produced ${fmtMoney(m.productivityRate, currency, 2)} of output, valued at selling prices.`,
      implication: m.productivityRate !== null && m.productivityRate < 100 ? 'Output is worth less than the inputs used to produce it: the business is making a loss on this period.' : 'The rate rises when the same fixed inputs, such as the factory and the line, are spread over more good output.',
    },
    fixed: {
      interpretation: m.fixedCostPerUnit === null ? 'Not available.' : `Each good ${u.one} carries ${fmtMoney(m.fixedCostPerUnit, currency, 2)} of the period's fixed costs.`,
      implication: 'More output, from the same capacity, lowers this figure: the main reason a business wants high capacity utilization.',
    },
    leverage: {
      interpretation: m.operatingLeverage === null ? 'The business is at or below break-even, so the degree of operating leverage is not meaningful.' : `A 1% change in sales would change operating profit by about ${fmtNumber(m.operatingLeverage, 1)}%.`,
      implication: 'High operating leverage magnifies profit when sales rise and losses when they fall, so it suits stable demand better than unstable demand.',
    },
  };
}

/* ---------- Fixed cost per unit at every level of output ---------- */

/** Points of the fixed cost per unit curve, from a tenth of capacity to full capacity. */
export function fixedCostCurve(fixedCosts: number, capacity: number, steps = 18): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  if (!(capacity > 0) || !(fixedCosts >= 0)) return out;
  for (let k = 0; k <= steps; k += 1) {
    // From a tenth of capacity to all of it, computed so that the end points are exact.
    const q = (capacity * (steps + 9 * k)) / (10 * steps);
    out.push([q, fixedCosts / q]);
  }
  return out;
}
