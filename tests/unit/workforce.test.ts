import { describe, expect, it } from 'vitest';
import { planWorkforce, readWorkforce, retentionSaving, turnoverFrom, validateTurnover, validateWorkforce, workforceCsvRows, workforceOptions, type WorkforceInputs } from '../../src/lib/workforce';
import { workforceOptionsHtml, workforceSvg } from '../../src/lib/workforce-view';
import { buildWorking } from '../../src/lib/finance';
import { loadTool } from './helpers/room-tool';

// Wenlow Care (fictional): last year as in the notes on motivation and demotivation.
const PLAN: WorkforceInputs = {
  staffNow: 220,
  rate: 20,
  recruitLimit: null,
  years: [
    { label: '2027', demand: 240, retirements: 7 },
    { label: '2028', demand: 260, retirements: 8 },
    { label: '2029', demand: 265, retirements: 9 },
  ],
};

describe('labour turnover last year', () => {
  it('is (46 ÷ 200) × 100 = 23%, as in the notes', () => {
    const t = turnoverFrom({ start: 180, end: 220, leavers: 46, retired: 6 });
    expect(t.average).toBe(200);
    expect(t.turnover).toBe(23);
    // Without the six who retired: 40 ÷ 200 × 100 = 20%
    expect(t.leavingRate).toBe(20);
  });
  it('uses the platform working for labour turnover', () => {
    const w = buildWorking('labour-turnover', { leavers: 46, averageEmployees: 200 }, '');
    expect(w.answer).toBe('23.0%');
  });
  it('rejects impossible staffing', () => {
    expect(validateTurnover({ start: 180, end: 220, leavers: 46, retired: 50 }).map((p) => p.field)).toEqual(['retired']);
    expect(validateTurnover({ start: 0, end: 0, leavers: 0, retired: 0 }).map((p) => p.field)).toEqual(['start']);
    expect(validateTurnover({ start: 180.5, end: 220, leavers: 46, retired: 6 }).map((p) => p.field)).toEqual(['start']);
  });
});

describe('the plan, worked by hand', () => {
  const p = planWorkforce(PLAN);
  it('finds each year’s gap: 71, 76 and 66', () => {
    // 2027: 220 − 44 leavers − 7 retirements = 169 available; 240 − 169 = 71
    // 2028: 240 − 48 − 8 = 184; 260 − 184 = 76
    // 2029: 260 − 52 − 9 = 199; 265 − 199 = 66
    expect(p.rows.map((r) => [r.start, r.leavers, r.retirements, r.available, r.gap, r.recruit, r.end])).toEqual([
      [220, 44, 7, 169, 71, 71, 240],
      [240, 48, 8, 184, 76, 76, 260],
      [260, 52, 9, 199, 66, 66, 265],
    ]);
  });
  it('needs 213 hires, of which only 45 are for growth', () => {
    expect(p.totalRecruit).toBe(213);
    expect(p.totalLeavers).toBe(144);
    expect(p.totalRetirements).toBe(24);
    expect(p.growth).toBe(45);
    expect(p.replacement).toBe(168);
    expect(p.replacementShare).toBeCloseTo((168 / 213) * 100, 10);
  });
  it('saves 36 hires if the leaving rate falls to the benchmark of 15%', () => {
    // 15%: leavers 33, 36, 39; gaps 60, 64, 53 = 177
    expect(retentionSaving(PLAN, 15)).toEqual({ recruit: 177, saved: 36 });
  });
  it('says what the numbers mean', () => {
    const r = readWorkforce(p, 'Wenlow Care');
    expect(r.reading).toContain('Wenlow Care must recruit 213 people over 3 years.');
    expect(r.reading).toContain('Only 45 of them are for growth; 168 (79%) replace the 144 expected leavers and 24 retirements.');
    expect(r.implication).toContain('Cutting the leaving rate');
  });
});

describe('a recruitment limit and a surplus', () => {
  it('leaves posts unfilled when recruitment is capped, and carries the gap forward', () => {
    const p = planWorkforce({ ...PLAN, recruitLimit: 60 });
    // 2027: gap 71, 60 hired, 11 unfilled, 229 at the end
    expect(p.rows[0]).toMatchObject({ recruit: 60, shortfall: 11, end: 229 });
    // 2028: 229 − round(45.8) = 46 − 8 = 175; gap 85
    expect(p.rows[1]).toMatchObject({ leavers: 46, available: 175, gap: 85, recruit: 60, shortfall: 25 });
    expect(p.totalShortfall).toBe(11 + 25 + p.rows[2]!.shortfall);
    const opts = workforceOptions(p, 15);
    expect(opts.find((o) => o.id === 'temporary')?.fit).toBe('strong');
  });
  it('shows a surplus when demand falls, and suggests natural wastage and redeployment', () => {
    const p = planWorkforce({ ...PLAN, rate: 5, years: [{ label: 'Next year', demand: 180, retirements: 2 }] });
    // 220 − 11 − 2 = 207 available against 180 needed
    expect(p.rows[0]).toMatchObject({ available: 207, surplus: 27, recruit: 0 });
    const opts = workforceOptions(p, null);
    expect(opts.find((o) => o.id === 'wastage')?.fit).toBe('strong');
    expect(opts.find((o) => o.id === 'redeployment')?.fit).toBe('strong');
  });
});

describe('options, checks and output', () => {
  const p = planWorkforce(PLAN);
  it('makes retention a strong fit when most hires replace leavers', () => {
    const opts = workforceOptions(p, 15);
    expect(opts.find((o) => o.id === 'retention')?.fit).toBe('strong');
    expect(opts.find((o) => o.id === 'retention')?.why).toContain('79% of the hires');
    expect(opts.find((o) => o.id === 'internal')?.hl).toBe(true);
    expect(workforceOptionsHtml(opts)).toContain('data-level="HL"');
  });
  it('checks the plan', () => {
    const raw = { ...PLAN, recruitLimit: 'none' as const };
    expect(validateWorkforce(raw)).toEqual([]);
    expect(validateWorkforce({ ...raw, rate: 120 }).map((x) => x.field)).toEqual(['rate']);
    expect(validateWorkforce({ ...raw, years: [{ label: '', demand: 10.5, retirements: 1 }] }).map((x) => [x.field, x.year])).toEqual([
      ['label', 0],
      ['demand', 0],
    ]);
  });
  it('draws the plan with a description that states it', () => {
    const svg = workforceSvg(p, { id: 'w', org: 'Wenlow Care' });
    expect(svg).toContain('2027: 220 at the start, 51 leave or retire, 71 recruited, 240 at the end against 240 needed');
    expect(svg).toContain('In all, 213 people are recruited.');
  });
  it('exports a row per year', () => {
    expect(workforceCsvRows(p)[1]).toEqual(['2027', '220', '44', '7', '169', '240', '71', '0', '0', '240']);
  });
});

describe('the published worked example', () => {
  it('starts from the year in the notes', () => {
    const t = loadTool('people-workforce-plan', 'workforce-planner');
    expect(turnoverFrom(t.lastYear).turnover).toBe(23);
    expect(planWorkforce({ ...t.plan, recruitLimit: t.plan.recruitLimit ?? null }).totalRecruit).toBe(213);
  });
});
