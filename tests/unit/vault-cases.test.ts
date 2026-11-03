/**
 * Recomputes the figures in the Case Vault's cases with the platform's own
 * finance functions (src/lib/ratios.ts, investment.ts, finance.ts, market.ts),
 * so that an exhibit, a worked answer or a debrief can never drift from the
 * evidence it claims to come from. scripts/qa/case-figures.py checks every
 * figure in each case's text as well; these tests check the calculations a
 * student would do, with the code the calculators use.
 */
import { describe, expect, it } from 'vitest';
import { acidTestRatio, balances, creditorDays, currentRatio, derive, gearingRatio, grossProfitMargin, profitMargin, roce, stockTurnoverDays, type Statement } from '../../src/lib/ratios';
import { arr, npv, payback, type Project } from '../../src/lib/investment';
import type { Exhibit } from '../../src/lib/schemas';
import { loadCorpus } from './helpers/corpus';

const c = loadCorpus();
const r1 = (v: number | null) => Math.round(((v ?? NaN) + Number.EPSILON) * 10) / 10;
const r2 = (v: number | null) => Math.round(((v ?? NaN) + Number.EPSILON) * 100) / 100;

function exhibit(caseId: string, id: string): Exhibit {
  const e = c.cases[caseId]?.exhibits.find((x) => x.id === id);
  if (!e) throw new Error(`${caseId} ${id} missing`);
  return e;
}
/** A table row's numeric cells, by the row's first cell. */
function row(e: Exhibit, label: string): number[] {
  const r = e.rows?.find((x) => String(x[0]) === label);
  if (!r) throw new Error(`${e.id}: no row "${label}"`);
  return r.slice(1).map((v) => (typeof v === 'number' ? v : NaN));
}
const text = (caseId: string) => JSON.stringify(c.cases[caseId]);
const question = (caseId: string, qid: string) => {
  const q = c.cases[caseId]?.analysisQuestions.find((x) => x.id === qid);
  if (!q) throw new Error(`${caseId}: no question ${qid}`);
  return `${q.answer ?? ''} ${q.guidance}`;
};

describe('Bellbird Home and Garden', () => {
  const id = 'bellbird-home-and-garden';
  const pl = exhibit(id, 'ex-1');
  const fp = exhibit(id, 'ex-2');
  const statement = (k: 0 | 1): Statement => ({
    salesRevenue: row(pl, 'Sales revenue')[k] ?? NaN,
    costOfSales: row(pl, 'Cost of sales')[k] ?? NaN,
    expenses: row(pl, 'Expenses')[k] ?? NaN,
    interest: row(pl, 'Interest')[k] ?? NaN,
    tax: row(pl, 'Tax')[k] ?? NaN,
    dividends: row(pl, 'Dividends')[k] ?? NaN,
    propertyPlantEquipment: row(fp, 'Property, plant and equipment')[k] ?? NaN,
    accumulatedDepreciation: row(fp, 'Less accumulated depreciation')[k] ?? NaN,
    cash: row(fp, 'Cash')[k] ?? NaN,
    debtors: row(fp, 'Debtors')[k] ?? NaN,
    stock: row(fp, 'Stock')[k] ?? NaN,
    bankOverdraft: row(fp, 'Bank overdraft')[k] ?? NaN,
    tradeCreditors: row(fp, 'Trade creditors')[k] ?? NaN,
    otherShortTermLoans: row(fp, 'Other short-term loans')[k] ?? NaN,
    longTermBorrowings: row(fp, 'Long-term borrowings')[k] ?? NaN,
    shareCapital: row(fp, 'Share capital')[k] ?? NaN,
    retainedEarnings: row(fp, 'Retained earnings')[k] ?? NaN,
  });
  const s25 = statement(0);
  const s26 = statement(1);

  it('has statements that balance, add up and link the two years', () => {
    for (const s of [s25, s26]) expect(balances(s)).toBe(true);
    const d26 = derive(s26);
    expect(d26.grossProfit).toBe(row(pl, 'Gross profit')[1]);
    expect(d26.pbit).toBe(row(pl, 'Profit before interest and tax')[1]);
    expect(d26.retainedProfit).toBe(row(pl, 'Retained profit')[1]);
    expect(d26.currentAssets).toBe(row(fp, 'Current assets')[1]);
    expect(d26.totalEquity).toBe(row(fp, 'Total equity')[1]);
    expect(s25.retainedEarnings + d26.retainedProfit).toBe(s26.retainedEarnings);
  });

  it('gives the ratios the answers and the analysis quote', () => {
    const ratios = (s: Statement, openingStock: number) => {
      const d = derive(s);
      return {
        gpm: r1(grossProfitMargin(d.grossProfit, s.salesRevenue)),
        pm: r1(profitMargin(d.pbit, s.salesRevenue)),
        roce: r1(roce(d.pbit, d.nonCurrentLiabilities, d.totalEquity)),
        current: r2(currentRatio(d.currentAssets, d.currentLiabilities)),
        acid: r2(acidTestRatio(d.currentAssets, s.stock, d.currentLiabilities)),
        stockDays: r1(stockTurnoverDays(s.costOfSales, openingStock, s.stock)),
        creditorDays: r1(creditorDays(s.tradeCreditors, s.costOfSales)),
        gearing: r1(gearingRatio(d.nonCurrentLiabilities, d.totalEquity)),
      };
    };
    const a = ratios(s25, 2900);
    const b = ratios(s26, s25.stock);
    expect(a).toEqual({ gpm: 35, pm: 5, roce: 14.7, current: 1.6, acid: 0.39, stockDays: 92.3, creditorDays: 60.4, gearing: 24 });
    expect(b).toEqual({ gpm: 33, pm: 2, roce: 5.7, current: 1.18, acid: 0.16, stockDays: 102.7, creditorDays: 75.7, gearing: 35 });
    expect(question(id, 'bb-ratios')).toContain('= 1.60');
    expect(question(id, 'bb-ratios')).toContain('= 1.18');
    expect(question(id, 'bb-ratios')).toContain('= 0.39');
    expect(question(id, 'bb-ratios')).toContain('= 0.16');
    expect(question(id, 'bb-efficiency')).toContain('= 102.7 days');
    expect(question(id, 'bb-efficiency')).toContain('= 75.7 days');
    expect(question(id, 'bb-efficiency')).toContain('92.3 days and 60.4 days');
  });

  it('carries the forecast month to month, and each option adds its own cash flows', () => {
    const cf = exhibit(id, 'ex-3');
    const opening = row(cf, 'Opening balance');
    const net = row(cf, 'Net cash flow');
    const closing = row(cf, 'Closing balance');
    expect(opening[0]).toBe(-s26.bankOverdraft);
    net.forEach((n, m) => {
      expect(n, `month ${m + 1}`).toBe((row(cf, 'Total cash inflows')[m] ?? 0) - (row(cf, 'Total cash outflows')[m] ?? 0));
      expect(closing[m], `month ${m + 1}`).toBe((opening[m] ?? 0) + n);
      if (m > 0) expect(opening[m]).toBe(closing[m - 1]);
    });
    const options = exhibit(id, 'ex-6');
    expect(row(options, 'No action').slice(0, 6)).toEqual(closing);
    // The package: +500 in August, +300 and +600 in September, −300 in November and December.
    const pack = row(options, 'Working capital package');
    expect(pack.slice(0, 6)).toEqual(closing.map((x, m) => x + [0, 500, 1400, 1400, 1100, 800][m]!));
    expect(Math.min(...pack.slice(0, 6))).toBe(-1380);
    // Closing Coralwood saves 16 a month, plus 140 of purchases for three months, after 240 of closure costs.
    const shut = row(options, 'Close Coralwood');
    expect(-170 + 119 + 40 + 27).toBe(16);
    expect(Math.min(...shut.slice(0, 6))).toBe(-2364);
    expect(text(id)).toContain('A$2,364k overdrawn in September');
  });
});

describe('Quintanilla Autopartes', () => {
  const id = 'quintanilla-autopartes';
  const flows = exhibit(id, 'ex-3');
  const project = (col: 1 | 2 | 3, label: string): Project => {
    const cells = (flows.rows ?? []).map((r) => r[col]);
    const [cost, ...rest] = cells;
    return { id: label, label, capitalCost: -(cost as number), returns: rest.filter((x): x is number => typeof x === 'number') };
  };
  const A = project(1, 'A');
  const B = project(2, 'B');
  const C = project(3, 'C');
  const months = (p: Project) => {
    const pb = payback(p);
    if (!pb) throw new Error('no payback');
    return `${pb.years} years ${r1(pb.months)} months`;
  };

  it('ranks the projects differently by payback, ARR and NPV, with the guide’s factors', () => {
    expect([months(A), months(B), months(C)]).toEqual(['4 years 10.7 months', '3 years 5.1 months', '5 years 4.6 months']);
    expect([r1(arr(A)), r1(arr(B)), r1(arr(C))]).toEqual([10.7, 6.1, 7.1]);
    expect([r1(npv(A, 10)), r1(npv(B, 10)), r1(npv(C, 10))]).toEqual([30, 4.6, 1.3]);
    expect(question(id, 'qa-payback')).toContain('4 years 10.7 months');
    expect(question(id, 'qa-payback')).toContain('3 years 5.1 months');
    expect(question(id, 'qa-arr')).toContain('= 10.7%');
    expect(question(id, 'qa-arr')).toContain('= 7.1%');
  });

  it('shows how far Project A depends on the forecast volumes', () => {
    const low: Project = { ...A, returns: A.returns.map((r) => r * 0.7) };
    expect(r1(npv(low, 10))).toBe(-33);
    expect(question(id, 'qa-npv')).toContain('MX$209.95m');
    expect(question(id, 'qa-npv')).toContain('−MX$33.0m');
    const pv = (npv(A, 10) ?? 0) + A.capitalCost;
    // The shortfall at which NPV is zero, and the expected NPV on the board's 60:40 view.
    expect(Math.round((1 - A.capitalCost / pv) * 100)).toBe(14);
    expect(r1(0.6 * (npv(A, 10) ?? 0) + 0.4 * (npv(low, 10) ?? 0))).toBe(4.8);
    expect(text(id)).toContain('about MX$4.8m');
  });
});
