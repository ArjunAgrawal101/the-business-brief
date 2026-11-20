/**
 * More Paper 2 calculation practice: every formula on the guide's formulae
 * sheet (pp. 64 to 66) and every quantitative statement in the syllabus that
 * the first set did not cover. Final accounts and depreciation (3.4), budget
 * variances (3.9), market share, growth and elasticity (4.1, 4.5), labour
 * turnover (2.4), production planning (5.6: capacity utilization and the
 * productivity rate from the formulae sheet, then the defect rate, labour and
 * capital productivity, operating leverage, cost to make against cost to buy,
 * and the stock control figures), the effect of a change on break-even (5.5),
 * and the toolkit's calculations (expected values, descriptive statistics,
 * and at HL contribution and absorption costing, float on a critical path and
 * a forecast from a line of best fit).
 *
 * Each kind works its answer with the platform's tested functions where one
 * exists (finance.ts, budget.ts, market.ts, operations.ts, decision-tree.ts,
 * plan.ts), so the answer agrees with the Finance Desk and the Operations
 * Floor. Formulas the formulae sheet does not list are the standard forms the
 * platform's notes use, and each question says so (FORMULA_SOURCES in
 * src/lib/p2-practice.ts). Figures are drawn so that they make sense: output
 * never above capacity, probabilities that add up to one, stock that never
 * falls below zero. Every business is fictional.
 */
import { breakEvenExact, labourTurnover, operatingLeverage, specialOrderGain, type Working } from './finance';
import { variance } from './budget';
import { growthRate, marketShare } from './market';
import { reorderLevel } from './operations';
import { evaluateOption } from './decision-tree';
import { schedule, type Activity } from './plan';
import { derive } from './ratios';
import { fmtNumber, round } from './format';
import type { Rng } from './random';
import { lineChartSvg, type Series } from './p2-figures';
import {
  costScenario,
  drawAccounts,
  k,
  n0,
  n2,
  plural,
  tidySlips,
  usd,
  usd2,
  type KindDef,
  type Slip,
  type Table,
} from './p2-base';

/* ------------------------------------------------------------------ */
/* Invented businesses for the new kinds                               */
/* ------------------------------------------------------------------ */

interface Works {
  name: string;
  unit: string;
  units: string;
}

/** Manufacturers for production planning. None is a real organization. */
const WORKS: Works[] = [
  { name: 'Brackenfold Bakery', unit: 'loaf', units: 'loaves' },
  { name: 'Corriemoor Packaging', unit: 'carton', units: 'cartons' },
  { name: 'Greywater Pumps', unit: 'pump', units: 'pumps' },
  { name: 'Lowther Ceramics', unit: 'tile', units: 'tiles' },
  { name: 'Pennick Furniture', unit: 'table', units: 'tables' },
  { name: 'Ravensmoor Glass', unit: 'bottle', units: 'bottles' },
  { name: 'Selsby Textiles', unit: 'shirt', units: 'shirts' },
  { name: 'Tallowmere Candles', unit: 'candle', units: 'candles' },
];

/** Service and retail businesses for the other kinds. None is a real organization. */
const FIRMS = ['Ambleway Cafés', 'Birchmont Opticians', 'Cresswell Gyms', 'Danbury Florists', 'Elmsworth Books', 'Farrowdale Garden Centre', 'Kilnsey Vets', 'Marrowby Hotels', 'Oxlade Travel', 'Quenby Pharmacy'];

/** Markets with their sellers, for market share and growth. */
const MARKETS: Array<{ market: string; sellers: string[]; unit: 'value' | 'volume'; what: string }> = [
  { market: 'electric bicycles in Larchfield', sellers: ['Voltwheel', 'Pedalon', 'Cogsworth Cycles', 'Brightspoke'], unit: 'volume', what: 'bicycles sold' },
  { market: 'oat milk in Rennet County', sellers: ['Oatlands', 'Meadowpour', 'Grainly', 'Silkoat'], unit: 'value', what: 'sales revenue ($000)' },
  { market: 'gym memberships in Harwick', sellers: ['Cresswell Gyms', 'Ironvale', 'Pulse Studio', 'Stridewell'], unit: 'volume', what: 'memberships sold' },
  { market: 'garden furniture in Ashby Vale', sellers: ['Pennick Furniture', 'Oakhollow', 'Terrace & Co', 'Fernbench'], unit: 'value', what: 'sales revenue ($000)' },
];

const pct = (v: number) => `${fmtNumber(v, 2)}%`;
/** The first letter in capitals: "loaves" as a row label, "Loaves". */
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
/** The possessive: "Kilnsey Vets'", "Ravensmoor Glass's". */
const poss = (name: string) => (/[^s]s$/.test(name) ? `${name}'` : `${name}'s`);
const g = (label: string, value: string) => ({ label, value });
/** A list of figures as a two-column table. */
const list = (caption: string, rows: Array<[string, string]>): Table => ({ caption, columns: [], rows: rows.map(([label, v]) => ({ label, cells: [v] })) });

/* ------------------------------------------------------------------ */
/* Break-even: the effect of a change (5.5)                            */
/* ------------------------------------------------------------------ */

const breakEvenChange: KindDef = {
  code: 'BCH',
  name: 'Break-even after a change in price or cost',
  group: 'break-even',
  level: 'SL/HL',
  marks: 3,
  make: (r) => {
    for (let tries = 0; tries < 300; tries++) {
      const s = costScenario(r);
      const what = r.pick(['price', 'variable', 'fixed'] as const);
      const dir = r.chance(0.5) ? 1 : -1;
      let P2 = s.P;
      let V2 = s.V;
      let F2 = s.F;
      const vStep = s.P < 20 ? 0.05 : 1;
      if (what === 'price') P2 = round(s.P + dir * r.int(1, 4) * s.m.price[2], 2);
      if (what === 'variable') V2 = round(s.V + dir * Math.max(vStep, round(Math.round((s.V * r.step(0.05, 0.2, 0.05)) / vStep) * vStep, 2)), 2);
      if (what === 'fixed') {
        const unit = s.F >= 100000 ? 1000 : 100;
        F2 = s.F + dir * Math.max(unit, Math.round((s.F * r.step(0.1, 0.3, 0.05)) / unit) * unit);
      }
      const c2 = round(P2 - V2, 2);
      if (!(P2 > 0 && V2 > 0 && F2 > 0 && c2 > 0)) continue;
      const exact1 = breakEvenExact(s.F, s.P, s.V) as number;
      const exact2 = breakEvenExact(F2, P2, V2) as number;
      const beq1 = Math.ceil(round(exact1, 9));
      const beq2 = Math.ceil(round(exact2, 9));
      if (beq1 === beq2 || beq2 > s.Q * 1.6 || Math.abs(exact2 - Math.round(exact2)) < 0.01) continue;
      const change =
        what === 'price'
          ? `The owners plan to ${dir > 0 ? 'raise' : 'cut'} the price from ${usd(s.P)} to ${usd(P2)}.`
          : what === 'variable'
            ? `A supplier has ${dir > 0 ? 'raised' : 'cut'} its prices, so the variable cost of each ${s.m.unit} will ${dir > 0 ? 'rise' : 'fall'} from ${usd(s.V)} to ${usd(V2)}.`
            : `Rent and salaries will ${dir > 0 ? 'rise' : 'fall'}, taking fixed costs from ${usd(s.F)} to ${usd(F2)} a year.`;
      const exact = beq2;
      const mos1 = s.Q - beq1;
      const mos2 = s.Q - beq2;
      const w: Working = {
        given: [g(`Selling price per ${s.m.unit}, after the change`, usd2(P2)), g(`Variable cost per ${s.m.unit}, after the change`, usd2(V2)), g('Fixed costs a year, after the change', usd(F2))],
        formula: 'Break-even quantity = fixed costs ÷ (selling price per unit − variable cost per unit), with the figures after the change',
        substitution: `= ${usd(F2)} ÷ (${usd2(P2)} − ${usd2(V2)})`,
        steps: [`New contribution per unit = ${n2(P2)} − ${n2(V2)} = ${n2(c2)}`, `${n0(F2)} ÷ ${n2(c2)} = ${n2(exact2)}`, `Rounded up: ${n0(beq2)}`],
        answer: `${n0(beq2)} ${plural(beq2, s.m.unit, s.m.units)}`,
        value: beq2,
        unit: `${s.m.units} a year`,
        note: `Before the change the break-even quantity was ${n0(beq1)} (${usd(s.F)} ÷ ${usd2(s.c)}, rounded up).`,
      };
      const slips: Slip[] = [
        { value: exact2, close: true, message: `That is the exact result, ${n2(exact2)}. Break-even is a whole number of ${s.m.units}, rounded up to ${n0(beq2)}.` },
        { value: Math.floor(exact2), message: 'Rounded down: one unit short of break-even still leaves a small loss. Round break-even up.' },
        { value: beq1, message: 'That is the break-even quantity before the change. Use the new figures: the change moves the break-even point.' },
        { value: Math.ceil(round(F2 / P2, 9)), message: 'The fixed costs were divided by the new selling price. Divide by the new contribution per unit: price minus variable cost.' },
        { value: F2 / P2, message: 'The fixed costs were divided by the new selling price. Divide by the new contribution per unit: price minus variable cost.' },
      ];
      return {
        business: s.m.name,
        intro: `${s.m.name} makes and sells ${s.m.units}. Each sells for ${usd(s.P)}, costs ${usd(s.V)} in variable costs, and fixed costs are ${usd(s.F)} a year. Forecast sales are ${n0(s.Q)} ${s.m.units}. ${change}`,
        tables: [
          {
            caption: `${s.m.name}: before and after the change (fictional, simulated figures)`,
            columns: ['', 'Now', 'After the change'],
            rows: [
              { label: `Selling price per ${s.m.unit}`, cells: [usd(s.P), usd(P2)] },
              { label: `Variable cost per ${s.m.unit}`, cells: [usd(s.V), usd(V2)] },
              { label: 'Fixed costs per year', cells: [usd(s.F), usd(F2)] },
              { label: 'Forecast sales next year', cells: [`${n0(s.Q)} ${s.m.units}`, `${n0(s.Q)} ${s.m.units}`] },
            ],
          },
        ],
        prompt: `Calculate the break-even quantity for ${s.m.name} after the change.`,
        unit: 'units',
        prefix: '',
        suffix: s.m.units,
        example: '1,250',
        exact,
        answer: `${n0(exact)} ${plural(exact, s.m.unit, s.m.units)}`,
        tolerance: 0,
        toleranceText: 'A whole number of units, rounded up.',
        working: w,
        meaning: `Break-even ${beq2 > beq1 ? 'rises' : 'falls'} from ${n0(beq1)} to ${n0(beq2)} ${s.m.units}, so at the forecast of ${n0(s.Q)} the margin of safety ${mos2 < mos1 ? 'shrinks' : 'grows'} from ${n0(mos1)} to ${n0(mos2)} ${s.m.units}${mos2 < 0 ? ': the forecast is now below break-even' : ''}.`,
        slips: tidySlips(slips, exact, 0),
      };
    }
    throw new Error('Could not draw a change in price or cost');
  },
};

/* ------------------------------------------------------------------ */
/* Final accounts (3.4) and depreciation (3.4, HL)                     */
/* ------------------------------------------------------------------ */

const retainedProfit: KindDef = {
  code: 'RTP',
  name: 'Retained profit',
  group: 'accounts',
  level: 'SL/HL',
  marks: 2,
  make: (r) => {
    const a = drawAccounts(r);
    const d = derive(a.s);
    const s = a.s;
    const exact = d.retainedProfit;
    const w: Working = {
      given: [g('Sales revenue ($000)', k(s.salesRevenue)), g('Cost of sales', k(s.costOfSales)), g('Expenses', k(s.expenses)), g('Interest', k(s.interest)), g('Tax', k(s.tax)), g('Dividends', k(s.dividends))],
      formula: 'Retained profit = profit for the period − dividends, working down the statement of profit or loss',
      substitution: `Gross profit = ${n0(s.salesRevenue)} − ${n0(s.costOfSales)}; then take away expenses, interest, tax and dividends in turn`,
      steps: [
        `Gross profit = ${n0(s.salesRevenue)} − ${n0(s.costOfSales)} = ${n0(d.grossProfit)}`,
        `Profit before interest and tax = ${n0(d.grossProfit)} − ${n0(s.expenses)} = ${n0(d.pbit)}`,
        `Profit before tax = ${n0(d.pbit)} − ${n0(s.interest)} = ${n0(d.profitBeforeTax)}`,
        `Profit for the period = ${n0(d.profitBeforeTax)} − ${n0(s.tax)} = ${n0(d.profitForPeriod)}`,
        `Retained profit = ${n0(d.profitForPeriod)} − ${n0(s.dividends)} = ${n0(exact)}`,
      ],
      answer: `${n0(exact)} ($000)`,
      value: exact,
      unit: 'thousands of dollars ($000)',
      note: 'The guide’s layout (figure 6, p. 59) shows each deduction in brackets with a subtotal at each stage.',
    };
    return {
      business: a.name,
      intro: `${a.name} is a private limited company. These are the figures for its statement of profit or loss for the year ended 31 December 2026, in thousands of dollars, before any subtotal is worked out.`,
      tables: [list(`${a.name}: items for the statement of profit or loss, 2026 ($000)`, [['Sales revenue', k(s.salesRevenue)], ['Cost of sales', k(s.costOfSales)], ['Expenses', k(s.expenses)], ['Interest', k(s.interest)], ['Tax', k(s.tax)], ['Dividends', k(s.dividends)]])],
      prompt: `Calculate the retained profit of ${a.name} for 2026, in $000.`,
      unit: 'money000',
      prefix: '$',
      suffix: '000',
      example: '245',
      exact,
      answer: `${n0(exact)} ($000)`,
      tolerance: 0.5,
      toleranceText: 'Accepted to the nearest $1,000, given in $000 like the accounts.',
      working: w,
      meaning: `${a.name} keeps ${usd(exact * 1000)} of the year's profit in the business after paying ${usd(s.dividends * 1000)} to its shareholders: an internal source of finance.`,
      slips: tidySlips(
        [
          { value: d.profitForPeriod, message: 'That is the profit for the period. Retained profit also takes away the dividends paid to shareholders.' },
          { value: d.profitBeforeTax - s.dividends, message: 'The tax was left out. Take away interest, then tax, then dividends.' },
          { value: d.pbit - s.tax - s.dividends, message: 'The interest was left out. Take away interest before tax.' },
          { value: d.profitForPeriod + s.dividends, message: 'The dividends were added. They are paid out of profit, so they are taken away.' },
          { value: d.grossProfit - s.dividends, message: 'Only the dividends were taken from gross profit. Expenses, interest and tax come off first.' },
          { value: exact * 1000, message: 'That is the answer in dollars. The question asks for it in $000, like the accounts.' },
        ],
        exact,
        0.5,
      ),
    };
  },
};

const netAssets: KindDef = {
  code: 'NAS',
  name: 'Net assets',
  group: 'accounts',
  level: 'SL/HL',
  marks: 2,
  make: (r) => {
    const a = drawAccounts(r);
    const d = derive(a.s);
    const s = a.s;
    const exact = d.netAssets;
    const rows: Array<[string, string]> = [
      ['Property, plant and equipment, at cost', k(s.propertyPlantEquipment)],
      ['Accumulated depreciation', k(s.accumulatedDepreciation)],
      ['Cash', k(s.cash)],
      ['Debtors', k(s.debtors)],
      ['Stock', k(s.stock)],
      ...(s.bankOverdraft ? ([['Bank overdraft', k(s.bankOverdraft)]] as Array<[string, string]>) : []),
      ['Trade creditors', k(s.tradeCreditors)],
      ...(s.otherShortTermLoans ? ([['Other short-term loans', k(s.otherShortTermLoans)]] as Array<[string, string]>) : []),
      ['Long-term borrowings', k(s.longTermBorrowings)],
    ];
    const w: Working = {
      given: rows.map(([l, v]) => g(l, v)),
      formula: 'Net assets = total assets − total liabilities, where non-current assets are shown after accumulated depreciation',
      substitution: `= (${n0(s.propertyPlantEquipment)} − ${n0(s.accumulatedDepreciation)} + ${n0(d.currentAssets)}) − (${n0(d.currentLiabilities)} + ${n0(d.nonCurrentLiabilities)})`,
      steps: [
        `Non-current assets = ${n0(s.propertyPlantEquipment)} − ${n0(s.accumulatedDepreciation)} = ${n0(d.nonCurrentAssets)}`,
        `Current assets = ${n0(s.cash)} + ${n0(s.debtors)} + ${n0(s.stock)} = ${n0(d.currentAssets)}`,
        `Total assets = ${n0(d.nonCurrentAssets)} + ${n0(d.currentAssets)} = ${n0(d.totalAssets)}`,
        `Total liabilities = ${n0(d.currentLiabilities)} + ${n0(d.nonCurrentLiabilities)} = ${n0(d.totalLiabilities)}`,
        `Net assets = ${n0(d.totalAssets)} − ${n0(d.totalLiabilities)} = ${n0(exact)}`,
      ],
      answer: `${n0(exact)} ($000)`,
      value: exact,
      unit: 'thousands of dollars ($000)',
      note: `Check: net assets equal total equity, ${n0(s.shareCapital)} + ${n0(s.retainedEarnings)} = ${n0(d.totalEquity)}.`,
    };
    return {
      business: a.name,
      intro: `${a.name} is a private limited company. These are items from its statement of financial position at 31 December 2026, in thousands of dollars.`,
      tables: [list(`${a.name}: items from the statement of financial position at 31 December 2026 ($000)`, rows)],
      prompt: `Calculate the net assets of ${a.name} at 31 December 2026, in $000.`,
      unit: 'money000',
      prefix: '$',
      suffix: '000',
      example: '1,240',
      exact,
      answer: `${n0(exact)} ($000)`,
      tolerance: 0.5,
      toleranceText: 'Accepted to the nearest $1,000, given in $000 like the accounts.',
      working: w,
      meaning: `What ${a.name} owns, less everything it owes, is worth ${usd(exact * 1000)} at book value: the owners' stake, equal to total equity.`,
      slips: tidySlips(
        [
          { value: d.netAssets + s.accumulatedDepreciation, message: 'The accumulated depreciation was not taken off property, plant and equipment. Non-current assets are shown at cost less accumulated depreciation.' },
          { value: d.totalAssets - d.currentLiabilities, message: 'The long-term borrowings were left out. Net assets take away all the liabilities, non-current as well as current.' },
          { value: d.currentAssets - d.currentLiabilities, message: 'That is working capital. Net assets include the non-current assets and the long-term borrowings too.' },
          { value: d.totalAssets, message: 'That is total assets. Take away total liabilities to find net assets.' },
          { value: exact * 1000, message: 'That is the answer in dollars. The question asks for it in $000, like the accounts.' },
        ],
        exact,
        0.5,
      ),
    };
  },
};

interface AssetDraw {
  firm: string;
  asset: { a: string; the: string };
  cost: number;
  residual: number;
  life: number;
}

const ASSETS: Array<{ a: string; the: string }> = [
  { a: 'a delivery van', the: 'the delivery van' },
  { a: 'a computer system', the: 'the computer system' },
  { a: 'an air-conditioning system', the: 'the air-conditioning system' },
  { a: 'a company car', the: 'the company car' },
  { a: 'a set of display units', the: 'the display units' },
  { a: 'a solar panel array', the: 'the solar panel array' },
];

function drawAsset(r: Rng): AssetDraw {
  for (let tries = 0; tries < 200; tries++) {
    const cost = r.step(12000, 240000, 1000);
    const life = r.int(3, 8);
    const residual = Math.round((cost * r.step(0.05, 0.25, 0.05)) / 500) * 500;
    if ((cost - residual) % life !== 0 && r.chance(0.6)) continue;
    if (residual <= 0 || residual >= cost) continue;
    return { firm: r.pick(FIRMS), asset: r.pick(ASSETS), cost, residual, life };
  }
  throw new Error('Could not draw an asset');
}

const straightLine: KindDef = {
  code: 'SLD',
  name: 'Depreciation by the straight line method',
  group: 'accounts',
  level: 'HL',
  marks: 2,
  make: (r) => {
    const a = drawAsset(r);
    const exact = round((a.cost - a.residual) / a.life, 2);
    return {
      business: a.firm,
      intro: `${a.firm} has bought ${a.asset.a} for ${usd(a.cost)}. It expects to use it for ${a.life} years and then sell it for ${usd(a.residual)}. It depreciates the asset by the straight line method.`,
      tables: [list(`${a.firm}: the asset (fictional, simulated figures)`, [['Cost', usd(a.cost)], ['Useful life', `${a.life} years`], ['Residual value', usd(a.residual)]])],
      prompt: `Calculate the annual depreciation charge for ${a.asset.the}.`,
      unit: 'money',
      prefix: '$',
      suffix: 'a year',
      example: '8,500',
      exact,
      answer: usd(exact),
      tolerance: 0.5,
      toleranceText: 'Accepted to the nearest dollar.',
      working: {
        given: [g('Cost', usd(a.cost)), g('Residual value', usd(a.residual)), g('Useful life', `${a.life} years`)],
        formula: 'Annual depreciation = (cost − residual value) ÷ useful life in years',
        substitution: `= (${usd(a.cost)} − ${usd(a.residual)}) ÷ ${a.life}`,
        steps: [`${n0(a.cost)} − ${n0(a.residual)} = ${n0(a.cost - a.residual)}`, `${n0(a.cost - a.residual)} ÷ ${a.life} = ${fmtNumber(exact, Number.isInteger(exact) ? 0 : 2)}`],
        answer: usd(exact),
        value: exact,
        unit: 'dollars a year',
        note: 'A standard form; the guide’s formulae sheet does not list depreciation.',
      },
      meaning: `Each year ${usd(exact)} of the cost is charged as an expense, so that after ${a.life} years the asset is carried at its residual value of ${usd(a.residual)}.`,
      slips: tidySlips(
        [
          { value: a.cost / a.life, message: 'The residual value was not taken away. Only the part of the cost the business will not get back is spread over the years.' },
          { value: (a.cost + a.residual) / a.life, message: 'The residual value was added. Take it away from the cost before dividing.' },
          { value: a.cost - a.residual, message: 'That is the total depreciation over the whole life. Divide it by the years of use for one year’s charge.' },
          { value: a.cost - exact, message: 'That is the net book value after one year. The question asks for the yearly charge.' },
        ],
        exact,
        0.5,
      ),
    };
  },
};

const netBookValue: KindDef = {
  code: 'NBV',
  name: 'Net book value after depreciation',
  group: 'accounts',
  level: 'HL',
  marks: 2,
  make: (r) => {
    const a = drawAsset(r);
    const years = r.int(2, Math.max(2, a.life - 1));
    const charge = (a.cost - a.residual) / a.life;
    const exact = round(a.cost - charge * years, 2);
    return {
      business: a.firm,
      intro: `${a.firm} bought ${a.asset.a} for ${usd(a.cost)}, expecting to use it for ${a.life} years and sell it for ${usd(a.residual)} at the end. It uses the straight line method.`,
      tables: [list(`${a.firm}: the asset (fictional, simulated figures)`, [['Cost', usd(a.cost)], ['Useful life', `${a.life} years`], ['Residual value', usd(a.residual)], ['Years owned so far', String(years)]])],
      prompt: `Calculate the net book value of ${a.asset.the} at the end of year ${years}.`,
      unit: 'money',
      prefix: '$',
      suffix: '',
      example: '64,000',
      exact,
      answer: usd(exact),
      tolerance: 0.5,
      toleranceText: 'Accepted to the nearest dollar.',
      working: {
        given: [g('Cost', usd(a.cost)), g('Residual value', usd(a.residual)), g('Useful life', `${a.life} years`), g('Years owned', String(years))],
        formula: 'Net book value = cost − accumulated depreciation; annual depreciation = (cost − residual value) ÷ useful life',
        substitution: `= ${usd(a.cost)} − ${years} × (${usd(a.cost)} − ${usd(a.residual)}) ÷ ${a.life}`,
        steps: [`Annual depreciation = ${n0(a.cost - a.residual)} ÷ ${a.life} = ${n2(charge)}`, `Accumulated depreciation = ${years} × ${n2(charge)} = ${n2(charge * years)}`, `${n0(a.cost)} − ${n2(charge * years)} = ${n2(exact)}`],
        answer: usd(exact),
        value: exact,
        unit: 'dollars',
        note: 'Standard forms; the guide’s formulae sheet does not list depreciation.',
      },
      meaning: `After ${years} years the asset is carried at ${usd(exact)} in the statement of financial position: ${usd(round(charge * years, 2))} of its cost has been charged as an expense.`,
      slips: tidySlips(
        [
          { value: a.cost - (a.cost / a.life) * years, message: 'The residual value was ignored when working out the yearly charge. Spread only cost minus residual value over the life.' },
          { value: charge * years, message: 'That is the accumulated depreciation. Net book value is the cost minus it.' },
          { value: a.cost - charge, message: 'Only one year’s depreciation was taken off. Take off one charge for each year owned.' },
          { value: a.cost - charge * years - a.residual, message: 'The residual value was taken off as well. It is already allowed for in the yearly charge.' },
        ],
        exact,
        0.5,
      ),
    };
  },
};

const unitsOfProduction: KindDef = {
  code: 'UPD',
  name: 'Depreciation by the units of production method',
  group: 'accounts',
  level: 'HL',
  marks: 2,
  make: (r) => {
    for (let tries = 0; tries < 200; tries++) {
      const w = r.pick(WORKS);
      const cost = r.step(20000, 300000, 1000);
      const residual = Math.round((cost * r.step(0.05, 0.2, 0.05)) / 500) * 500;
      const total = r.step(40000, 600000, 5000);
      const year = Math.round((total * r.step(0.12, 0.35, 0.01)) / 500) * 500;
      if (!(residual > 0 && residual < cost && year > 0 && year < total)) continue;
      const rate = (cost - residual) / total;
      const exact = round(rate * year, 2);
      return {
        business: w.name,
        intro: `${w.name} has bought a machine for ${usd(cost)}. Over its life it is expected to make ${n0(total)} ${w.units}, after which it will be sold for ${usd(residual)}. This year it made ${n0(year)} ${w.units}. The business depreciates the machine by the units of production method.`,
        tables: [list(`${w.name}: the machine (fictional, simulated figures)`, [['Cost', usd(cost)], ['Residual value', usd(residual)], [`Expected ${w.units} over its life`, n0(total)], [`${cap(w.units)} made this year`, n0(year)]])],
        prompt: `Calculate the depreciation charge on the machine for this year.`,
        unit: 'money',
        prefix: '$',
        suffix: '',
        example: '12,400',
        exact,
        answer: usd(exact),
        tolerance: 0.5,
        toleranceText: 'Accepted to the nearest dollar.',
        working: {
          given: [g('Cost', usd(cost)), g('Residual value', usd(residual)), g(`Expected ${w.units} over its life`, n0(total)), g(`${w.units} made this year`, n0(year))],
          formula: 'Depreciation for the year = (cost − residual value) ÷ expected total units × units made in the year',
          substitution: `= (${usd(cost)} − ${usd(residual)}) ÷ ${n0(total)} × ${n0(year)}`,
          steps: [`Depreciation per ${w.unit} = ${n0(cost - residual)} ÷ ${n0(total)} = ${fmtNumber(rate, 4)}`, `${fmtNumber(rate, 4)} × ${n0(year)} = ${n2(exact)}`],
          answer: usd(exact),
          value: exact,
          unit: 'dollars for the year',
          note: 'Standard forms; the guide’s formulae sheet does not list depreciation. Keep the rate unrounded until the last step.',
        },
        meaning: `The charge follows use: a busy year carries ${usd(exact)} of the machine's cost, and a quiet year would carry less.`,
        slips: tidySlips(
          [
            { value: (cost / total) * year, message: 'The residual value was not taken away before working out the rate per unit.' },
            { value: rate, message: `That is the depreciation for one ${w.unit}. Multiply by the ${w.units} made this year.` },
            { value: round(Math.round(rate * 100) / 100, 2) * year, close: true, message: 'The rate per unit was rounded before multiplying. Keep it unrounded until the end.' },
            { value: cost - residual, message: 'That is the depreciation over the whole life. This year carries only its share of the units.' },
          ],
          exact,
          0.5,
        ),
      };
    }
    throw new Error('Could not draw a machine');
  },
};

/* ------------------------------------------------------------------ */
/* Budgets and variances (3.9, HL)                                     */
/* ------------------------------------------------------------------ */

const LINES_REV = ['Room sales', 'Food and drink', 'Event hire', 'Spa treatments'];
const LINES_COST = ['Staff costs', 'Food and supplies', 'Energy', 'Marketing', 'Maintenance'];

const budgetVariance: KindDef = {
  code: 'VAR',
  name: 'Budget variance',
  group: 'budgets',
  level: 'HL',
  marks: 2,
  make: (r) => {
    for (let tries = 0; tries < 200; tries++) {
      const firm = r.pick(['Marrowby Hotels', 'Quenby Wellness', 'Oxlade Lodges', 'Kilnsey Resort']);
      const revs = LINES_REV.slice(0, r.int(2, 3)).map((label) => ({ label, kind: 'revenue' as const, budget: r.step(20000, 120000, 1000) }));
      const costs = LINES_COST.slice(0, r.int(3, 4)).map((label) => ({ label, kind: 'cost' as const, budget: r.step(6000, 60000, 500) }));
      const all = [...revs, ...costs].map((l) => ({ ...l, actual: Math.round((l.budget * r.step(0.82, 1.18, 0.01)) / 100) * 100 }));
      if (all.some((l) => l.actual === l.budget)) continue;
      const target = r.pick(all);
      const v = variance(target.kind, target.budget, target.actual);
      if (!v.mark) continue;
      const fav = v.mark === 'F';
      const exact = fav ? v.amount : -v.amount;
      return {
        business: firm,
        intro: `${firm} sets a budget for each quarter. This table shows the budget and the actual figures for the last quarter.`,
        tables: [
          {
            caption: `${firm}: budget and actual, last quarter ($, fictional, simulated figures)`,
            columns: ['', 'Budget', 'Actual'],
            rows: [
              { label: 'Revenues', cells: ['', ''], heading: true },
              ...all.filter((l) => l.kind === 'revenue').map((l) => ({ label: l.label, cells: [n0(l.budget), n0(l.actual)] })),
              { label: 'Costs', cells: ['', ''], heading: true },
              ...all.filter((l) => l.kind === 'cost').map((l) => ({ label: l.label, cells: [n0(l.budget), n0(l.actual)] })),
            ],
          },
        ],
        prompt: `Calculate the variance for ${target.label.toLowerCase()}. Enter a favourable variance as a positive figure and an adverse variance as a negative figure.`,
        unit: 'money',
        prefix: '$',
        suffix: '',
        example: fav ? '2,400' : '−2,400',
        exact,
        answer: `${usd(v.amount)} ${fav ? 'favourable [F]' : 'adverse [A]'}`,
        tolerance: 0.5,
        toleranceText: 'Accepted to the nearest dollar. Here favourable is entered as positive and adverse as negative; the guide’s layout writes the amount with [F] or [A].',
        working: {
          given: [g(`Budget for ${target.label.toLowerCase()}`, usd(target.budget)), g(`Actual ${target.label.toLowerCase()}`, usd(target.actual)), g('Kind of line', target.kind === 'revenue' ? 'A revenue' : 'A cost')],
          formula: 'Variance = actual figure − budgeted figure, judged favourable or adverse by its effect on profit',
          substitution: `= ${usd(target.actual)} − ${usd(target.budget)}`,
          steps: [
            `${n0(target.actual)} − ${n0(target.budget)} = ${fmtNumber(v.difference, 0)}`,
            target.kind === 'revenue'
              ? `Revenue ${v.difference > 0 ? 'above' : 'below'} budget ${v.difference > 0 ? 'raises' : 'lowers'} profit, so the variance is ${fav ? 'favourable' : 'adverse'}`
              : `A cost ${v.difference > 0 ? 'above' : 'below'} budget ${v.difference > 0 ? 'lowers' : 'raises'} profit, so the variance is ${fav ? 'favourable' : 'adverse'}`,
          ],
          answer: `${usd(v.amount)} [${v.mark}]`,
          value: exact,
          unit: 'dollars for the quarter',
          note: 'The guide gives no variance formula; this is the standard form, laid out as in its budget (figure 11, p. 63).',
        },
        meaning: `${target.label} ${target.kind === 'revenue' ? (fav ? 'brought in more than planned' : 'fell short of the plan') : fav ? 'cost less than planned' : 'cost more than planned'} by ${usd(v.amount)}${v.share !== null ? `, ${fmtNumber(v.share, 1)}% of its budget` : ''}: a reason to ask why, not yet a verdict on the managers.`,
        slips: tidySlips(
          [
            { value: -exact, message: target.kind === 'cost' ? 'The direction was judged by the sign of actual − budget. For a cost, spending above budget is adverse because it lowers profit; below budget is favourable.' : 'The direction is the wrong way round: revenue above budget is favourable, below budget adverse.' },
            { value: v.share !== null ? (fav ? v.share : -v.share) : NaN, message: 'That is the variance as a percentage of the budget. The question asks for it in dollars.' },
          ],
          exact,
          0.5,
        ),
      };
    }
    throw new Error('Could not draw a budget');
  },
};

/* ------------------------------------------------------------------ */
/* Marketing: market share and growth (4.1), elasticity (4.5, HL)      */
/* ------------------------------------------------------------------ */

function drawMarket(r: Rng) {
  for (let tries = 0; tries < 200; tries++) {
    const m = r.pick(MARKETS);
    const scale = m.unit === 'value' ? r.step(200, 3000, 10) : r.step(800, 12000, 50);
    const last = m.sellers.map(() => Math.round(scale * r.step(0.4, 1.6, 0.05)));
    const now = last.map((x) => Math.round(x * r.step(0.8, 1.35, 0.01)));
    const others = Math.round(scale * r.step(0.3, 1.2, 0.05));
    const othersNow = Math.round(others * r.step(0.85, 1.25, 0.01));
    const totalLast = last.reduce((s, x) => s + x, 0) + others;
    const totalNow = now.reduce((s, x) => s + x, 0) + othersNow;
    if (totalNow === totalLast) continue;
    return { m, last, now, others, othersNow, totalLast, totalNow };
  }
  throw new Error('Could not draw a market');
}

function marketTable(d: ReturnType<typeof drawMarket>): Table {
  return {
    caption: `Sales in the market for ${d.m.market}, by seller: ${d.m.what} (fictional, simulated figures)`,
    columns: ['', '2025', '2026'],
    rows: [
      ...d.m.sellers.map((s, i) => ({ label: s, cells: [n0(d.last[i] ?? 0), n0(d.now[i] ?? 0)] })),
      { label: 'All other sellers', cells: [n0(d.others), n0(d.othersNow)] },
    ],
  };
}

const marketShareKind: KindDef = {
  code: 'MSH',
  name: 'Market share',
  group: 'marketing',
  level: 'SL/HL',
  marks: 2,
  make: (r) => {
    const d = drawMarket(r);
    const i = r.int(0, d.m.sellers.length - 1);
    const firm = d.m.sellers[i] as string;
    const sales = d.now[i] as number;
    const exact = marketShare(sales, d.totalNow) as number;
    return {
      business: firm,
      intro: `The table shows ${d.m.what} in the market for ${d.m.market} in 2025 and 2026.`,
      tables: [marketTable(d)],
      prompt: `Calculate ${poss(firm)} market share in 2026.`,
      unit: 'percent',
      prefix: '',
      suffix: '%',
      example: '18.25',
      exact,
      answer: pct(exact),
      tolerance: 0.051,
      toleranceText: 'Accepted within 0.05 percentage points of the exact value.',
      working: {
        given: [g(`${poss(firm)} ${d.m.what}, 2026`, n0(sales)), g(`Total market, 2026`, n0(d.totalNow))],
        formula: "Market share = the business's sales ÷ total market sales × 100",
        substitution: `= ${n0(sales)} ÷ ${n0(d.totalNow)} × 100`,
        steps: [`Total market = ${[...d.now, d.othersNow].map(n0).join(' + ')} = ${n0(d.totalNow)}`, `${n0(sales)} ÷ ${n0(d.totalNow)} × 100 = ${n2(exact)}`],
        answer: pct(exact),
        value: exact,
        unit: 'per cent of the market',
        note: 'A standard form; the guide’s formulae sheet does not list it. Use the same measure, market and year for both figures.',
      },
      meaning: `${firm} sells ${pct(exact)} of all ${d.m.unit === 'value' ? 'the sales revenue' : 'the units'} in this market in 2026.`,
      slips: tidySlips(
        [
          { value: (sales / (d.totalNow - sales)) * 100, message: `That divides by the other sellers' sales. Divide by the whole market, including ${firm}.` },
          { value: ((d.last[i] as number) / d.totalLast) * 100, message: 'That is the 2025 share. The question asks for 2026.' },
          { value: (sales / d.totalLast) * 100, message: "That mixes the years: 2026 sales divided by the 2025 market. Use the same year for both." },
          { value: sales / d.totalNow, message: 'That is the share as a fraction. Multiply by 100 for a percentage.' },
          { value: (sales / (d.now.reduce((s, x) => s + x, 0))) * 100, message: 'The other sellers were left out of the market total. The market is every seller, named or not.' },
        ],
        exact,
        0.051,
      ),
    };
  },
};

const marketGrowthKind: KindDef = {
  code: 'MGR',
  name: 'Market growth',
  group: 'marketing',
  level: 'SL/HL',
  marks: 2,
  make: (r) => {
    const d = drawMarket(r);
    const exact = growthRate(d.totalLast, d.totalNow) as number;
    const i = r.int(0, d.m.sellers.length - 1);
    return {
      business: d.m.market,
      intro: `The table shows ${d.m.what} in the market for ${d.m.market} in 2025 and 2026.`,
      tables: [marketTable(d)],
      prompt: `Calculate the growth of the market for ${d.m.market} from 2025 to 2026.`,
      unit: 'percent',
      prefix: '',
      suffix: '%',
      example: exact < 0 ? '−3.25' : '6.40',
      exact,
      answer: pct(exact),
      tolerance: 0.051,
      toleranceText: 'Accepted within 0.05 percentage points. A shrinking market has negative growth.',
      working: {
        given: [g('Total market, 2025', n0(d.totalLast)), g('Total market, 2026', n0(d.totalNow))],
        formula: 'Market growth = (sales this period − sales last period) ÷ sales last period × 100',
        substitution: `= (${n0(d.totalNow)} − ${n0(d.totalLast)}) ÷ ${n0(d.totalLast)} × 100`,
        steps: [`Total 2025 = ${n0(d.totalLast)}; total 2026 = ${n0(d.totalNow)}`, `${fmtNumber(d.totalNow - d.totalLast, 0)} ÷ ${n0(d.totalLast)} × 100 = ${n2(exact)}`],
        answer: pct(exact),
        value: exact,
        unit: 'per cent a year',
        note: 'A standard form; the guide’s formulae sheet does not list it.',
      },
      meaning: `The market ${exact >= 0 ? 'grew' : 'shrank'} by ${pct(Math.abs(exact))}: ${exact >= 0 ? 'a seller can grow its sales without taking customers from rivals' : 'any seller that grows must take sales from its rivals'}.`,
      slips: tidySlips(
        [
          { value: ((d.totalNow - d.totalLast) / d.totalNow) * 100, message: 'That divides by the 2026 total. Growth is measured against the earlier year.' },
          { value: d.totalNow - d.totalLast, message: 'That is the change in sales, not the percentage growth. Divide it by the 2025 total and multiply by 100.' },
          { value: (growthRate(d.last[i] as number, d.now[i] as number) as number), message: `That is ${d.m.sellers[i]}'s own sales growth. Market growth uses the total of every seller.` },
          { value: (d.totalNow / d.totalLast) * 100, message: 'That is 2026 as a percentage of 2025. Take away 100 to find the growth.' },
        ],
        exact,
        0.051,
      ),
    };
  },
};

const elasticity: KindDef = {
  code: 'PED',
  name: 'Price elasticity of demand',
  group: 'marketing',
  level: 'HL',
  marks: 2,
  make: (r) => {
    for (let tries = 0; tries < 200; tries++) {
      const it = r.pick([
        { firm: 'Ambleway Cafés', item: 'a flat white', price: [2.4, 4.8, 0.1], qty: [3000, 20000, 100] },
        { firm: 'Cresswell Gyms', item: 'a monthly pass', price: [24, 70, 1], qty: [300, 3000, 10] },
        { firm: 'Elmsworth Books', item: 'a hardback novel', price: [14, 32, 1], qty: [200, 2500, 10] },
        { firm: 'Oxlade Travel', item: 'a weekend city break', price: [180, 600, 10], qty: [60, 900, 5] },
        { firm: 'Danbury Florists', item: 'a hand-tied bouquet', price: [20, 60, 1], qty: [150, 2000, 10] },
      ] as const);
      const firm = it.firm;
      const item = it.item;
      const P1 = r.step(it.price[0], it.price[1], it.price[2]);
      const dp = r.pick([-0.25, -0.2, -0.15, -0.1, 0.1, 0.15, 0.2, 0.25]);
      const P2 = round(P1 * (1 + dp), 2);
      const Q1 = r.step(it.qty[0], it.qty[1], it.qty[2]);
      const e = r.step(0.3, 2.4, 0.1);
      const Q2 = Math.round(Q1 * (1 - e * dp));
      if (P2 === P1 || Q2 === Q1 || Q2 <= 0) continue;
      const pq = ((Q2 - Q1) / Q1) * 100;
      const pp = ((P2 - P1) / P1) * 100;
      const exact = pq / pp;
      if (Math.abs(Math.abs(exact) - 1) < 0.08) continue;
      return {
        business: firm,
        intro: `${firm} changed the price of ${item} from ${usd(P1)} to ${usd(P2)}. In the month before, it sold ${n0(Q1)}; in the month after, ${n0(Q2)}. Nothing else changed that it knows of.`,
        tables: [{ caption: `${firm}: price and sales of ${item} (fictional, simulated figures)`, columns: ['', 'Before', 'After'], rows: [{ label: 'Price', cells: [usd(P1), usd(P2)] }, { label: 'Quantity sold in a month', cells: [n0(Q1), n0(Q2)] }] }],
        prompt: `Calculate the price elasticity of demand (PED) for ${item}.`,
        unit: 'ratio',
        prefix: '',
        suffix: '',
        example: '−1.25',
        exact,
        answer: `${fmtNumber(exact, 2)} (${fmtNumber(Math.abs(exact), 2)} without the sign)`,
        tolerance: 0.05,
        toleranceText: 'Accepted within 0.05. PED is usually negative and is often quoted without its sign, so either form is accepted.',
        alsoRight: [Math.abs(exact)],
        working: {
          given: [g('Price before and after', `${usd(P1)} and ${usd(P2)}`), g('Quantity before and after', `${n0(Q1)} and ${n0(Q2)}`)],
          formula: 'PED = percentage change in quantity demanded ÷ percentage change in price',
          substitution: `= ((${n0(Q2)} − ${n0(Q1)}) ÷ ${n0(Q1)} × 100) ÷ ((${usd2(P2)} − ${usd2(P1)}) ÷ ${usd2(P1)} × 100)`,
          steps: [`Change in quantity = ${fmtNumber(pq, 2)}%`, `Change in price = ${fmtNumber(pp, 2)}%`, `${fmtNumber(pq, 2)} ÷ ${fmtNumber(pp, 2)} = ${fmtNumber(exact, 2)}`],
          answer: fmtNumber(exact, 2),
          value: exact,
          unit: 'no unit: a ratio of two percentages',
          note: 'A standard form; the guide’s formulae sheet does not list PED. Each change is measured from the old value.',
        },
        meaning: `Demand is price ${Math.abs(exact) > 1 ? 'elastic' : 'inelastic'} over this change: quantity changed by ${Math.abs(exact) > 1 ? 'a larger' : 'a smaller'} percentage than price. Revenue went from ${usd(P1 * Q1)} to ${usd(P2 * Q2)} a month.`,
        slips: tidySlips(
          [
            { value: pp / pq, message: 'The ratio is upside down. PED divides the change in quantity by the change in price.' },
            { value: (Q2 - Q1) / (P2 - P1), message: 'That divides the changes themselves, not the percentage changes. Turn each change into a percentage of its old value first.' },
            { value: (((Q2 - Q1) / Q2) * 100) / (((P2 - P1) / P2) * 100), message: 'Each change was measured from the new value. Measure from the old value, before the change.' },
          ],
          exact,
          0.05,
        ).filter((s) => Math.abs(Math.abs(s.value) - Math.abs(exact)) > 0.05),
      };
    }
    throw new Error('Could not draw a price change');
  },
};

/* ------------------------------------------------------------------ */
/* Labour turnover (2.4, HL)                                           */
/* ------------------------------------------------------------------ */

const labourTurnoverKind: KindDef = {
  code: 'LTO',
  name: 'Labour turnover',
  group: 'people',
  level: 'HL',
  marks: 2,
  make: (r) => {
    for (let tries = 0; tries < 200; tries++) {
      const firm = r.pick([...FIRMS, ...WORKS.map((w) => w.name)]);
      const start = r.int(20, 480);
      const end = Math.max(10, Math.round(start * r.step(0.8, 1.25, 0.01)));
      if ((start + end) % 2 !== 0 && r.chance(0.5)) continue;
      const avg = (start + end) / 2;
      const leavers = Math.max(1, Math.round(avg * r.step(0.05, 0.45, 0.01)));
      const joiners = end - start + leavers;
      if (joiners < 0) continue;
      const exact = labourTurnover(leavers, avg) as number;
      return {
        business: firm,
        intro: `${firm} employed ${n0(start)} people at the start of last year and ${n0(end)} at the end. During the year ${n0(leavers)} left and ${n0(joiners)} joined.`,
        tables: [list(`${firm}: staff last year (fictional, simulated figures)`, [['Employees at the start of the year', n0(start)], ['Employees at the end of the year', n0(end)], ['Employees who left during the year', n0(leavers)], ['Employees who joined during the year', n0(joiners)]])],
        prompt: `Calculate the labour turnover of ${firm} for last year.`,
        unit: 'percent',
        prefix: '',
        suffix: '%',
        example: '14.5',
        exact,
        answer: pct(exact),
        tolerance: 0.051,
        toleranceText: 'Accepted within 0.05 percentage points of the exact value.',
        working: {
          given: [g('Employees who left', n0(leavers)), g('Employees at the start and end', `${n0(start)} and ${n0(end)}`)],
          formula: 'Labour turnover = (number of employees leaving ÷ average number of employees) × 100',
          substitution: `= ${n0(leavers)} ÷ ((${n0(start)} + ${n0(end)}) ÷ 2) × 100`,
          steps: [`Average number of employees = (${n0(start)} + ${n0(end)}) ÷ 2 = ${fmtNumber(avg, Number.isInteger(avg) ? 0 : 1)}`, `${n0(leavers)} ÷ ${fmtNumber(avg, Number.isInteger(avg) ? 0 : 1)} × 100 = ${n2(exact)}`],
          answer: pct(exact),
          value: exact,
          unit: 'per cent of the average workforce, per year',
          note: 'A standard form; the guide’s formulae sheet does not list it.',
        },
        meaning: `About ${fmtNumber(exact, 0)} in every 100 employees left during the year: each leaver means recruitment and training costs, and lost experience.`,
        slips: tidySlips(
          [
            { value: (leavers / start) * 100, message: 'That divides by the staff at the start of the year. Use the average of the start and the end.' },
            { value: (leavers / end) * 100, message: 'That divides by the staff at the end of the year. Use the average of the start and the end.' },
            { value: (joiners / avg) * 100, message: 'That uses the employees who joined. Labour turnover counts those who left.' },
            { value: leavers / avg, message: 'That is the fraction. Multiply by 100 for a percentage.' },
          ],
          exact,
          0.051,
        ),
      };
    }
    throw new Error('Could not draw a workforce');
  },
};

/* ------------------------------------------------------------------ */
/* Production planning (5.6, HL)                                       */
/* ------------------------------------------------------------------ */

const capacityKind: KindDef = {
  code: 'CAP',
  name: 'Capacity utilization rate',
  group: 'operations',
  level: 'HL',
  marks: 2,
  make: (r) => {
    const w = r.pick(WORKS);
    const cap = r.step(2000, 60000, 100);
    const out = Math.round((cap * r.step(0.45, 0.98, 0.01)) / 10) * 10;
    const exact = (out / cap) * 100;
    return {
      business: w.name,
      intro: `${w.name} can make at most ${n0(cap)} ${w.units} a month with its present staff and equipment. Last month it made ${n0(out)}.`,
      tables: [list(`${w.name}: last month (fictional, simulated figures)`, [['Productive capacity', `${n0(cap)} ${w.units}`], ['Actual output', `${n0(out)} ${w.units}`]])],
      prompt: `Calculate ${poss(w.name)} capacity utilization rate for last month.`,
      unit: 'percent',
      prefix: '',
      suffix: '%',
      example: '82.5',
      exact,
      answer: pct(exact),
      tolerance: 0.051,
      toleranceText: 'Accepted within 0.05 percentage points of the exact value.',
      working: {
        given: [g('Actual output', `${n0(out)} ${w.units}`), g('Productive capacity', `${n0(cap)} ${w.units}`)],
        formula: 'Capacity utilization rate = actual output ÷ productive capacity × 100',
        substitution: `= ${n0(out)} ÷ ${n0(cap)} × 100`,
        steps: [`${n0(out)} ÷ ${n0(cap)} × 100 = ${n2(exact)}`],
        answer: pct(exact),
        value: exact,
        unit: 'per cent of capacity',
        note: 'On the guide’s formulae sheet (p. 65, HL).',
      },
      meaning: `${w.name} used ${pct(exact)} of what it could make, leaving ${pct(100 - exact)} spare: room for new orders, but fixed costs spread over fewer ${w.units} than they could be.`,
      slips: tidySlips(
        [
          { value: (cap / out) * 100, message: 'The division is upside down: actual output goes on top.' },
          { value: 100 - exact, message: 'That is the spare capacity. The rate is the share of capacity in use.' },
          { value: out / cap, message: 'That is the fraction. Multiply by 100 for a percentage.' },
        ],
        exact,
        0.051,
      ),
    };
  },
};

const productivityRate: KindDef = {
  code: 'PRR',
  name: 'Productivity rate',
  group: 'operations',
  level: 'HL',
  marks: 2,
  make: (r) => {
    const w = r.pick(WORKS);
    const input = r.step(40000, 400000, 500);
    const output = Math.round((input * r.step(0.85, 1.6, 0.01)) / 100) * 100;
    const exact = (output / input) * 100;
    return {
      business: w.name,
      intro: `Last quarter ${w.name} sold ${w.units} worth ${usd(output)}. The inputs used to make them (materials, labour, energy and the use of machinery) cost ${usd(input)}.`,
      tables: [list(`${w.name}: last quarter (fictional, simulated figures)`, [['Total output, by value', usd(output)], ['Total input, by value', usd(input)]])],
      prompt: `Calculate ${poss(w.name)} productivity rate for last quarter.`,
      unit: 'percent',
      prefix: '',
      suffix: '%',
      example: '118.4',
      exact,
      answer: pct(exact),
      tolerance: 0.051,
      toleranceText: 'Accepted within 0.05 of the exact value.',
      working: {
        given: [g('Total output', usd(output)), g('Total input', usd(input))],
        formula: 'Productivity rate = total output ÷ total input × 100',
        substitution: `= ${usd(output)} ÷ ${usd(input)} × 100`,
        steps: [`${n0(output)} ÷ ${n0(input)} × 100 = ${n2(exact)}`],
        answer: pct(exact),
        value: exact,
        unit: 'per cent',
        note: 'On the guide’s formulae sheet (p. 65, HL). Output and input must be measured in the same units, here dollars.',
      },
      meaning: `Every $100 of inputs produced ${usd(exact)} of output${exact > 100 ? '' : ': less than the inputs cost'}.`,
      slips: tidySlips(
        [
          { value: (input / output) * 100, message: 'The division is upside down: total output goes on top.' },
          { value: output / input, message: 'That is the ratio before multiplying by 100.' },
          { value: exact - 100, message: 'That takes away 100. The productivity rate is output as a percentage of input, not the gain.' },
        ],
        exact,
        0.051,
      ),
    };
  },
};

const defectRate: KindDef = {
  code: 'DFR',
  name: 'Defect rate',
  group: 'operations',
  level: 'HL',
  marks: 2,
  make: (r) => {
    const w = r.pick(WORKS);
    const made = r.step(1000, 40000, 50);
    const bad = Math.max(1, Math.round(made * r.step(0.005, 0.09, 0.001)));
    const exact = (bad / made) * 100;
    return {
      business: w.name,
      intro: `Last month ${w.name} made ${n0(made)} ${w.units}. Inspection rejected ${n0(bad)} of them as below its quality standard.`,
      tables: [list(`${w.name}: last month (fictional, simulated figures)`, [[`${cap(w.units)} made`, n0(made)], ['Rejected at inspection', n0(bad)]])],
      prompt: `Calculate ${poss(w.name)} defect rate for last month.`,
      unit: 'percent',
      prefix: '',
      suffix: '%',
      example: '2.4',
      exact,
      answer: pct(exact),
      tolerance: 0.051,
      toleranceText: 'Accepted within 0.05 percentage points of the exact value.',
      working: {
        given: [g('Units made', n0(made)), g('Units rejected', n0(bad))],
        formula: 'Defect rate = units that fail the quality standard ÷ units made × 100',
        substitution: `= ${n0(bad)} ÷ ${n0(made)} × 100`,
        steps: [`${n0(bad)} ÷ ${n0(made)} × 100 = ${n2(exact)}`],
        answer: pct(exact),
        value: exact,
        unit: 'per cent of units made',
        note: 'A standard form; the guide’s formulae sheet does not list it.',
      },
      meaning: `${pct(exact)} of the ${w.units} made were wasted: their materials and labour bought nothing a customer will pay for.`,
      slips: tidySlips(
        [
          { value: (bad / (made - bad)) * 100, message: 'That divides by the good units only. Divide by all the units made.' },
          { value: ((made - bad) / made) * 100, message: 'That is the share that passed. The defect rate is the share rejected.' },
          { value: bad / made, message: 'That is the fraction. Multiply by 100 for a percentage.' },
        ],
        exact,
        0.051,
      ),
    };
  },
};

const labourProductivity: KindDef = {
  code: 'LBP',
  name: 'Labour productivity',
  group: 'operations',
  level: 'HL',
  marks: 2,
  make: (r) => {
    const w = r.pick(WORKS);
    const workers = r.int(6, 60);
    const hours = workers * r.pick([35, 37.5, 38, 40]);
    const out = Math.round((hours * r.step(1.5, 12, 0.1)) / 10) * 10;
    const exact = out / hours;
    return {
      business: w.name,
      intro: `Last week ${n0(workers)} employees at ${w.name} worked ${fmtNumber(hours, Number.isInteger(hours) ? 0 : 1)} hours between them and made ${n0(out)} ${w.units}.`,
      tables: [list(`${w.name}: last week (fictional, simulated figures)`, [['Output', `${n0(out)} ${w.units}`], ['Employees', n0(workers)], ['Labour hours worked', fmtNumber(hours, Number.isInteger(hours) ? 0 : 1)]])],
      prompt: `Calculate labour productivity at ${w.name} last week, in ${w.units} per labour hour.`,
      unit: 'units',
      prefix: '',
      suffix: `${w.units} per hour`,
      example: '4.25',
      exact,
      answer: `${n2(exact)} ${w.units} per labour hour`,
      tolerance: 0.01,
      toleranceText: 'Accepted to two decimal places.',
      working: {
        given: [g('Output', `${n0(out)} ${w.units}`), g('Labour hours', fmtNumber(hours, Number.isInteger(hours) ? 0 : 1))],
        formula: 'Labour productivity = total output ÷ labour hours',
        substitution: `= ${n0(out)} ÷ ${fmtNumber(hours, Number.isInteger(hours) ? 0 : 1)}`,
        steps: [`${n0(out)} ÷ ${fmtNumber(hours, 1)} = ${n2(exact)}`],
        answer: `${n2(exact)} ${w.units} per hour`,
        value: exact,
        unit: `${w.units} per labour hour`,
        note: 'A standard form; the guide’s formulae sheet does not list it. Say which measure of labour you used: hours or workers.',
      },
      meaning: `Each hour of work produced ${n2(exact)} ${w.units}; per employee that is ${fmtNumber(out / workers, 1)} a week.`,
      slips: tidySlips(
        [
          { value: out / workers, message: 'That is output per employee. The question asks for output per labour hour.' },
          { value: hours / out, message: 'The division is upside down: that is hours per unit, not units per hour.' },
        ],
        exact,
        0.01,
      ),
    };
  },
};

const capitalProductivity: KindDef = {
  code: 'CPP',
  name: 'Capital productivity',
  group: 'operations',
  level: 'HL',
  marks: 2,
  make: (r) => {
    const w = r.pick(WORKS);
    const machines = r.int(2, 12);
    const mh = machines * r.step(40, 140, 5);
    const lh = Math.round(mh * r.step(0.8, 3, 0.1));
    const out = Math.round((mh * r.step(4, 40, 0.5)) / 10) * 10;
    const exact = out / mh;
    return {
      business: w.name,
      intro: `Last week ${poss(w.name)} ${machines} machines ran for ${n0(mh)} machine hours between them and made ${n0(out)} ${w.units}. Staff worked ${n0(lh)} hours.`,
      tables: [list(`${w.name}: last week (fictional, simulated figures)`, [['Output', `${n0(out)} ${w.units}`], ['Machine hours', n0(mh)], ['Labour hours', n0(lh)]])],
      prompt: `Calculate capital productivity at ${w.name} last week, in ${w.units} per machine hour.`,
      unit: 'units',
      prefix: '',
      suffix: `${w.units} per machine hour`,
      example: '12.5',
      exact,
      answer: `${n2(exact)} ${w.units} per machine hour`,
      tolerance: 0.01,
      toleranceText: 'Accepted to two decimal places.',
      working: {
        given: [g('Output', `${n0(out)} ${w.units}`), g('Machine hours', n0(mh))],
        formula: 'Capital productivity = total output ÷ capital input (machine hours)',
        substitution: `= ${n0(out)} ÷ ${n0(mh)}`,
        steps: [`${n0(out)} ÷ ${n0(mh)} = ${n2(exact)}`],
        answer: `${n2(exact)} ${w.units} per machine hour`,
        value: exact,
        unit: `${w.units} per machine hour`,
        note: 'A standard form; the guide’s formulae sheet does not list it.',
      },
      meaning: `Each machine hour produced ${n2(exact)} ${w.units}: a measure of how well the equipment, rather than the staff, is used.`,
      slips: tidySlips(
        [
          { value: out / lh, message: 'That uses labour hours. Capital productivity measures output per unit of capital, here machine hours.' },
          { value: mh / out, message: 'The division is upside down: that is machine hours per unit.' },
          { value: out / machines, message: 'That is output per machine for the week. The question asks per machine hour.' },
        ],
        exact,
        0.01,
      ),
    };
  },
};

const operatingLeverageKind: KindDef = {
  code: 'DOL',
  name: 'Degree of operating leverage',
  group: 'operations',
  level: 'HL',
  marks: 2,
  make: (r) => {
    for (let tries = 0; tries < 200; tries++) {
      const s = costScenario(r);
      const tc = round(s.c * s.Q, 2);
      const profit = round(tc - s.F, 2);
      if (!(profit > 0)) continue;
      const exact = operatingLeverage(tc, profit) as number;
      if (exact > 12) continue;
      return {
        business: s.m.name,
        intro: `${s.m.name} sells ${s.m.units} at ${usd(s.P)} each, with a variable cost of ${usd(s.V)} each and fixed costs of ${usd(s.F)} a year. It expects to sell ${n0(s.Q)} next year.`,
        tables: [list(`${s.m.name}: next year (fictional, simulated figures)`, [[`Selling price per ${s.m.unit}`, usd(s.P)], [`Variable cost per ${s.m.unit}`, usd(s.V)], ['Fixed costs per year', usd(s.F)], ['Expected sales', `${n0(s.Q)} ${s.m.units}`]])],
        prompt: `Calculate ${poss(s.m.name)} degree of operating leverage at the expected sales.`,
        unit: 'ratio',
        prefix: '',
        suffix: '',
        example: '2.4',
        exact,
        answer: fmtNumber(exact, 2),
        tolerance: 0.05,
        toleranceText: 'Accepted within 0.05 of the exact value.',
        working: {
          given: [g('Total contribution', usd(tc)), g('Fixed costs', usd(s.F))],
          formula: 'Degree of operating leverage = total contribution ÷ operating profit, where operating profit = total contribution − fixed costs',
          substitution: `= ${usd(tc)} ÷ (${usd(tc)} − ${usd(s.F)})`,
          steps: [`Total contribution = (${n2(s.P)} − ${n2(s.V)}) × ${n0(s.Q)} = ${n2(tc)}`, `Operating profit = ${n2(tc)} − ${n0(s.F)} = ${n2(profit)}`, `${n2(tc)} ÷ ${n2(profit)} = ${n2(exact)}`],
          answer: fmtNumber(exact, 2),
          value: exact,
          unit: 'no unit: a multiplier',
          note: 'A standard form; the guide names operating leverage in 5.6 but gives no formula. It has no meaning at or below break-even.',
        },
        meaning: `A 10% change in sales would change operating profit by about ${fmtNumber(exact * 10, 1)}%: the higher the fixed costs, the more profit swings with sales.`,
        slips: tidySlips(
          [
            { value: profit / tc, message: 'The division is upside down: total contribution goes on top.' },
            { value: tc / s.F, message: 'That divides by the fixed costs. Divide by operating profit: contribution minus fixed costs.' },
            { value: tc / (s.P * s.Q), message: 'That is contribution as a share of revenue. Operating leverage divides contribution by profit.' },
          ],
          exact,
          0.05,
        ),
      };
    }
    throw new Error('Could not draw a profitable year');
  },
};

const makeOrBuy: KindDef = {
  code: 'MOB',
  name: 'Cost to make against cost to buy',
  group: 'operations',
  level: 'HL',
  marks: 3,
  make: (r) => {
    for (let tries = 0; tries < 200; tries++) {
      const w = r.pick(WORKS);
      const part = r.pick(['handles', 'labels', 'valves', 'lids', 'brackets', 'gaskets']);
      const Q = r.step(2000, 60000, 500);
      const vc = r.step(0.4, 12, 0.05);
      const fc = r.step(4000, 90000, 500);
      const price = round(vc + (fc / Q) * r.step(0.6, 1.5, 0.05) + r.step(-0.3, 0.3, 0.05), 2);
      if (!(price > 0)) continue;
      const ctm = round(fc + vc * Q, 2);
      const ctb = round(price * Q, 2);
      if (Math.abs(ctm - ctb) < 200) continue;
      const exact = round(Math.abs(ctb - ctm), 2);
      const buy = ctb < ctm;
      return {
        business: w.name,
        intro: `${w.name} needs ${n0(Q)} ${part} next year. It could make them itself: that would add ${usd(fc)} a year in fixed costs (a machine lease and a supervisor) and ${usd2(vc)} of variable cost for each one. A supplier offers to sell them for ${usd2(price)} each, delivered.`,
        tables: [list(`${w.name}: make or buy the ${part} (fictional, simulated figures)`, [['Quantity needed next year', n0(Q)], ['Extra fixed costs of making', usd(fc)], ['Variable cost of making one', usd2(vc)], ["Supplier's price for one, delivered", usd2(price)]])],
        prompt: `Calculate the cost to make (CTM) and the cost to buy (CTB) the ${part}, and enter how much the cheaper option saves.`,
        unit: 'money',
        prefix: '$',
        suffix: '',
        example: '3,250',
        exact,
        answer: `${usd(exact)}, by ${buy ? 'buying' : 'making'} (CTM ${usd(ctm)}, CTB ${usd(ctb)})`,
        tolerance: 0.5,
        toleranceText: 'Accepted to the nearest dollar.',
        working: {
          given: [g('Quantity', n0(Q)), g('Fixed costs of making', usd(fc)), g('Variable cost of making one', usd2(vc)), g("Supplier's price for one", usd2(price))],
          formula: 'CTM = fixed costs + (variable cost per unit × quantity); CTB = price per unit × quantity',
          substitution: `CTM = ${usd(fc)} + (${usd2(vc)} × ${n0(Q)}); CTB = ${usd2(price)} × ${n0(Q)}`,
          steps: [`CTM = ${n0(fc)} + ${n2(vc * Q)} = ${n2(ctm)}`, `CTB = ${n2(price)} × ${n0(Q)} = ${n2(ctb)}`, `Saving = ${n2(Math.max(ctm, ctb))} − ${n2(Math.min(ctm, ctb))} = ${n2(exact)}`],
          answer: `${usd(exact)}, by ${buy ? 'buying' : 'making'}`,
          value: exact,
          unit: 'dollars a year',
          note: 'Standard forms; the guide names CTB and CTM in 5.6 but gives no formula.',
        },
        meaning: `${buy ? 'Buying' : 'Making'} is cheaper by ${usd(exact)} a year. Cost is one factor: quality, reliability of supply and what the spare capacity could do instead also count.`,
        slips: tidySlips(
          [
            { value: Math.abs(ctb - vc * Q), message: 'The fixed costs of making were left out. CTM includes the fixed costs that making would add.' },
            { value: Math.abs(price - vc), message: 'That compares the costs of one unit, leaving out the fixed costs. Work out the totals for the whole quantity.' },
            { value: Math.max(ctm, ctb), message: 'That is the cost of the dearer option. The question asks for the saving: the difference between the two.' },
            { value: Math.min(ctm, ctb), message: 'That is the cost of the cheaper option. The question asks for the saving: the difference between the two.' },
          ],
          exact,
          0.5,
        ),
      };
    }
    throw new Error('Could not draw a make or buy decision');
  },
};

const reorderLevelKind: KindDef = {
  code: 'ROL',
  name: 'Reorder level',
  group: 'operations',
  level: 'HL',
  marks: 2,
  make: (r) => {
    const w = r.pick(WORKS);
    const usage = r.step(40, 900, 10);
    const lead = r.int(1, 4);
    const buffer = Math.round((usage * r.step(0.5, 2, 0.25)) / 10) * 10;
    const exact = reorderLevel({ buffer, usage, leadTime: lead });
    return {
      business: w.name,
      intro: `${w.name} uses ${n0(usage)} units of a raw material a week. Its supplier delivers ${lead} ${plural(lead, 'week', 'weeks')} after an order is placed, and the business keeps a buffer stock of ${n0(buffer)} units.`,
      tables: [list(`${w.name}: stock of the raw material (fictional, simulated figures)`, [['Usage per week', `${n0(usage)} units`], ['Lead time', `${lead} ${plural(lead, 'week', 'weeks')}`], ['Buffer stock', `${n0(buffer)} units`]])],
      prompt: `Calculate the reorder level for the raw material.`,
      unit: 'units',
      prefix: '',
      suffix: 'units',
      example: '1,500',
      exact,
      answer: `${n0(exact)} units`,
      tolerance: 0,
      toleranceText: 'A whole number of units.',
      working: {
        given: [g('Usage per week', n0(usage)), g('Lead time', `${lead} weeks`), g('Buffer stock', n0(buffer))],
        formula: 'Reorder level = buffer stock + (usage per period × lead time in periods)',
        substitution: `= ${n0(buffer)} + (${n0(usage)} × ${lead})`,
        steps: [`${n0(usage)} × ${lead} = ${n0(usage * lead)}`, `${n0(buffer)} + ${n0(usage * lead)} = ${n0(exact)}`],
        answer: `${n0(exact)} units`,
        value: exact,
        unit: 'units of stock',
        note: 'A standard form; the guide names the reorder level in 5.6 but gives no formula.',
      },
      meaning: `When stock falls to ${n0(exact)} units, an order goes out: the ${n0(usage * lead)} units used while it travels bring stock down to the buffer just as it arrives.`,
      slips: tidySlips(
        [
          { value: usage * lead, message: 'The buffer stock was left out. The order must arrive before stock falls below the buffer.' },
          { value: buffer + usage, message: `Only one week's usage was added. Multiply the weekly usage by the ${lead}-week lead time.` },
          { value: usage * lead - buffer, message: 'The buffer stock was taken away. It is added: the buffer is what should be left when the delivery arrives.' },
        ],
        exact,
        0,
      ),
    };
  },
};

const reorderQuantityKind: KindDef = {
  code: 'RQT',
  name: 'Reorder quantity',
  group: 'operations',
  level: 'HL',
  marks: 1,
  make: (r) => {
    const w = r.pick(WORKS);
    const usage = r.step(50, 800, 10);
    const buffer = Math.round((usage * r.step(0.5, 2, 0.25)) / 10) * 10;
    const lead = r.int(1, 3);
    // Each delivery must be larger than the stock used during the lead time, or the reorder level would sit above the maximum.
    const qty = usage * r.int(lead + 1, 8);
    const max = buffer + qty;
    const rol = reorderLevel({ buffer, usage, leadTime: lead });
    const exact = qty;
    return {
      business: w.name,
      intro: `${w.name} plans its stock of packaging so that each delivery arrives just as stock reaches the buffer. The maximum stock level is ${n0(max)} units, the buffer stock ${n0(buffer)} units and the reorder level ${n0(rol)} units.`,
      tables: [list(`${w.name}: the stock control plan (fictional, simulated figures)`, [['Maximum stock level', `${n0(max)} units`], ['Reorder level', `${n0(rol)} units`], ['Buffer stock', `${n0(buffer)} units`]])],
      prompt: 'Calculate the reorder quantity.',
      unit: 'units',
      prefix: '',
      suffix: 'units',
      example: '2,400',
      exact,
      answer: `${n0(exact)} units`,
      tolerance: 0,
      toleranceText: 'A whole number of units.',
      working: {
        given: [g('Maximum stock level', n0(max)), g('Buffer stock', n0(buffer))],
        formula: 'Reorder quantity = maximum stock level − buffer stock, when each delivery arrives as stock reaches the buffer',
        substitution: `= ${n0(max)} − ${n0(buffer)}`,
        steps: [`${n0(max)} − ${n0(buffer)} = ${n0(exact)}`],
        answer: `${n0(exact)} units`,
        value: exact,
        unit: 'units a delivery',
        note: 'A standard form; the guide names the reorder quantity in 5.6 but gives no formula.',
      },
      meaning: `Each delivery of ${n0(exact)} units lifts stock from the buffer of ${n0(buffer)} back to the maximum of ${n0(max)}.`,
      slips: tidySlips(
        [
          { value: max - rol, message: 'That takes away the reorder level. The delivery arrives when stock is at the buffer, so take away the buffer stock.' },
          { value: max, message: 'That is the maximum stock level. The delivery tops stock up from the buffer to the maximum.' },
          { value: rol - buffer, message: 'That is the stock used during the lead time, not the size of a delivery.' },
        ],
        exact,
        0,
      ),
    };
  },
};

/* ------------------------------------------------------------------ */
/* Toolkit (SL/HL): decision trees and descriptive statistics          */
/* ------------------------------------------------------------------ */

const expectedValueKind: KindDef = {
  code: 'EVT',
  name: 'Expected value from a decision tree',
  group: 'toolkit',
  level: 'SL/HL',
  marks: 2,
  make: (r) => {
    for (let tries = 0; tries < 200; tries++) {
      const firm = r.pick([...FIRMS, ...WORKS.map((w) => w.name)]);
      const option = r.pick(['open a second branch', 'launch an online shop', 'enter a regional trade fair', 'buy a food truck', 'run a television advertising campaign']);
      const three = r.chance(0.5);
      const p1 = r.step(0.1, 0.7, 0.05);
      const p2 = three ? r.step(0.1, round(0.9 - p1, 2), 0.05) : round(1 - p1, 2);
      const p3 = three ? round(1 - p1 - p2, 2) : 0;
      if (three && !(p3 >= 0.05)) continue;
      const scale = r.pick([1000, 1000, 10000]);
      const x1 = r.int(40, 200) * scale;
      const x2 = r.int(5, 60) * scale;
      const x3 = three ? r.int(-30, 10) * scale : 0;
      const cost = r.int(10, 70) * scale;
      const outcomes = [
        { label: 'High demand', probability: p1, payoff: x1 },
        { label: three ? 'Medium demand' : 'Low demand', probability: p2, payoff: x2 },
        ...(three ? [{ label: 'Low demand', probability: p3, payoff: x3 }] : []),
      ];
      const res = evaluateOption({ id: 'o', label: option, cost, outcomes });
      if (!res.valid) continue;
      const exact = round(res.expectedValue, 2);
      return {
        business: firm,
        intro: `${firm} is deciding whether to ${option}. It would cost ${usd(cost)}. The table gives the possible outcomes, their estimated probabilities and the payoff of each, before the cost.`,
        tables: [{ caption: `${firm}: the option to ${option} (fictional, simulated figures)`, columns: ['', 'Probability', 'Payoff ($)'], rows: outcomes.map((o) => ({ label: o.label, cells: [fmtNumber(o.probability, 2), fmtNumber(o.payoff, 0)] })) }],
        prompt: `Calculate the expected value of the option to ${option}, after its cost.`,
        unit: 'money',
        prefix: '$',
        suffix: '',
        example: '42,500',
        exact,
        answer: usd(exact),
        tolerance: 0.5,
        toleranceText: 'Accepted to the nearest dollar. A negative expected value is entered with a minus sign.',
        working: {
          given: [g('Cost of the option', usd(cost)), ...outcomes.map((o) => g(`${o.label}: probability and payoff`, `${fmtNumber(o.probability, 2)} and ${usd(o.payoff)}`))],
          formula: 'Expected value = Σ (probability × payoff) − cost of the option',
          substitution: `= ${outcomes.map((o) => `${fmtNumber(o.probability, 2)} × ${usd(o.payoff)}`).join(' + ')} − ${usd(cost)}`,
          steps: [...outcomes.map((o) => `${fmtNumber(o.probability, 2)} × ${n0(o.payoff)} = ${n2(o.probability * o.payoff)}`), `${n2(res.expectedPayoff)} − ${n0(cost)} = ${n2(exact)}`],
          answer: usd(exact),
          value: exact,
          unit: 'dollars, an average over many repetitions',
          note: 'The toolkit’s decision tree method (guide, p. 14); the guide gives no formula.',
        },
        meaning: `On average, the option would be worth ${usd(exact)} after its cost. It is an average over many imagined repetitions, not a forecast: the actual result will be one of the payoffs less the cost.`,
        slips: tidySlips(
          [
            { value: res.expectedPayoff, message: 'The cost of the option was left out. Take it away from the weighted payoffs.' },
            { value: outcomes.reduce((s, o) => s + o.payoff, 0) / outcomes.length - cost, message: 'That is a plain average of the payoffs. Weight each payoff by its probability.' },
            { value: outcomes.reduce((s, o) => s + o.payoff, 0) - cost, message: 'The payoffs were added without their probabilities. Multiply each by its probability first.' },
          ],
          exact,
          0.5,
        ),
      };
    }
    throw new Error('Could not draw a decision');
  },
};

/** Values for the statistics kinds: whole numbers, not all the same. */
function drawValues(r: Rng, n: number, lo: number, hi: number): number[] {
  for (let tries = 0; tries < 100; tries++) {
    const xs = Array.from({ length: n }, () => r.int(lo, hi));
    if (new Set(xs).size >= Math.min(n, 4)) return xs;
  }
  throw new Error('Could not draw values');
}

const STAT_CONTEXTS = [
  { firm: 'Ambleway Cafés', what: 'cups of coffee sold each day last week', unit: 'cups', lo: 140, hi: 420 },
  { firm: 'Cresswell Gyms', what: 'new members each month', unit: 'members', lo: 12, hi: 95 },
  { firm: 'Kilnsey Vets', what: 'appointments each day', unit: 'appointments', lo: 18, hi: 64 },
  { firm: 'Elmsworth Books', what: 'books sold each day', unit: 'books', lo: 30, hi: 160 },
  { firm: 'Oxlade Travel', what: 'holidays booked each week', unit: 'bookings', lo: 20, hi: 110 },
];

const statTable = (c: (typeof STAT_CONTEXTS)[number], xs: number[]): Table => ({
  caption: `${c.firm}: ${c.what} (fictional, simulated figures)`,
  columns: ['', ...xs.map((_, i) => String(i + 1))],
  rows: [{ label: cap(c.unit), cells: xs.map((x) => n0(x)) }],
});

const meanKind: KindDef = {
  code: 'AVG',
  name: 'The mean',
  group: 'toolkit',
  level: 'SL/HL',
  marks: 1,
  make: (r) => {
    const c = r.pick(STAT_CONTEXTS);
    const n = r.int(6, 10);
    const xs = drawValues(r, n, c.lo, c.hi);
    const sum = xs.reduce((s, x) => s + x, 0);
    const exact = sum / n;
    const sorted = [...xs].sort((a, b) => a - b);
    const median = n % 2 ? (sorted[(n - 1) / 2] as number) : ((sorted[n / 2 - 1] as number) + (sorted[n / 2] as number)) / 2;
    return {
      business: c.firm,
      intro: `The table shows ${poss(c.firm)} ${c.what}.`,
      tables: [statTable(c, xs)],
      prompt: `Calculate the mean number of ${c.unit}.`,
      unit: 'units',
      prefix: '',
      suffix: c.unit,
      example: '212.5',
      exact,
      answer: `${fmtNumber(exact, Number.isInteger(round(exact, 2)) ? 0 : 2)} ${c.unit}`,
      tolerance: 0.01,
      toleranceText: 'Accepted to two decimal places.',
      working: {
        given: [g('Values', xs.map(n0).join(', ')), g('Number of values', String(n))],
        formula: 'Mean = total of the values ÷ number of values',
        substitution: `= (${xs.map(n0).join(' + ')}) ÷ ${n}`,
        steps: [`Total = ${n0(sum)}`, `${n0(sum)} ÷ ${n} = ${fmtNumber(exact, 2)}`],
        answer: fmtNumber(exact, 2),
        value: exact,
        unit: c.unit,
        note: 'Descriptive statistics is a toolkit tool (guide, p. 14); the guide gives no formula.',
      },
      meaning: `A typical figure is ${fmtNumber(exact, Number.isInteger(round(exact, 1)) ? 0 : 1)} ${c.unit}; the mean is pulled towards any unusually high or low value.`,
      slips: tidySlips(
        [
          { value: median, message: 'That is the median, the middle value. The mean adds every value and divides by how many there are.' },
          { value: sum / (n - 1), message: `That divides by ${n - 1}. Divide by the number of values, ${n}.` },
          { value: sum, message: 'That is the total. Divide it by the number of values.' },
        ],
        exact,
        0.01,
      ),
    };
  },
};

const medianKind: KindDef = {
  code: 'MDN',
  name: 'The median',
  group: 'toolkit',
  level: 'SL/HL',
  marks: 1,
  make: (r) => {
    for (let tries = 0; tries < 100; tries++) {
      const c = r.pick(STAT_CONTEXTS);
      const n = r.int(7, 10);
      const xs = drawValues(r, n, c.lo, c.hi);
      const sorted = [...xs].sort((a, b) => a - b);
      const exact = n % 2 ? (sorted[(n - 1) / 2] as number) : ((sorted[n / 2 - 1] as number) + (sorted[n / 2] as number)) / 2;
      const unsortedMid = n % 2 ? (xs[(n - 1) / 2] as number) : ((xs[n / 2 - 1] as number) + (xs[n / 2] as number)) / 2;
      if (unsortedMid === exact) continue;
      const mean = xs.reduce((s, x) => s + x, 0) / n;
      return {
        business: c.firm,
        intro: `The table shows ${poss(c.firm)} ${c.what}, in the order they happened.`,
        tables: [statTable(c, xs)],
        prompt: `Calculate the median number of ${c.unit}.`,
        unit: 'units',
        prefix: '',
        suffix: c.unit,
        example: '205',
        exact,
        answer: `${fmtNumber(exact, Number.isInteger(exact) ? 0 : 1)} ${c.unit}`,
        tolerance: 0.01,
        toleranceText: 'Accepted to two decimal places.',
        working: {
          given: [g('Values in order of time', xs.map(n0).join(', '))],
          formula: n % 2 ? 'Median = the middle value when the values are in order' : 'Median = the mean of the two middle values when the values are in order (an even number of values)',
          substitution: `In order: ${sorted.map(n0).join(', ')}`,
          steps: n % 2 ? [`The middle value is number ${(n + 1) / 2} of ${n}: ${n0(exact)}`] : [`The middle values are numbers ${n / 2} and ${n / 2 + 1}: ${n0(sorted[n / 2 - 1] as number)} and ${n0(sorted[n / 2] as number)}`, `(${n0(sorted[n / 2 - 1] as number)} + ${n0(sorted[n / 2] as number)}) ÷ 2 = ${fmtNumber(exact, 1)}`],
          answer: fmtNumber(exact, Number.isInteger(exact) ? 0 : 1),
          value: exact,
          unit: c.unit,
          note: 'Descriptive statistics is a toolkit tool (guide, p. 14).',
        },
        meaning: `Half the ${n % 2 ? 'other ' : ''}values are at or below ${fmtNumber(exact, Number.isInteger(exact) ? 0 : 1)} and half at or above; unlike the mean (${fmtNumber(mean, 1)} here), the median is not pulled by one extreme value.`,
        slips: tidySlips(
          [
            { value: unsortedMid, message: 'That is the middle of the list as given. Put the values in order first.' },
            { value: mean, message: 'That is the mean. The median is the middle value of the ordered list.' },
            ...(n % 2 ? [] : [{ value: sorted[n / 2 - 1] as number, message: 'With an even number of values there are two middle values: take the mean of both.' }, { value: sorted[n / 2] as number, message: 'With an even number of values there are two middle values: take the mean of both.' }]),
          ],
          exact,
          0.01,
        ),
      };
    }
    throw new Error('Could not draw values for the median');
  },
};

const iqrKind: KindDef = {
  code: 'IQR',
  name: 'Quartiles and the interquartile range',
  group: 'toolkit',
  level: 'SL/HL',
  marks: 2,
  make: (r) => {
    const c = r.pick(STAT_CONTEXTS);
    const n = r.pick([7, 11]);
    const xs = drawValues(r, n, c.lo, c.hi);
    const sorted = [...xs].sort((a, b) => a - b);
    const q1 = sorted[(n + 1) / 4 - 1] as number;
    const q3 = sorted[(3 * (n + 1)) / 4 - 1] as number;
    const exact = q3 - q1;
    return {
      business: c.firm,
      intro: `The table shows ${poss(c.firm)} ${c.what}. Use the (n + 1) ÷ 4 position for the lower quartile and 3(n + 1) ÷ 4 for the upper quartile.`,
      tables: [statTable(c, xs)],
      prompt: `Calculate the interquartile range of the ${c.unit}.`,
      unit: 'units',
      prefix: '',
      suffix: c.unit,
      example: '64',
      exact,
      answer: `${n0(exact)} ${c.unit} (upper quartile ${n0(q3)} − lower quartile ${n0(q1)})`,
      tolerance: 0,
      toleranceText: 'A whole number here, since both quartiles are values in the list.',
      working: {
        given: [g('Values', xs.map(n0).join(', ')), g('Number of values', String(n))],
        formula: 'Interquartile range = upper quartile − lower quartile; with n values in order, the lower quartile is value number (n + 1) ÷ 4 and the upper value number 3(n + 1) ÷ 4',
        substitution: `In order: ${sorted.map(n0).join(', ')}`,
        steps: [`Lower quartile: value number ${(n + 1) / 4} = ${n0(q1)}`, `Upper quartile: value number ${(3 * (n + 1)) / 4} = ${n0(q3)}`, `${n0(q3)} − ${n0(q1)} = ${n0(exact)}`],
        answer: n0(exact),
        value: exact,
        unit: c.unit,
        note: 'Descriptive statistics is a toolkit tool (guide, p. 14). Methods for quartiles differ; this question names its method.',
      },
      meaning: `The middle half of the values spans ${n0(exact)} ${c.unit}: a measure of spread that ignores the extremes, unlike the range of ${n0((sorted[n - 1] as number) - (sorted[0] as number))}.`,
      slips: tidySlips(
        [
          { value: (sorted[n - 1] as number) - (sorted[0] as number), message: 'That is the range, highest minus lowest. The interquartile range uses the quartiles.' },
          { value: (xs[(3 * (n + 1)) / 4 - 1] as number) - (xs[(n + 1) / 4 - 1] as number), message: 'Those are positions in the list as given. Put the values in order first.' },
          { value: q3, message: 'That is the upper quartile. Take away the lower quartile.' },
        ],
        exact,
        0,
      ),
    };
  },
};

const sdKind: KindDef = {
  code: 'SDV',
  name: 'Standard deviation',
  group: 'toolkit',
  level: 'SL/HL',
  marks: 2,
  make: (r) => {
    const c = r.pick(STAT_CONTEXTS);
    const n = r.int(5, 6);
    const xs = drawValues(r, n, c.lo, c.hi);
    const mean = xs.reduce((s, x) => s + x, 0) / n;
    const ss = xs.reduce((s, x) => s + (x - mean) ** 2, 0);
    const exact = Math.sqrt(ss / n);
    return {
      business: c.firm,
      intro: `The table shows ${poss(c.firm)} ${c.what}. Use the population standard deviation, dividing by the number of values (a calculator shows it as σx).`,
      tables: [statTable(c, xs)],
      prompt: `Calculate the standard deviation of the ${c.unit}.`,
      unit: 'units',
      prefix: '',
      suffix: c.unit,
      example: '18.42',
      exact,
      answer: `${n2(exact)} ${c.unit}`,
      tolerance: 0.05,
      toleranceText: 'Accepted within 0.05 of the exact value.',
      working: {
        given: [g('Values', xs.map(n0).join(', ')), g('Number of values', String(n))],
        formula: 'Standard deviation = √(Σ(x − mean)² ÷ n)',
        substitution: `Mean = ${n0(xs.reduce((s, x) => s + x, 0))} ÷ ${n} = ${fmtNumber(mean, 2)}`,
        steps: [`Squared differences from the mean: ${xs.map((x) => fmtNumber((x - mean) ** 2, 2)).join(', ')}`, `Their total = ${fmtNumber(ss, 2)}`, `√(${fmtNumber(ss, 2)} ÷ ${n}) = √${fmtNumber(ss / n, 2)} = ${n2(exact)}`],
        answer: n2(exact),
        value: exact,
        unit: c.unit,
        note: 'Descriptive statistics is a toolkit tool (guide, p. 14). The guide does not say which form to use; this question asks for the population form.',
      },
      meaning: `A typical value lies about ${fmtNumber(exact, 1)} ${c.unit} from the mean of ${fmtNumber(mean, 1)}: the larger the standard deviation, the less predictable the figures.`,
      slips: tidySlips(
        [
          { value: Math.sqrt(ss / (n - 1)), message: `That is the sample standard deviation, dividing by ${n - 1} (sx on a calculator). This question asks for the population form, dividing by ${n}.` },
          { value: ss / n, message: 'That is the variance. Take its square root for the standard deviation.' },
          { value: xs.reduce((s, x) => s + Math.abs(x - mean), 0) / n, message: 'That is the mean of the distances from the mean. The standard deviation squares them, averages, then takes the square root.' },
        ],
        exact,
        0.05,
      ),
    };
  },
};

/* ------------------------------------------------------------------ */
/* Toolkit (HL): contribution, critical path and regression            */
/* ------------------------------------------------------------------ */

const specialOrderKind: KindDef = {
  code: 'SPO',
  name: 'A special order, judged on contribution',
  group: 'toolkit-hl',
  level: 'HL',
  marks: 2,
  make: (r) => {
    for (let tries = 0; tries < 200; tries++) {
      const s = costScenario(r);
      const offer = round(s.V + (s.P - s.V) * r.step(-0.3, 0.7, 0.05), 2);
      const q = Math.round((s.Q * r.step(0.05, 0.3, 0.01)) / 10) * 10;
      const extra = r.chance(0.6) ? Math.round((q * s.P * r.step(0.02, 0.1, 0.01)) / 50) * 50 : 0;
      if (!(offer > 0) || q <= 0) continue;
      const exact = round(specialOrderGain(offer, s.V, q, extra), 2);
      if (Math.abs(exact) < 50) continue;
      const avgCost = s.V + s.F / s.Q;
      return {
        business: s.m.name,
        intro: `${s.m.name} sells ${s.m.units} at ${usd(s.P)}. Each costs ${usd(s.V)} in variable costs, and fixed costs are ${usd(s.F)} a year, already covered by regular sales of ${n0(s.Q)}. A retailer offers to buy ${n0(q)} extra ${s.m.units} at ${usd2(offer)} each.${extra ? ` The order would need special packaging costing ${usd(extra)} in total.` : ''} There is spare capacity, and regular customers would not hear of the price.`,
        tables: [list(`${s.m.name}: the special order (fictional, simulated figures)`, [[`Price offered per ${s.m.unit}`, usd2(offer)], [`Variable cost per ${s.m.unit}`, usd2(s.V)], ['Order size', `${n0(q)} ${s.m.units}`], ['Extra costs of the order', usd(extra)], [`Average cost per ${s.m.unit} at regular sales`, usd2(avgCost)]])],
        prompt: `Calculate the change in ${poss(s.m.name)} profit if it accepts the order. Enter a fall as a negative figure.`,
        unit: 'money',
        prefix: '$',
        suffix: '',
        example: exact < 0 ? '−1,200' : '4,800',
        exact,
        answer: usd(exact),
        tolerance: 0.5,
        toleranceText: 'Accepted to the nearest dollar. A fall in profit is negative.',
        working: {
          given: [g('Price offered', usd2(offer)), g('Variable cost', usd2(s.V)), g('Order size', n0(q)), g('Extra costs of the order', usd(extra))],
          formula: 'Change in profit = (price offered − variable cost per unit) × order size − extra costs caused by the order',
          substitution: `= (${usd2(offer)} − ${usd2(s.V)}) × ${n0(q)} − ${usd(extra)}`,
          steps: [`Contribution per unit = ${n2(offer)} − ${n2(s.V)} = ${n2(offer - s.V)}`, `${n2(offer - s.V)} × ${n0(q)} = ${n2((offer - s.V) * q)}`, `${n2((offer - s.V) * q)} − ${n0(extra)} = ${n2(exact)}`],
          answer: usd(exact),
          value: exact,
          unit: 'dollars, the change in profit',
          note: 'Contribution costing, part of the HL toolkit’s contribution tool (guide, p. 14). Fixed costs are left out because they do not change with the order.',
        },
        meaning:
          exact >= 0
            ? `Accepting adds ${usd(exact)} to profit${offer < avgCost ? `, even though ${usd2(offer)} is below the average cost of ${usd2(avgCost)}: the fixed costs are already paid` : ''}.`
            : `Accepting would cut profit by ${usd(-exact)}: the order does not cover its own variable and extra costs.`,
        slips: tidySlips(
          [
            { value: (offer - avgCost) * q - extra, message: 'That charges each unit its share of the fixed costs. They are already covered by regular sales and do not change with the order: judge it on contribution.' },
            { value: (offer - s.V) * q, message: 'The extra costs of the order were left out.' },
            { value: offer * q, message: 'That is the revenue from the order. Take away its variable and extra costs.' },
            { value: (s.P - s.V) * q - extra, message: `That uses the regular price of ${usd(s.P)}. The order is at the price offered.` },
          ],
          exact,
          0.5,
        ),
      };
    }
    throw new Error('Could not draw a special order');
  },
};

const absorptionKind: KindDef = {
  code: 'ABS',
  name: 'Full cost per unit by absorption costing',
  group: 'toolkit-hl',
  level: 'HL',
  marks: 3,
  make: (r) => {
    for (let tries = 0; tries < 200; tries++) {
      const firm = r.pick(['Pennick Furniture', 'Lowther Ceramics', 'Selsby Textiles', 'Greywater Pumps']);
      const products = r.pick([
        ['dining chairs', 'side tables', 'bookcases'],
        ['wall tiles', 'floor tiles', 'mosaic sheets'],
        ['shirts', 'jackets', 'scarves'],
        ['garden pumps', 'pond filters', 'fountain kits'],
      ] as const);
      const basis = r.pick(['direct labour hours', 'floor space (square metres)', 'machine hours']);
      const shares = products.map(() => r.int(2, 9) * (basis.startsWith('floor') ? 50 : 100));
      const overheads = r.step(30000, 240000, 1000);
      const i = r.int(0, 2);
      const units = Math.round(r.step(500, 8000, 50));
      const direct = r.step(4, 90, 0.5);
      const totalBase = shares.reduce((s, x) => s + x, 0);
      const allocated = (overheads * (shares[i] as number)) / totalBase;
      const exact = round(direct + allocated / units, 2);
      if (Math.abs(allocated / units - overheads / 3 / units) < 0.05) continue;
      const name = products[i] as string;
      return {
        business: firm,
        intro: `${firm} makes three products. Its indirect costs (overheads) of ${usd(overheads)} a year are shared between them by ${basis}. This year it plans to make ${n0(units)} ${name}, each with direct costs of ${usd2(direct)}.`,
        tables: [{ caption: `${firm}: the basis for sharing overheads (fictional, simulated figures)`, columns: ['', cap(basis)], rows: products.map((p, k2) => ({ label: cap(p), cells: [n0(shares[k2] as number)] })) }],
        prompt: `Calculate the full cost of one of the ${name} by absorption costing.`,
        unit: 'money',
        prefix: '$',
        suffix: 'each',
        example: '48.75',
        exact,
        answer: usd2(exact),
        tolerance: 0.01,
        toleranceText: 'Accepted to the nearest cent.',
        working: {
          given: [g('Overheads a year', usd(overheads)), g(`${cap(name)}: ${basis}`, `${n0(shares[i] as number)} of ${n0(totalBase)}`), g('Units planned', n0(units)), g('Direct cost per unit', usd2(direct))],
          formula: 'Full cost per unit = direct cost per unit + (overheads × the product’s share of the basis) ÷ units',
          substitution: `= ${usd2(direct)} + (${usd(overheads)} × ${n0(shares[i] as number)} ÷ ${n0(totalBase)}) ÷ ${n0(units)}`,
          steps: [`Overheads for the ${name} = ${n0(overheads)} × ${n0(shares[i] as number)} ÷ ${n0(totalBase)} = ${n2(allocated)}`, `Per unit = ${n2(allocated)} ÷ ${n0(units)} = ${fmtNumber(allocated / units, 4)}`, `${n2(direct)} + ${fmtNumber(allocated / units, 4)} = ${n2(exact)}`],
          answer: usd2(exact),
          value: exact,
          unit: 'dollars per unit',
          note: 'Absorption costing, part of the HL toolkit’s contribution tool (guide, p. 14). The basis is a choice: a different basis gives a different full cost.',
        },
        meaning: `Each of the ${name} carries ${usd2(allocated / units)} of overheads as well as its direct cost: a price below ${usd2(exact)} would not cover its full cost, though it could still make a contribution.`,
        slips: tidySlips(
          [
            { value: direct + overheads / 3 / units, message: 'The overheads were split equally between the three products. Share them by the basis given.' },
            { value: direct + allocated, message: 'The overheads for the product were not divided by the number of units.' },
            { value: direct, message: 'That is the direct cost only. Absorption costing adds a share of the overheads.' },
            { value: direct + overheads / units, message: 'All the overheads were charged to this product. It carries only its share.' },
          ],
          exact,
          0.01,
        ),
      };
    }
    throw new Error('Could not draw an absorption costing question');
  },
};

/** A small project for critical path analysis: a logical network of seven activities with drawn durations, and at least two activities with float. */
function drawNetwork(r: Rng): { project: string; acts: Activity[] } {
  const projects: Array<{ project: string; acts: Array<[string, string[]]> }> = [
    {
      project: 'to open a second café',
      acts: [
        ['Find a site', []],
        ['Sign the lease', ['A']],
        ['Design the interior', ['A']],
        ['Fit out the site', ['B', 'C']],
        ['Recruit staff', ['B']],
        ['Train staff', ['E']],
        ['Hold the launch event', ['D', 'F']],
      ],
    },
    {
      project: 'to launch an online shop',
      acts: [
        ['Plan the range', []],
        ['Photograph the range', ['A']],
        ['Choose a platform', ['A']],
        ['Build the site', ['C']],
        ['Write the product pages', ['B', 'D']],
        ['Set up payments', ['D']],
        ['Go live', ['E', 'F']],
      ],
    },
    {
      project: 'to move to a new warehouse',
      acts: [
        ['Sign the contract', []],
        ['Install racking', ['A']],
        ['Update the stock system', ['A']],
        ['Train the drivers', ['A']],
        ['Move the stock', ['B']],
        ['Run a trial week', ['C', 'E']],
        ['Open the warehouse', ['D', 'F']],
      ],
    },
  ];
  for (let tries = 0; tries < 300; tries++) {
    const p = r.pick(projects);
    const acts: Activity[] = p.acts.map(([label, after], i) => ({ id: 'ABCDEFG'.charAt(i), label, weeks: r.int(1, 8), after }));
    const sch = schedule(acts);
    if (sch.items.filter((x) => x.totalFloat > 0).length < 2) continue;
    return { project: p.project, acts };
  }
  throw new Error('Could not draw a network');
}

function networkTable(project: string, acts: Activity[]): Table {
  return {
    caption: `The plan ${project} (fictional, simulated figures)`,
    columns: ['', 'Activity', 'Duration (weeks)', 'Follows'],
    rows: acts.map((a) => ({ label: a.id, cells: [a.label, String(a.weeks), a.after.length ? a.after.join(', ') : 'none'] })),
  };
}

function floatKind(free: boolean): KindDef {
  return {
    code: free ? 'FFL' : 'TFL',
    name: free ? 'Free float on a critical path network' : 'Total float on a critical path network',
    group: 'toolkit-hl',
    level: 'HL',
    marks: 2,
    make: (r) => {
      for (let tries = 0; tries < 100; tries++) {
        const { project, acts } = drawNetwork(r);
        const sch = schedule(acts);
        const pool = sch.items.filter((i) => i.totalFloat > 0 && (free ? i.freeFloat !== i.totalFloat || r.chance(0.3) : true));
        if (!pool.length) continue;
        const t = r.pick(pool);
        const exact = free ? t.freeFloat : t.totalFloat;
        const next = sch.items.filter((i) => i.after.includes(t.id));
        const firm = r.pick(FIRMS);
        return {
          business: firm,
          intro: `${firm} is planning ${project}. The table lists the activities, how long each takes and which must finish before it can start. Drawing the network is not needed: work out the earliest and latest start of each activity.`,
          tables: [networkTable(project, acts)],
          prompt: `Calculate the ${free ? 'free' : 'total'} float of activity ${t.id} (${t.label.toLowerCase()}), in weeks.`,
          unit: 'units',
          prefix: '',
          suffix: 'weeks',
          example: '2',
          exact,
          answer: `${exact} ${plural(exact, 'week', 'weeks')}`,
          tolerance: 0,
          toleranceText: 'A whole number of weeks.',
          working: {
            given: acts.map((a) => g(`${a.id}: ${a.label}`, `${a.weeks} ${plural(a.weeks, 'week', 'weeks')}, after ${a.after.length ? a.after.join(' and ') : 'the start'}`)),
            formula: free
              ? 'Free float = earliest start of the next activity − earliest finish of this activity'
              : 'Total float = latest start − earliest start (or latest finish − duration − earliest start)',
            substitution: free
              ? `= ${next.length ? `${Math.min(...next.map((x) => x.es))} (the earliest start of ${next.map((x) => x.id).join(' or ')})` : `${sch.finish} (the end of the project)`} − ${t.ef}`
              : `= ${t.ls} − ${t.es}`,
            steps: [
              `Forward pass: ${sch.items.map((i) => `${i.id} ${i.es} to ${i.ef}`).join('; ')}. The project takes ${sch.finish} weeks.`,
              `Backward pass: ${sch.items.map((i) => `${i.id} latest ${i.ls} to ${i.lf}`).join('; ')}.`,
              `Critical path: ${sch.path.join(', ')}.`,
              free ? `Free float of ${t.id} = ${next.length ? Math.min(...next.map((x) => x.es)) : sch.finish} − ${t.ef} = ${exact}` : `Total float of ${t.id} = ${t.ls} − ${t.es} = ${exact}`,
            ],
            answer: `${exact} ${plural(exact, 'week', 'weeks')}`,
            value: exact,
            unit: 'weeks',
            note: 'Critical path analysis is an HL toolkit tool; the guide expects the critical path and the free and total float to be worked out, not the network drawn (p. 14).',
          },
          meaning: free
            ? `Activity ${t.id} can slip ${exact} ${plural(exact, 'week', 'weeks')} without delaying the earliest start of anything after it.`
            : `Activity ${t.id} can slip ${exact} ${plural(exact, 'week', 'weeks')} without delaying the whole project, which takes ${sch.finish} weeks.`,
          slips: tidySlips(
            [
              { value: free ? t.totalFloat : t.freeFloat, message: free ? 'That is the total float: how long it can slip before the project is late. Free float is how long before the next activity is delayed.' : 'That is the free float. Total float is how long it can slip before the whole project is late: latest start minus earliest start.' },
              { value: t.es, message: 'That is the earliest start. Float is the gap between the latest and the earliest start.' },
              { value: t.ls, message: 'That is the latest start. Take away the earliest start.' },
              { value: sch.finish - t.weeks, message: 'That takes the duration from the length of the project. Use the latest and earliest starts.' },
            ],
            exact,
            0,
          ),
        };
      }
      throw new Error('Could not draw an activity with float');
    },
  };
}

const regressionKind: KindDef = {
  code: 'REG',
  name: 'A forecast from a line of best fit',
  group: 'toolkit-hl',
  level: 'HL',
  marks: 2,
  make: (r) => {
    let firm = '';
    let a = 0;
    let b = 0;
    let n = 0;
    let x = 0;
    for (let tries = 0; tries < 100 && !(a + b * x > 0 && a + b * n > 0); tries++) {
      firm = r.pick(['Ambleway Cafés', 'Cresswell Gyms', 'Elmsworth Books', 'Oxlade Travel', 'Brackenfold Bakery']);
      a = r.step(200, 4000, 10);
      b = r.step(5, 180, 1) * (r.chance(0.8) ? 1 : -1);
      n = r.int(6, 10);
      x = n + r.int(2, 6);
    }
    const exact = a + b * x;
    if (!(exact > 0)) throw new Error('Could not draw a trend');
    const points = Array.from({ length: n }, (_, i) => Math.max(1, Math.round(a + b * (i + 1) + r.int(-1, 1) * Math.abs(b) * r.step(0.2, 0.9, 0.1))));
    return {
      business: firm,
      intro: `${firm} has plotted its sales for the last ${n} months on a scatter diagram, with the month number (1 to ${n}) as x, and found the line of best fit y = ${fmtNumber(a, 0)} ${b >= 0 ? '+' : '−'} ${fmtNumber(Math.abs(b), 0)}x, where y is sales in units.`,
      tables: [{ caption: `${firm}: monthly sales (fictional, simulated figures)`, columns: ['', ...points.map((_, i) => String(i + 1))], rows: [{ label: 'Units sold', cells: points.map((p) => n0(p)) }] }],
      prompt: `Use the line of best fit to forecast sales in month ${x}.`,
      unit: 'units',
      prefix: '',
      suffix: 'units',
      example: '2,450',
      exact,
      answer: `${n0(exact)} units`,
      tolerance: 0.5,
      toleranceText: 'Accepted to the nearest unit.',
      working: {
        given: [g('Line of best fit', `y = ${fmtNumber(a, 0)} ${b >= 0 ? '+' : '−'} ${fmtNumber(Math.abs(b), 0)}x`), g('Month to forecast', String(x))],
        formula: 'y = a + bx, with x the month number',
        substitution: `= ${fmtNumber(a, 0)} ${b >= 0 ? '+' : '−'} ${fmtNumber(Math.abs(b), 0)} × ${x}`,
        steps: [`${fmtNumber(b, 0)} × ${x} = ${fmtNumber(b * x, 0)}`, `${fmtNumber(a, 0)} + (${fmtNumber(b * x, 0)}) = ${n0(exact)}`],
        answer: `${n0(exact)} units`,
        value: exact,
        unit: 'units in the month',
        note: 'Simple linear regression is an HL toolkit tool (guide, p. 14); y = a + bx is the standard equation of a straight line, not on the formulae sheet.',
      },
      meaning: `Month ${x} lies beyond the data, so this is extrapolation: it assumes the trend of the last ${n} months simply continues, which a new rival or a change in season could break.`,
      slips: tidySlips(
        [
          { value: a + b * n, message: `That is the line's value at month ${n}, the last month of data. Put in x = ${x}.` },
          { value: b * x, message: 'The intercept a was left out.' },
          { value: a + b * (x - n), message: `That counts ${x - n} months from the end of the data. x is the month number itself, counted from month 1.` },
        ],
        exact,
        0.5,
      ),
    };
  },
};

/* ------------------------------------------------------------------ */
/* Reading data: a break-even chart (5.5) and a stock control chart    */
/* (5.6, HL)                                                           */
/* ------------------------------------------------------------------ */

const readBreakEven: KindDef = {
  code: 'RBE',
  name: 'Read a break-even chart',
  group: 'break-even',
  level: 'SL/HL',
  marks: 2,
  task: 'read',
  make: (r) => {
    for (let tries = 0; tries < 300; tries++) {
      const m = r.pick(WORKS);
      const xstep = r.pick([100, 200, 250, 500, 1000]);
      const beq = xstep * r.int(2, 5);
      const c = r.pick([5, 8, 10, 12, 15, 20, 25, 40, 50]);
      const P = c * r.pick([2, 2.5, 3, 4]);
      const V = P - c;
      const F = beq * c;
      const Q = beq + xstep * r.int(1, 3);
      const xmax = Math.max(Q, beq) + xstep * 2;
      const ymaxRaw = P * xmax;
      const ystep = [1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000, 100000].find((s) => ymaxRaw / s <= 8) ?? 100000;
      const ymax = Math.ceil(ymaxRaw / ystep) * ystep;
      const ask = r.pick(['beq', 'mos', 'revenue'] as const);
      const exact = ask === 'beq' ? beq : ask === 'mos' ? Q - beq : beq * P;
      if (ask === 'revenue' && (beq * P) % ystep !== 0) continue;
      const series: Series[] = [
        { tone: 'fixed', label: 'Fixed costs', points: [[0, F], [xmax, F]], dashed: true },
        { tone: 'cost', label: 'Total costs', points: [[0, F], [xmax, F + V * xmax]] },
        { tone: 'revenue', label: 'Total revenue', points: [[0, 0], [xmax, P * xmax]] },
      ];
      const id = `rbe-${beq}-${Q}`;
      const svg = lineChartSvg({
        id,
        title: `${m.name}: break-even chart`,
        desc: `Fixed costs are $${fmtNumber(F)} at every output. Total costs rise in a straight line from $${fmtNumber(F)} at zero to $${fmtNumber(F + V * xmax)} at ${fmtNumber(xmax)} ${m.units}. Total revenue rises from zero to $${fmtNumber(P * xmax)} at ${fmtNumber(xmax)} ${m.units}. A dashed line marks the forecast output of ${fmtNumber(Q)}. The table below the chart gives the same figures.`,
        x: { max: xmax, step: xstep, label: `Output (${m.units} a month)` },
        y: { max: ymax, step: ystep, label: 'Costs and revenue ($)' },
        series,
        markers: [{ at: Q, axis: 'x', label: `Forecast ${fmtNumber(Q)}` }],
        yFmt: (v) => fmtNumber(v),
      });
      const outs = Array.from({ length: xmax / xstep + 1 }, (_, i) => i * xstep);
      const prompt =
        ask === 'beq'
          ? `Using the chart, state the break-even quantity.`
          : ask === 'mos'
            ? `Using the chart, state the margin of safety at the forecast output, in ${m.units}.`
            : `Using the chart, state the break-even revenue.`;
      return {
        business: m.name,
        intro: `The chart shows ${poss(m.name)} fixed costs, total costs and total revenue for a month. The forecast output is marked.`,
        tables: [{ caption: `${m.name}: the chart's figures ($ a month, fictional, simulated)`, columns: ['', ...outs.map((o) => n0(o))], rows: [{ label: 'Total costs', cells: outs.map((o) => n0(F + V * o)) }, { label: 'Total revenue', cells: outs.map((o) => n0(P * o)) }] }],
        figure: { svg, caption: `${m.name}: break-even chart. Output is on the horizontal axis and dollars on the vertical axis.` },
        prompt,
        unit: ask === 'revenue' ? 'money' : 'units',
        prefix: ask === 'revenue' ? '$' : '',
        suffix: ask === 'revenue' ? '' : m.units,
        example: ask === 'revenue' ? '60,000' : '400',
        exact,
        answer: ask === 'revenue' ? usd(exact) : `${n0(exact)} ${m.units}`,
        tolerance: ask === 'revenue' ? ystep / 4 : xstep / 4,
        toleranceText: ask === 'revenue' ? `Accepted within $${fmtNumber(ystep / 4)}, a quarter of a gridline: a chart is read to the nearest line.` : `Accepted within ${fmtNumber(xstep / 4)} ${m.units}, a quarter of a gridline: a chart is read to the nearest line.`,
        working: {
          given: [g('Where the lines cross', `${n0(beq)} ${m.units}, $${fmtNumber(beq * P)}`), g('Forecast output', `${n0(Q)} ${m.units}`)],
          formula: ask === 'beq' ? 'Break-even is where total revenue meets total costs: read down to the output axis' : ask === 'mos' ? 'Margin of safety = forecast output − break-even quantity, both read from the output axis' : 'Break-even revenue is where the lines cross: read across to the dollar axis',
          substitution: ask === 'mos' ? `= ${n0(Q)} − ${n0(beq)}` : `The lines cross at ${n0(beq)} ${m.units} and $${fmtNumber(beq * P)}`,
          steps: [`Check by calculation: ${usd(F)} ÷ (${usd(P)} − ${usd(V)}) = ${n0(beq)} ${m.units}`, ask === 'mos' ? `${n0(Q)} − ${n0(beq)} = ${n0(Q - beq)}` : ask === 'revenue' ? `${n0(beq)} × ${usd(P)} = ${usd(beq * P)}` : `Break-even quantity = ${n0(beq)}`],
          answer: ask === 'revenue' ? usd(exact) : `${n0(exact)} ${m.units}`,
          value: exact,
          unit: ask === 'revenue' ? 'dollars a month' : `${m.units} a month`,
        },
        meaning: `${m.name} breaks even at ${n0(beq)} ${m.units} a month; at the forecast of ${n0(Q)} it has a margin of safety of ${n0(Q - beq)} ${m.units}.`,
        slips: tidySlips(
          [
            { value: ask === 'mos' ? beq : Q - beq, message: ask === 'mos' ? 'That is the break-even quantity. The margin of safety is the gap between it and the forecast.' : 'That is the margin of safety, the gap to the forecast. The question asks for the break-even point itself.' },
            { value: ask === 'revenue' ? beq : beq * P, message: ask === 'revenue' ? 'That is the output at break-even. Read across to the dollar axis for the revenue.' : 'That is the revenue at break-even. Read down to the output axis for the quantity.' },
            { value: F, message: 'That is the fixed costs line. Break-even is where total revenue meets total costs, not fixed costs.' },
            { value: ask === 'mos' ? Q : F / P, message: ask === 'mos' ? 'That is the forecast output. Take away the break-even quantity.' : 'That is where total revenue meets the fixed costs line. Use the total costs line.' },
          ],
          exact,
          ask === 'revenue' ? ystep / 4 : xstep / 4,
        ),
      };
    }
    throw new Error('Could not draw a break-even chart');
  },
};

const readStockChart: KindDef = {
  code: 'RSC',
  name: 'Read a stock control chart',
  group: 'operations',
  level: 'HL',
  marks: 2,
  task: 'read',
  make: (r) => {
    const w = r.pick(WORKS);
    const usage = r.pick([50, 100, 150, 200, 250, 300]);
    const lead = r.int(1, 3);
    const buffer = usage * r.int(1, 2);
    const qty = usage * r.int(3, 6);
    const max = buffer + qty;
    const rol = reorderLevel({ buffer, usage, leadTime: lead });
    const cycle = qty / usage;
    const weeks = cycle * 3;
    const pts: Array<[number, number]> = [];
    for (let c2 = 0; c2 < 3; c2++) {
      pts.push([c2 * cycle, max]);
      pts.push([(c2 + 1) * cycle, buffer]);
    }
    const ask = r.pick(['lead', 'rol', 'qty', 'buffer'] as const);
    const exact = ask === 'lead' ? lead : ask === 'rol' ? rol : ask === 'qty' ? qty : buffer;
    const ystep = usage;
    const ymax = Math.ceil((max * 1.15) / ystep) * ystep;
    const svg = lineChartSvg({
      id: `rsc-${max}-${lead}`,
      title: `${w.name}: stock control chart`,
      desc: `Stock starts at ${fmtNumber(max)} units and falls by ${fmtNumber(usage)} a week to ${fmtNumber(buffer)}, when a delivery lifts it back to ${fmtNumber(max)}; the pattern repeats every ${fmtNumber(cycle)} weeks. A line marks the reorder level at ${fmtNumber(rol)} units and another the buffer stock at ${fmtNumber(buffer)} units. Orders are placed when stock falls to the reorder level, ${fmtNumber(lead)} ${plural(lead, 'week', 'weeks')} before each delivery. The table below the chart gives the stock at the end of each week.`,
      x: { max: weeks, step: Math.max(1, Math.round(cycle / 3)), label: 'Weeks' },
      y: { max: ymax, step: ystep, label: 'Units of stock' },
      series: [{ tone: 'stock', label: 'Stock level', points: pts }],
      markers: [
        { at: rol, axis: 'y', label: `Reorder level` },
        { at: buffer, axis: 'y', label: 'Buffer stock' },
        { at: cycle - lead, axis: 'x', label: 'Order placed' },
      ],
    });
    // At the end of each week: the stock before any delivery, then the delivery that lifts it back to the maximum.
    const before = Array.from({ length: weeks }, (_, i) => max - ((i % cycle) + 1) * usage);
    const delivered = Array.from({ length: weeks }, (_, i) => ((i + 1) % cycle === 0 ? qty : 0));
    const prompt =
      ask === 'lead' ? 'Using the chart, state the lead time, in weeks.' : ask === 'rol' ? 'Using the chart, state the reorder level.' : ask === 'qty' ? 'Using the chart, state the reorder quantity.' : 'Using the chart, state the buffer stock.';
    return {
      business: w.name,
      intro: `The chart shows the stock of a raw material at ${w.name}. Stock is used at a steady rate, an order is placed when stock reaches the reorder level, and each delivery arrives as stock reaches the buffer.`,
      tables: [
        {
          caption: `${w.name}: stock at the end of each week, starting from ${n0(max)} units in week 0 (units, fictional, simulated)`,
          columns: ['', ...before.map((_, i) => `Week ${i + 1}`)],
          rows: [
            { label: 'Stock before any delivery', cells: before.map((x) => n0(x)) },
            { label: 'Delivery received', cells: delivered.map((x) => (x ? n0(x) : '0')) },
          ],
        },
      ],
      figure: { svg, caption: `${w.name}: stock control chart. Weeks are on the horizontal axis and units of stock on the vertical axis.` },
      prompt,
      unit: 'units',
      prefix: '',
      suffix: ask === 'lead' ? 'weeks' : 'units',
      example: ask === 'lead' ? '2' : '600',
      exact,
      answer: ask === 'lead' ? `${lead} ${plural(lead, 'week', 'weeks')}` : `${n0(exact)} units`,
      tolerance: 0,
      toleranceText: ask === 'lead' ? 'A whole number of weeks.' : 'A whole number of units, read from the gridlines.',
      working: {
        given: [g('Maximum stock', n0(max)), g('Buffer stock', n0(buffer)), g('Reorder level', n0(rol)), g('Usage', `${n0(usage)} a week`)],
        formula:
          ask === 'lead'
            ? 'Lead time = the time from placing an order (stock at the reorder level) to the delivery (stock at the buffer)'
            : ask === 'rol'
              ? 'The reorder level is the level at which an order is placed'
              : ask === 'qty'
                ? 'Reorder quantity = the size of each delivery = maximum stock − buffer stock'
                : 'Buffer stock = the lowest level stock is planned to reach',
        substitution: ask === 'lead' ? `= (${n0(rol)} − ${n0(buffer)}) ÷ ${n0(usage)} a week` : ask === 'qty' ? `= ${n0(max)} − ${n0(buffer)}` : `Read from the chart: ${n0(exact)} units`,
        steps: ask === 'lead' ? [`${n0(rol - buffer)} ÷ ${n0(usage)} = ${lead}`] : ask === 'qty' ? [`${n0(max)} − ${n0(buffer)} = ${n0(qty)}`] : [`${n0(exact)} units`],
        answer: ask === 'lead' ? `${lead} ${plural(lead, 'week', 'weeks')}` : `${n0(exact)} units`,
        value: exact,
        unit: ask === 'lead' ? 'weeks' : 'units',
        note: 'Stock control charts are in 5.6 (HL); the guide gives no formula.',
      },
      meaning: `Orders go out at ${n0(rol)} units and arrive ${lead} ${plural(lead, 'week', 'weeks')} later, as stock reaches the buffer of ${n0(buffer)}; each delivery of ${n0(qty)} units restores the maximum of ${n0(max)}.`,
      slips: tidySlips(
        [
          { value: ask === 'qty' ? max : qty, message: ask === 'qty' ? 'That is the maximum stock level. The reorder quantity is the size of each delivery.' : 'That is the reorder quantity, the size of each delivery.' },
          { value: ask === 'rol' ? buffer : rol, message: ask === 'rol' ? 'That is the buffer stock, the lowest planned level. The reorder level is where the order is placed.' : 'That is the reorder level, where the order is placed.' },
          { value: ask === 'lead' ? cycle : max, message: ask === 'lead' ? 'That is the time between deliveries. The lead time is from the order to its delivery.' : 'That is the maximum stock level.' },
          { value: ask === 'buffer' ? 0 : -1, message: 'The buffer is the stock kept in reserve: the lowest point of the chart, not zero.' },
        ].filter((s) => s.value >= 0),
        exact,
        0,
      ),
    };
  },
};

/** The new numeric kinds, by id, in the order the page lists them. */
export const MORE_KINDS: Array<[string, KindDef]> = [
  ['break-even-change', breakEvenChange],
  ['read-break-even-chart', readBreakEven],
  ['retained-profit', retainedProfit],
  ['net-assets', netAssets],
  ['straight-line-depreciation', straightLine],
  ['net-book-value', netBookValue],
  ['units-of-production-depreciation', unitsOfProduction],
  ['budget-variance', budgetVariance],
  ['market-share', marketShareKind],
  ['market-growth', marketGrowthKind],
  ['price-elasticity', elasticity],
  ['labour-turnover', labourTurnoverKind],
  ['capacity-utilization', capacityKind],
  ['productivity-rate', productivityRate],
  ['defect-rate', defectRate],
  ['labour-productivity', labourProductivity],
  ['capital-productivity', capitalProductivity],
  ['operating-leverage', operatingLeverageKind],
  ['make-or-buy', makeOrBuy],
  ['reorder-level', reorderLevelKind],
  ['reorder-quantity', reorderQuantityKind],
  ['read-stock-chart', readStockChart],
  ['expected-value', expectedValueKind],
  ['mean', meanKind],
  ['median', medianKind],
  ['interquartile-range', iqrKind],
  ['standard-deviation', sdKind],
  ['special-order', specialOrderKind],
  ['absorption-cost', absorptionKind],
  ['total-float', floatKind(false)],
  ['free-float', floatKind(true)],
  ['regression-forecast', regressionKind],
];
