import { describe, expect, it } from 'vitest';
import { change, fixedCostCurve, measureText, productionModel, productionNotes, productionWorkings, readComparison, readUtilization, validatePeriod, type PeriodInputs, type ProductionSettings } from '../../src/lib/productivity';
import { fixedCostSvg, measureRowsHtml, utilizationBarsHtml } from '../../src/lib/productivity-view';
import { loadTool } from './helpers/room-tool';

// Wrenhurst Cycles (fictional), from the notes on production planning: a four-week month.
const SEPT: PeriodInputs = { capacity: 1000, made: 800, defects: 16, labour: 25, capital: 400, price: 500, inputCost: 360000, fixedCosts: 120000 };
// A quieter month on the same costs: 120,000 + 700 × 300 = 330,000.
const OCT: PeriodInputs = { capacity: 1000, made: 700, defects: 21, labour: 25, capital: 350, price: 500, inputCost: 330000, fixedCosts: 120000 };
const REWORK: ProductionSettings = { defects: 'reworked', labour: 'workers' };
const SCRAP: ProductionSettings = { defects: 'scrapped', labour: 'workers' };
const UNITS = { one: 'bike', many: 'bikes', period: 'month' };

describe('the measures for September, as in the notes', () => {
  const m = productionModel(SEPT, REWORK);
  it('applies the guide formula for capacity utilization: 800 ÷ 1,000 × 100 = 80%', () => {
    expect(m.utilization).toBe(80);
    expect(m.spare).toBe(200);
  });
  it('finds a defect rate of 16 ÷ 800 × 100 = 2%', () => {
    expect(m.defectRate).toBe(2);
  });
  it('counts reworked bikes as good output: 32 bikes per worker, 2 per machine hour', () => {
    expect(m.goodOutput).toBe(800);
    expect(m.labourProductivity).toBe(32);
    expect(m.capitalProductivity).toBe(2);
  });
  it('applies the guide formula for the productivity rate: 400,000 ÷ 360,000 × 100 = 111.1%', () => {
    expect(m.outputValue).toBe(400000);
    expect(m.productivityRate).toBeCloseTo(111.1111, 4);
  });
  it('spreads $120,000 of fixed costs at $150 a bike', () => {
    expect(m.fixedCostPerUnit).toBe(150);
  });
  it('finds the degree of operating leverage of 4 in the notes: 160,000 ÷ 40,000', () => {
    expect(m.variableCosts).toBe(240000);
    expect(m.contribution).toBe(160000);
    expect(m.operatingProfit).toBe(40000);
    expect(m.operatingLeverage).toBe(4);
  });
});

describe('a quieter October', () => {
  const a = productionModel(SEPT, REWORK);
  const b = productionModel(OCT, REWORK);
  it('uses 70% of capacity and spreads the fixed costs over fewer bikes', () => {
    expect(b.utilization).toBe(70);
    expect(b.defectRate).toBe(3);
    expect(b.labourProductivity).toBe(28);
    // 350,000 ÷ 330,000 × 100 = 106.06%
    expect(b.productivityRate).toBeCloseTo(106.0606, 4);
    // 120,000 ÷ 700 = 171.43
    expect(b.fixedCostPerUnit).toBeCloseTo(171.4286, 4);
  });
  it('has a higher operating leverage nearer break-even: 140,000 ÷ 20,000 = 7', () => {
    expect(b.operatingLeverage).toBe(7);
  });
  it('measures the changes in percentage points', () => {
    expect(change(a.utilization, b.utilization)).toBe(-10);
    expect(change(a.defectRate, b.defectRate)).toBe(1);
    expect(change(null, 3)).toBeNull();
  });
  it('says what moved', () => {
    const s = readComparison(a, b, { a: 'September', b: 'October' }, UNITS, '$');
    expect(s).toContain('capacity utilization fell by 10.0 percentage points');
    expect(s).toContain('from $150.00 to $171.43');
    expect(s).toContain('Operating leverage moved from 4.0 to 7.0');
  });
});

describe('scrapped defects', () => {
  const m = productionModel(SEPT, SCRAP);
  it('still count towards capacity used, but not towards good output', () => {
    expect(m.utilization).toBe(80);
    expect(m.goodOutput).toBe(784);
    // 784 ÷ 25 = 31.36
    expect(m.labourProductivity).toBeCloseTo(31.36, 10);
    // 784 × 500 = 392,000; ÷ 360,000 × 100 = 108.89%
    expect(m.productivityRate).toBeCloseTo(108.8889, 4);
    // 392,000 − 240,000 = 152,000; profit 32,000; 152,000 ÷ 32,000 = 4.75
    expect(m.operatingLeverage).toBeCloseTo(4.75, 10);
  });
});

describe('operating leverage at and below break-even', () => {
  it('is not meaningful when operating profit is zero or negative', () => {
    // 600 bikes: 300,000 of output against 120,000 + 600 × 300 = 300,000 of costs
    const even = productionModel({ ...SEPT, made: 600, defects: 0, inputCost: 300000 }, REWORK);
    expect(even.operatingProfit).toBe(0);
    expect(even.operatingLeverage).toBeNull();
    expect(measureText(even, 'leverage', UNITS, '$', REWORK, 'machine hours')).toBe('not meaningful');
    expect(productionWorkings(even, UNITS, '$', REWORK, 'machine hours').leverage.steps[0]).toContain('break-even');
  });
});

describe('checking the figures', () => {
  const raw = (v: Partial<Record<keyof PeriodInputs, number | null>>) => ({ ...SEPT, ...v }) as Record<keyof PeriodInputs, number | null>;
  const fields = (v: Partial<Record<keyof PeriodInputs, number | null>>) => validatePeriod(raw(v)).map((p) => p.field);
  it('accepts the worked example', () => {
    expect(validatePeriod(raw({}))).toEqual([]);
  });
  it('rejects missing, negative and impossible figures', () => {
    expect(fields({ made: null })).toEqual(['made']);
    expect(fields({ labour: -1 })).toEqual(['labour']);
    expect(fields({ capacity: 0 })).toContain('capacity');
    expect(fields({ made: 1200 })).toContain('made');
    expect(fields({ defects: 900 })).toContain('defects');
    expect(fields({ fixedCosts: 400000 })).toContain('fixedCosts');
    expect(fields({ inputCost: 0 })).toContain('inputCost');
  });
});

describe('the words and the workings', () => {
  const m = productionModel(SEPT, REWORK);
  it('reads 80% as comfortable on the platform rule of thumb', () => {
    const r = readUtilization(m, UNITS);
    expect(r.reading).toBe('80.0% of capacity is used: 800 of 1,000 bikes, leaving 200 bikes of spare capacity.');
    expect(r.implication).toContain('room for more orders');
  });
  it('labels the guide formulas and the standard forms', () => {
    const w = productionWorkings(m, UNITS, '$', REWORK, 'machine hours');
    expect(w.utilization.formula).toBe('Capacity utilization rate = actual output ÷ productive capacity × 100');
    expect(w.utilization.note).toContain('p. 65');
    expect(w.productivity.formula).toBe('Productivity rate = total output ÷ total input × 100');
    expect(w.defect.note).toContain('standard form');
    expect(w.labour.answer).toBe('32 bikes');
    expect(w.capital.unit).toBe('good bikes per machine hour');
    expect(w.leverage.answer).toBe('4.00');
    const n = productionNotes(m, UNITS, '$');
    expect(n.leverage.interpretation).toContain('about 4.0%');
  });
  it('formats each measure with its unit', () => {
    expect(measureText(m, 'labour', UNITS, '$', REWORK, 'machine hours')).toBe('32.00 bikes per worker');
    expect(measureText(m, 'labour', UNITS, '$', { ...REWORK, labour: 'hours' }, 'machine hours')).toBe('32.00 bikes per labour hour');
    expect(measureText(m, 'capital', UNITS, '$', REWORK, 'machine hours')).toBe('2.00 bikes per machine hour');
    expect(measureText(m, 'fixed', UNITS, '$', REWORK, 'machine hours')).toBe('$150.00');
  });
});

describe('the chart and the tables', () => {
  const a = productionModel(SEPT, REWORK);
  const b = productionModel(OCT, REWORK);
  it('draws the fixed cost per unit curve from a tenth of capacity to full capacity', () => {
    const c = fixedCostCurve(120000, 1000);
    expect(c[0]).toEqual([100, 1200]);
    expect(c[c.length - 1]).toEqual([1000, 120]);
    expect(c.every((p, k) => k === 0 || p[1] < (c[k - 1]?.[1] ?? Infinity))).toBe(true);
  });
  it('describes the chart with the result', () => {
    const svg = fixedCostSvg([{ name: 'September', m: a }, { name: 'October', m: b }], UNITS, '$', 'x');
    expect(svg).toContain('role="img"');
    expect(svg).toContain('September: 800 good bikes, $150.00 each; October: 700 good bikes, $171.43 each');
  });
  it('shows a change column when two periods are compared', () => {
    const html = measureRowsHtml(a, b, UNITS, '$', REWORK, 'machine hours');
    expect(html).toContain('−10.0 points');
    expect(html).toContain('+$21.43');
    expect(measureRowsHtml(a, null, UNITS, '$', REWORK, 'machine hours')).not.toContain('points');
  });
  it('labels each bar in words', () => {
    expect(utilizationBarsHtml([{ name: 'September', m: a }], UNITS)).toContain('aria-label="September: 80.0% of capacity used, 800 of 1,000 bikes"');
  });
});

describe('the published worked example', () => {
  it('is the month in the notes, and a quieter one', () => {
    const t = loadTool('ops-capacity-calculator', 'capacity-calculator');
    const [s, o] = t.periods;
    if (!s || !o) throw new Error('two periods expected');
    expect(s.values).toEqual(SEPT);
    expect(o.values).toEqual(OCT);
    expect(validatePeriod(s.values)).toEqual([]);
    expect(productionModel(s.values, t.settings).operatingLeverage).toBe(4);
  });
});
