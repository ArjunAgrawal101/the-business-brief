/**
 * The formula sheet. Its first part is the IB formulae sheet exactly as the
 * Business management guide prints it (pp. 64 to 65), checked line by line
 * against the guide when it was written and pinned here so it cannot drift;
 * the Financial Laboratory's own copies of the same formulae must agree with
 * it. Its second part, "Also used on this site", never repeats a formula from
 * the sheet, and places each one precisely: a real subtopic at the right level
 * with the guide's page, a toolkit tool with its page, or beyond the course.
 */
import { describe, expect, it } from 'vitest';
import { c } from './helpers/library';
import { DISCOUNT_TABLE_PAGE, IB_SHEET, SITE_FORMULAS, formulaHtml, formulaText, ibFormulas, placementLabel, placementText, siteFormulas } from '../../src/lib/library/formula-sheet';
import { FORMULAS } from '../../src/lib/finance-lab/formulas';
import { DISCOUNT_TABLE } from '../../src/lib/investment';
import { DIAGRAMS } from '../../src/lib/diagrams';

const subs = new Map((c.curricula['ib-dp-bm']?.units ?? []).flatMap((u) => u.subtopics.map((s) => [s.code, s] as const)));

describe('the IB formulae sheet', () => {
  it('has the guide’s parts, groups and levels, in its order and on its pages', () => {
    expect(IB_SHEET.map((p) => [p.title, p.page])).toEqual([
      ['Formulae for ratio analysis (SL/HL)', 64],
      ['Other formulae (SL/HL)', 65],
    ]);
    expect(IB_SHEET.flatMap((p) => p.groups.map((g) => [g.title, g.level]))).toEqual([
      ['Profitability ratios (SL/HL)', 'SL/HL'],
      ['Liquidity ratios (SL/HL)', 'SL/HL'],
      ['Efficiency ratios (HL only)', 'HL'],
      ['Investment appraisal', 'SL/HL'],
      ['Capacity utilization and productivity (HL only)', 'HL'],
    ]);
    expect(DISCOUNT_TABLE_PAGE).toBe(66);
  });

  it('prints every formula exactly as the guide does', () => {
    expect(ibFormulas().map((f) => [formulaText(f.name, f.rhs), ...(f.where ?? []).map((w) => `where ${formulaText(w.name, w.rhs)}`), f.level])).toEqual([
      ['Gross profit margin = (gross profit) ÷ (sales revenue) × 100', 'SL/HL'],
      ['Profit margin = (profit before interest and tax) ÷ (sales revenue) × 100', 'SL/HL'],
      ['Return on capital employed (ROCE) = (profit before interest and tax) ÷ (capital employed) × 100', 'where capital employed = non-current liabilities + equity', 'SL/HL'],
      ['Current ratio = (current assets) ÷ (current liabilities)', 'SL/HL'],
      ['Acid test (quick) ratio = (current assets − stock) ÷ (current liabilities)', 'SL/HL'],
      ['Stock turnover (number of times) = (cost of sales) ÷ (average stock)', 'HL'],
      ['Stock turnover (number of days) = (average stock) ÷ (cost of sales) × 365', 'where average stock = (opening stock + closing stock) ÷ (2)', 'HL'],
      ['Debtor days ratio (number of days) = (debtors) ÷ (total sales revenue) × 365', 'HL'],
      ['Creditor days ratio (number of days) = (creditors) ÷ (cost of sales) × 365', 'HL'],
      ['Gearing ratio = (non-current liabilities) ÷ (capital employed) × 100', 'where capital employed = non-current liabilities + equity', 'HL'],
      ['Average rate of return (ARR) = ((total returns − capital cost) ÷ years of use) ÷ (capital cost) × 100', 'SL/HL'],
      ['Net present value (NPV) = ∑ present values of return − original cost', 'HL'],
      ['Capacity utilization rate = (actual output) ÷ (productive capacity) × 100', 'HL'],
      ['Productivity rate = (total output) ÷ (total input) × 100', 'HL'],
    ]);
    // Stock turnover in days is printed after "or", as the alternative to the number of times.
    expect(ibFormulas().filter((f) => f.or).map((f) => f.name)).toEqual(['Stock turnover (number of days)']);
  });

  it('agrees with the Financial Laboratory wherever the laboratory says a formula is as printed', () => {
    const sheet = new Map(ibFormulas().map((f) => [f.name, formulaText(f.name, f.rhs)]));
    let compared = 0;
    for (const list of Object.values(FORMULAS))
      for (const f of list) {
        if (!/As printed on the guide’s formula sheet/.test(f.note ?? '')) continue;
        expect(sheet.get(f.name), f.name).toBe(formulaText(f.name, f.rhs));
        compared += 1;
      }
    expect(compared).toBeGreaterThanOrEqual(12);
  });

  it('gives the guide’s discount factors for 4, 6, 8, 10 and 20 per cent over ten years', () => {
    expect(Object.keys(DISCOUNT_TABLE)).toEqual(['4', '6', '8', '10', '20']);
    expect(DISCOUNT_TABLE[10][4]).toBe(0.6209);
    expect(DISCOUNT_TABLE[20][9]).toBe(0.1615);
  });

  it('draws fractions for the eye and reads them in one line to a screen reader', () => {
    const roce = ibFormulas()[2]!;
    const html = formulaHtml(roce.rhs);
    expect(html).toContain('<span class="fs-frac"><span class="fs-frac__n">profit before interest and tax</span><span class="fs-frac__d">capital employed</span></span>');
    expect(html).toContain('<span class="sr-only">(profit before interest and tax) ÷ (capital employed) × 100</span>');
  });
});

describe('also used on this site', () => {
  const site = siteFormulas();
  const onSheet = new Set(ibFormulas().map((f) => f.name.toLowerCase()));

  it('holds the formulas the brief names: operating leverage, budget variance and the regression line', () => {
    const names = site.map((f) => f.name);
    expect(names).toEqual(expect.arrayContaining(['Degree of operating leverage', 'Budget variance', 'Line of best fit']));
    expect(site.length).toBeGreaterThan(30);
  });

  it('never repeats a formula from the IB sheet', () => {
    for (const f of site) expect(onSheet.has(f.name.toLowerCase()), f.name).toBe(false);
  });

  it('places each one precisely: a real subtopic at its level and page, a toolkit page, or beyond the course', () => {
    for (const f of site) {
      const p = f.placement;
      if (p.kind === 'syllabus' || p.kind === 'supports') {
        const s = subs.get(p.code);
        expect(s, `${f.name}: ${p.code}`).toBeDefined();
        // The page is where the statement is printed: the subtopic's own page or the next.
        expect(p.page - (s!.page ?? 0), `${f.name}: page`).toBeGreaterThanOrEqual(0);
        expect(p.page - (s!.page ?? 0), `${f.name}: page`).toBeLessThanOrEqual(1);
      }
      if (p.kind === 'syllabus') {
        const s = subs.get(p.code)!;
        // An HL formula sits in an HL subtopic or an HL statement; an SL/HL one in a subtopic SL students take.
        if (p.level === 'SL/HL') expect(s.level, f.name).not.toBe('HL');
        else expect(s.level === 'HL' || s.content.some((x) => x.level === 'HL'), f.name).toBe(true);
      }
      if (p.kind === 'toolkit') expect([14, 15], f.name).toContain(p.page);
      expect(placementLabel(p)).not.toBe('');
      expect(placementText(p, (code) => subs.get(code)?.title ?? '')).not.toMatch(/undefined|NaN|[\u2013\u2014]/);
    }
  });

  it('says precisely where operating leverage, budget variance and labour turnover stand', () => {
    const at = (name: string) => site.find((f) => f.name === name)!.placement;
    const title = (code: string) => subs.get(code)?.title ?? '';
    expect(placementText(at('Degree of operating leverage'), title)).toBe(
      'In the syllabus: 5.6 Production planning, HL only (guide, p. 35). Not on the formulae sheet, so learn it. The guide names operating leverage but gives no formula; this is the standard measure.',
    );
    expect(placementText(at('Budget variance'), title)).toMatch(/^In the syllabus: 3\.9 Budgets, HL only \(guide, p\. 30\)\./);
    expect(placementText(at('Labour turnover'), title)).toMatch(/^In the syllabus: 2\.4 Motivation and demotivation, HL only \(guide, p\. 26\)\./);
    expect(placementText(at('Line of best fit'), title)).toMatch(/^Part of the toolkit: Simple linear regression, HL only \(guide, p\. 15\)\./);
    expect(placementText(at('Customer lifetime value'), title)).toMatch(/^Beyond the IB course \(enrichment\)/);
  });

  it('links every formula to the pages that use it, and only to diagrams that exist', () => {
    for (const f of site) {
      expect(f.used.length, f.name).toBeGreaterThan(0);
      for (const u of f.used) {
        expect(u.href, f.name).toMatch(/^\/[a-z0-9/#-]*$/);
        const dg = /^\/diagrams\/#diagram-(.+)$/.exec(u.href);
        if (dg) expect(DIAGRAMS[dg[1]!], u.href).toBeDefined();
      }
    }
    expect(SITE_FORMULAS.map((g) => g.title)).toContain('Beyond the course: advanced financial analysis');
  });
});
