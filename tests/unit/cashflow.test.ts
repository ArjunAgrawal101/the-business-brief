/**
 * The cash flow forecast for Atelier Barro, November to April, checked against
 * figures worked by hand from the case's cost ledger (Exhibit 1) and the
 * scenario in src/content/interactives/finance-cashflow-atelier.yaml.
 */
import { describe, expect, it } from 'vitest';
import { bracket, forecast, readForecast, type CashFlowScenario, type FinanceOption, type Measure } from '../../src/lib/cashflow';
import { loadCorpus } from './helpers/corpus';

const ix = loadCorpus().interactives['finance-cashflow-atelier'];
if (!ix || ix.component !== 'cash-flow-lab') throw new Error('The cash flow lab is missing');
const S: CashFlowScenario = ix.scenario;
const fin = (id: string) => ix.finance.find((f) => f.id === id) as FinanceOption;
const mes = (...ids: string[]) => ix.measures.filter((m) => ids.includes(m.id)) as Measure[];
const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;

describe('the forecast in the guide layout', () => {
  const f = forecast(S, fin('buy'));

  it('works November line by line', () => {
    // Mugs made: 830 for the shop and website + 300 for the hotel = 1,130.
    const out = Object.fromEntries(f.outflows.map((l) => [l.id, l.values[0]]));
    expect(f.inflows.find((l) => l.id === 'sales')?.values[0]).toBe(18260); // 830 x 22
    expect(f.inflows.find((l) => l.id === 'order')?.values[0]).toBe(0); // invoiced, paid in January
    expect(out.piece).toBe(2712); // 1,130 x 2.40
    expect(out.materials).toBe(2599); // 1,130 x 2.30
    expect(out.electricity).toBe(1187.5); // 340 + 1,130 x 0.75
    expect(out.packaging).toBe(825.5); // 830 x 0.85 + 300 x 0.40
    expect(out.fees).toBe(730.4); // 4% of 18,260
    expect(out.setup).toBe(150);
    expect(f.totalOut[0]).toBe(16004.4);
    expect(f.net[0]).toBe(2255.6);
    expect(f.closing[0]).toBe(3755.6); // 1,500 + 2,255.60
  });

  it('carries each closing balance into the next month', () => {
    f.closing.slice(0, -1).forEach((v, i) => expect(f.opening[i + 1]).toBe(v));
    expect(f.closing).toEqual([3755.6, 10732, -5290.8, -6020.8, -5268.8, -3924]);
  });

  it('receives the hotel payment and pays for the kiln in January', () => {
    expect(f.inflows.find((l) => l.id === 'order')?.values[2]).toBe(3300);
    expect(f.outflows.find((l) => l.id === 'investment')?.values[2]).toBe(18000);
    expect(f.totalIn[2]).toBe(13420); // 460 x 22 + 3,300
    expect(f.totalOut[2]).toBe(29442.8);
  });

  it('flags the months beyond the overdraft limit', () => {
    expect(f.status).toEqual(['credit', 'credit', 'beyond', 'beyond', 'beyond', 'beyond']);
    expect(f.firstBeyond).toBe(2);
    expect(f.lowest).toEqual({ value: -6020.8, month: 3 });
    expect(readForecast(f, '€').headline).toContain('January');
  });

  it('shows a profit while cash falls, and reconciles the two exactly', () => {
    expect(sum(f.totalIn)).toBe(92400);
    expect(sum(f.totalOut)).toBe(97824);
    expect(f.netCash).toBe(-5424);
    // Revenue 92,400; expenses 80,424, including 4 months' depreciation of 18,000 / 10 / 12 = 150.
    expect(f.profit.total).toBe(11976);
    expect(f.reconciliation.map((r) => r.value)).toEqual([-18000, 600]);
    expect(sum([f.profit.total, ...f.reconciliation.map((r) => r.value)])).toBe(f.netCash);
  });
});

describe('paying for the second kiln', () => {
  it('leasing keeps the balance in credit at a lower profit', () => {
    const f = forecast(S, fin('lease'));
    expect(f.closing).toEqual([3755.6, 10732, 12189.2, 10939.2, 11171.2, 11996]);
    expect(f.status.every((x) => x === 'credit')).toBe(true);
    expect(f.profit.total).toBe(10496); // 11,976 + 600 depreciation - 4 x 520 lease
  });

  it('a loan matches long-term finance to a long-term asset', () => {
    const f = forecast(S, fin('loan'));
    expect(f.closing).toEqual([3755.6, 10732, 12709.2, 11419.2, 11611.2, 12396]);
    expect(f.profit.total).toBe(11796); // 11,976 - 3 x 60 interest
    expect(sum([f.profit.total, ...f.reconciliation.map((r) => r.value)])).toBe(f.netCash);
  });

  it('delaying the purchase moves the problem to April', () => {
    const f = forecast(S, fin('delay'));
    expect(f.closing).toEqual([3755.6, 10732, 12709.2, 11979.2, 12731.2, -3924]);
    expect(f.firstBeyond).toBe(5);
    expect(f.profit.total).toBe(12426); // one month of depreciation
  });

  it('not buying keeps the most cash, and the profit equals the net cash flow', () => {
    const f = forecast(S, fin('none'));
    expect(f.closing[5]).toBe(14076);
    expect(f.profit.total).toBe(12576);
    expect(f.netCash).toBe(12576);
  });
});

describe('working capital measures on their own', () => {
  it('a deposit only changes when the hotel money arrives', () => {
    const f = forecast(S, fin('buy'), mes('deposit'));
    expect(f.closing).toEqual([5405.6, 12382, -5290.8, -6020.8, -5268.8, -3924]);
  });

  it('supplier credit delays clay payments by a month, and leaves April unpaid at the end', () => {
    const f = forecast(S, fin('buy'), mes('credit'));
    expect(f.closing).toEqual([6354.6, 13078, -4232.8, -4870.8, -3888.8, -2452]);
    expect(f.profit.total).toBe(11976);
    expect(f.reconciliation.find((r) => /credit from the supplier/.test(r.label))?.value).toBe(1472); // 640 x 2.30
  });

  it('even all three together leave January to March beyond the limit', () => {
    const f = forecast(S, fin('buy'), mes('deposit', 'credit', 'cut'));
    expect(f.closing).toEqual([8004.6, 14728, -3952.8, -4310.8, -3048.8, -1332]);
    expect(f.status).toEqual(['credit', 'credit', 'beyond', 'beyond', 'beyond', 'overdraft']);
  });

  it('a larger overdraft changes the limit, not the balance', () => {
    const f = forecast(S, fin('buy'), mes('overdraft'));
    expect(f.closing[3]).toBe(-6020.8);
    expect(f.limit).toBe(7000);
    expect(f.status.slice(2)).toEqual(['overdraft', 'overdraft', 'overdraft', 'overdraft']);
  });
});

describe('formatting', () => {
  it('puts negative figures in brackets, as the guide does', () => {
    expect(bracket(-5290.8)).toBe('(5,290.80)');
    expect(bracket(10732)).toBe('10,732.00');
    expect(bracket(-0.001)).toBe('0.00');
  });
});
