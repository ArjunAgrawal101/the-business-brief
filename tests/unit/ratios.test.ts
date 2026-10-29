/**
 * Ratio analysis against figures worked by hand from Halden Distribution's
 * accounts (src/content/interactives/finance-ratios-halden.yaml, in £000).
 * The arithmetic is written out beside each expectation; none of it was
 * copied from the code's output.
 */
import { describe, expect, it } from 'vitest';
import {
  RATIO_IDS,
  applyAdjustments,
  balances,
  derive,
  diagnose,
  fmtChange,
  fmtRatio,
  ratioInputs,
  ratioValue,
  ratioWorkings,
  statementSlips,
  verdict,
  RATIOS,
  type RatioId,
  type Statement,
} from '../../src/lib/ratios';
import { buildWorking } from '../../src/lib/finance';
import { fmtAccounts } from '../../src/lib/ratio-view';
import { loadCorpus } from './helpers/corpus';

const c = loadCorpus();
const desk = c.interactives['finance-ratios-halden'];
if (desk?.component !== 'ratio-desk') throw new Error('ratio desk missing');
const [s1, s2] = desk.statements as [Statement, Statement];
const open1 = desk.openingStock; // stock at 1 July 2024: 210
const open2 = s1.stock; // stock at 1 July 2025: 230
const v1 = (id: RatioId) => ratioValue(id, s1, open1) as number;
const v2 = (id: RatioId) => ratioValue(id, s2, open2) as number;

describe('the accounts', () => {
  it('derive the subtotals of the statement of profit or loss', () => {
    const d1 = derive(s1);
    // 9,200 − 6,900 = 2,300; 2,300 − 1,380 = 920; 920 − 20 = 900; 900 − 225 = 675; 675 − 300 = 375
    expect([d1.grossProfit, d1.pbit, d1.profitBeforeTax, d1.profitForPeriod, d1.retainedProfit]).toEqual([2300, 920, 900, 675, 375]);
    const d2 = derive(s2);
    // 9,600 − 7,680 = 1,920; 1,920 − 1,536 = 384; 384 − 64 = 320; 320 − 80 = 240; 240 − 100 = 140
    expect([d2.grossProfit, d2.pbit, d2.profitBeforeTax, d2.profitForPeriod, d2.retainedProfit]).toEqual([1920, 384, 320, 240, 140]);
  });

  it('balance, and link the two years through retained earnings', () => {
    const d1 = derive(s1);
    // 4,600 − 1,700 = 2,900; 406 + 1,134 + 230 = 1,770; total assets 4,670; liabilities 850 + 600 = 1,450; net assets 3,220
    expect([d1.nonCurrentAssets, d1.currentAssets, d1.totalAssets, d1.totalLiabilities, d1.netAssets, d1.totalEquity]).toEqual([2900, 1770, 4670, 1450, 3220, 3220]);
    const d2 = derive(s2);
    // 6,850 − 2,260 = 4,590; 17 + 1,420 + 290 = 1,727; total assets 6,317; liabilities 1,307 + 1,650 = 2,957; net assets 3,360
    expect([d2.nonCurrentAssets, d2.currentAssets, d2.totalAssets, d2.totalLiabilities, d2.netAssets, d2.totalEquity]).toEqual([4590, 1727, 6317, 2957, 3360, 3360]);
    expect(balances(s1) && balances(s2)).toBe(true);
    // 2,220 + 140 = 2,360
    expect(s1.retainedEarnings + d2.retainedProfit).toBe(s2.retainedEarnings);
    // Tax is a quarter of profit before tax in both years: 900 × 0.25 = 225; 320 × 0.25 = 80
    expect([s1.tax, s2.tax]).toEqual([d1.profitBeforeTax / 4, d2.profitBeforeTax / 4]);
  });

  it('show deductions and negatives in brackets', () => {
    expect(fmtAccounts(1700, true)).toBe('(1,700)');
    expect(fmtAccounts(-193)).toBe('(193)');
    expect(fmtAccounts(0)).toBe('0');
    expect(fmtAccounts(9600)).toBe('9,600');
  });
});

describe('the ten ratios, both years', () => {
  it('profitability (3.5)', () => {
    expect(v1('gross-profit-margin')).toBeCloseTo(25, 9); // 2,300 ÷ 9,200 × 100
    expect(v2('gross-profit-margin')).toBeCloseTo(20, 9); // 1,920 ÷ 9,600 × 100
    expect(v1('profit-margin')).toBeCloseTo(10, 9); // 920 ÷ 9,200 × 100
    expect(v2('profit-margin')).toBeCloseTo(4, 9); // 384 ÷ 9,600 × 100
    expect(v1('roce')).toBeCloseTo(24.0838, 4); // 920 ÷ (600 + 3,220) × 100 = 920 ÷ 3,820 × 100
    expect(v2('roce')).toBeCloseTo(7.6647, 4); // 384 ÷ (1,650 + 3,360) × 100 = 384 ÷ 5,010 × 100
  });

  it('liquidity (3.5)', () => {
    expect(v1('current-ratio')).toBeCloseTo(2.0824, 4); // 1,770 ÷ 850
    expect(v2('current-ratio')).toBeCloseTo(1.3213, 4); // 1,727 ÷ 1,307
    expect(v1('acid-test-ratio')).toBeCloseTo(1.8118, 4); // (1,770 − 230) ÷ 850 = 1,540 ÷ 850
    expect(v2('acid-test-ratio')).toBeCloseTo(1.0995, 4); // (1,727 − 290) ÷ 1,307 = 1,437 ÷ 1,307
  });

  it('efficiency (3.6, HL), with average stock as the guide defines it', () => {
    expect(v1('stock-turnover-times')).toBeCloseTo(31.3636, 4); // 6,900 ÷ ((210 + 230) ÷ 2) = 6,900 ÷ 220
    expect(v2('stock-turnover-times')).toBeCloseTo(29.5385, 4); // 7,680 ÷ ((230 + 290) ÷ 2) = 7,680 ÷ 260
    expect(v1('stock-turnover-days')).toBeCloseTo(11.6377, 4); // 220 ÷ 6,900 × 365
    expect(v2('stock-turnover-days')).toBeCloseTo(12.3568, 4); // 260 ÷ 7,680 × 365
    expect(v1('debtor-days')).toBeCloseTo(44.9902, 4); // 1,134 ÷ 9,200 × 365
    expect(v2('debtor-days')).toBeCloseTo(53.9896, 4); // 1,420 ÷ 9,600 × 365
    expect(v1('creditor-days')).toBeCloseTo(44.9638, 4); // 850 ÷ 6,900 × 365
    expect(v2('creditor-days')).toBeCloseTo(54.9876, 4); // 1,157 ÷ 7,680 × 365
    expect(v1('gearing-ratio')).toBeCloseTo(15.7068, 4); // 600 ÷ 3,820 × 100
    expect(v2('gearing-ratio')).toBeCloseTo(32.9341, 4); // 1,650 ÷ 5,010 × 100
  });

  it('are formatted to two decimal places with their unit, and the change in their own terms', () => {
    expect(fmtRatio(v2('roce'), 'percent')).toBe('7.66%');
    expect(fmtRatio(v2('current-ratio'), 'ratio')).toBe('1.32');
    expect(fmtRatio(v2('stock-turnover-times'), 'times')).toBe('29.54 times');
    expect(fmtRatio(v2('debtor-days'), 'days')).toBe('53.99 days');
    expect(fmtChange(v1('gross-profit-margin'), v2('gross-profit-margin'), 'percent')).toBe('−5.00 percentage points');
    expect(fmtChange(v1('debtor-days'), v2('debtor-days'), 'days')).toBe('+9.00 days');
  });

  it('read better or worse where the direction is clear, and leave judgement where it is not', () => {
    expect(verdict(RATIOS['gross-profit-margin'], v1('gross-profit-margin'), v2('gross-profit-margin'))).toBe('worse');
    expect(verdict(RATIOS['debtor-days'], v1('debtor-days'), v2('debtor-days'))).toBe('worse');
    expect(verdict(RATIOS['creditor-days'], v1('creditor-days'), v2('creditor-days'))).toBe('judgement');
    expect(verdict(RATIOS['gearing-ratio'], v1('gearing-ratio'), v2('gearing-ratio'))).toBe('judgement');
  });
});

describe('the eight-part workings', () => {
  it('every ratio builds a complete working that agrees with the ratio', () => {
    for (const id of RATIO_IDS) {
      const w = buildWorking(id, ratioInputs(id, s2, open2), '£000');
      expect(w.error, id).toBeUndefined();
      expect(w.substitution, id).toMatch(/^=/);
      expect(w.value, id).toBeCloseTo(Math.round(v2(id) * 100) / 100, 9);
      expect(w.given[0]?.label, id).toContain('(£000)');
    }
  });

  it('show capital employed and average stock as steps', () => {
    expect(ratioWorkings.roce(ratioInputs('roce', s2, open2), '£000').steps[0]).toBe('Capital employed = 1,650 + 3,360 = 5,010');
    expect(ratioWorkings['stock-turnover-times'](ratioInputs('stock-turnover-times', s2, open2), '').steps[0]).toBe('Average stock = (230 + 290) ÷ 2 = 260');
  });

  it('report a ratio that cannot be calculated', () => {
    const w = ratioWorkings['current-ratio']({ currentAssets: 100, currentLiabilities: 0 }, '');
    expect(w.value).toBeNull();
    expect(w.error).toMatch(/above zero/);
  });

  it('match the worked examples in the calculation register', () => {
    for (const id of RATIO_IDS) {
      expect(c.calculations[id]?.example?.inputs, id).toEqual(ratioInputs(id, s2, open2));
      expect(c.calculations[id]?.page, id).toBe('/finance-desk/ratios/');
    }
  });
});

describe('checking an answer', () => {
  const check = (id: RatioId, answer: number) => diagnose(id, answer, ratioInputs(id, s2, open2), statementSlips(id, s2));

  it('accepts the answer to two decimal places, or rounded to one', () => {
    expect(check('roce', 7.66).correct).toBe(true);
    expect(check('roce', 7.7).correct).toBe(true); // |7.7 − 7.6647| = 0.035
    expect(check('roce', 7.6).correct).toBe(false); // |7.6 − 7.6647| = 0.065
  });

  it('names the slip behind a common wrong answer', () => {
    expect(check('roce', 11.43).message).toMatch(/equity alone/); // 384 ÷ 3,360 × 100 = 11.4286
    expect(check('roce', 6.08).message).toMatch(/total assets/); // 384 ÷ 6,317 × 100 = 6.0788
    expect(check('acid-test-ratio', 1.32).message).toMatch(/current ratio/); // 1,727 ÷ 1,307
    expect(check('profit-margin', 20).message).toMatch(/gross profit margin/); // 1,920 ÷ 9,600 × 100
    expect(check('profit-margin', 3.33).message).toMatch(/profit before tax/); // 320 ÷ 9,600 × 100 = 3.3333
    expect(check('stock-turnover-times', 26.48).message).toMatch(/closing stock/); // 7,680 ÷ 290 = 26.4828
    expect(check('gearing-ratio', 59.02).message).toMatch(/all liabilities/); // 2,957 ÷ 5,010 × 100 = 59.0220
    expect(check('debtor-days', 67.49).message).toMatch(/cost of sales/); // 1,420 ÷ 7,680 × 365 = 67.4870
    expect(check('current-ratio', 0.76).message).toMatch(/upside down/); // 1,307 ÷ 1,727 = 0.7568
  });

  it('gives a general prompt for any other wrong answer', () => {
    expect(check('gross-profit-margin', 42).message).toMatch(/^Not yet\. Check which figures/);
  });
});

describe('strategies on the 2026 accounts', () => {
  const after = (id: string) => {
    const st = desk.strategies.find((x) => x.id === id);
    if (!st) throw new Error(`strategy ${id} missing`);
    return applyAdjustments(s2, st.adjust);
  };
  const r = (id: RatioId, s: Statement) => ratioValue(id, s, open2) as number;

  it('every strategy keeps the statements balanced and linked', () => {
    for (const st of desk.strategies) {
      const s = applyAdjustments(s2, st.adjust);
      expect(balances(s), st.id).toBe(true);
      expect(s1.retainedEarnings + derive(s).retainedProfit, st.id).toBeCloseTo(s.retainedEarnings, 9);
    }
  });

  it('collecting debts moves cash and debtor days, not the current ratio', () => {
    const s = after('collect-disputed');
    expect(r('current-ratio', s)).toBeCloseTo(v2('current-ratio'), 12); // 1,727 ÷ 1,307 either way
    expect(r('debtor-days', s)).toBeCloseTo(42.5833, 4); // 1,120 ÷ 9,600 × 365
    expect(s.cash).toBe(317); // 17 + 300
  });

  it('paying suppliers turns the shortfall into an overdraft', () => {
    const s = after('pay-suppliers');
    expect([s.cash, s.bankOverdraft, s.tradeCreditors]).toEqual([0, 193, 947]); // 17 − 210 = −193
    expect(r('current-ratio', s)).toBeCloseTo(1.3256, 4); // 1,710 ÷ (193 + 947 + 150) = 1,710 ÷ 1,290
    expect(r('creditor-days', s)).toBeCloseTo(45.0072, 4); // 947 × 365 = 345,655; 345,655 ÷ 7,680 = 45.0072
  });

  it('a price rise lifts every profitability ratio', () => {
    const s = after('price-rise');
    expect(r('gross-profit-margin', s)).toBeCloseTo(22.3301, 4); // 2,208 ÷ 9,888 × 100
    expect(r('profit-margin', s)).toBeCloseTo(6.7961, 4); // 672 ÷ 9,888 × 100
    expect(r('roce', s)).toBeCloseTo(12.8588, 4); // 672 ÷ (1,650 + 3,576) × 100 = 672 ÷ 5,226 × 100
  });

  it('cutting agency costs works through cost of sales', () => {
    const s = after('cut-agency');
    expect(r('gross-profit-margin', s)).toBeCloseTo(22.5, 9); // 2,160 ÷ 9,600 × 100
    expect(r('roce', s)).toBeCloseTo(12.0231, 4); // 624 ÷ (1,650 + 3,540) × 100 = 624 ÷ 5,190 × 100
  });

  it('less stock helps the acid test; swapping debt for shares lowers gearing but not ROCE', () => {
    expect(r('acid-test-ratio', after('less-stock'))).toBeCloseTo(1.1454, 4); // (1,727 − 230) ÷ 1,307
    const swap = after('equity-for-debt');
    expect(r('gearing-ratio', swap)).toBeCloseTo(22.9541, 4); // 1,150 ÷ 5,010 × 100
    expect(r('roce', swap)).toBeCloseTo(v2('roce'), 12); // capital employed is still 5,010
  });
});
