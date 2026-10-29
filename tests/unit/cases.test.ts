/**
 * Recomputes the figures in the three teaching cases, their Decision Rooms and
 * the practice questions from the exhibits, so that a figure in the content
 * can never drift from the evidence it claims to come from. The method notes
 * in each case promise this test.
 */
import { describe, expect, it } from 'vitest';
import { breakEvenModel } from '../../src/lib/breakeven';
import { evaluateTree } from '../../src/lib/decision-tree';
import { labourTurnover, specialOrderGain } from '../../src/lib/finance';
import type { Exhibit } from '../../src/lib/schemas';
import { loadCorpus } from './helpers/corpus';

const c = loadCorpus();
const r2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

function exhibit(caseId: string, id: string): Exhibit {
  const e = c.cases[caseId]?.exhibits.find((x) => x.id === id);
  if (!e) throw new Error(`${caseId} ${id} missing`);
  return e;
}
/** A table row by its first cell. */
function row(e: Exhibit, label: string): Array<string | number> {
  const r = e.rows?.find((x) => String(x[0]) === label);
  if (!r) throw new Error(`${e.id}: no row "${label}"`);
  return r as Array<string | number>;
}
const num = (v: unknown) => {
  if (typeof v !== 'number') throw new Error(`not a number: ${String(v)}`);
  return v;
};
function decisionMetrics(id: string) {
  const d = c.decisions[id];
  if (!d) throw new Error(`decision ${id} missing`);
  const out: Record<string, Record<string, number | string>> = { baseline: d.baseline };
  for (const round of d.rounds) for (const ch of round.choices) out[ch.id] = ch.outcome.metrics;
  return out;
}

describe('every case', () => {
  it('has exhibit totals that add up', () => {
    for (const [cid, cs] of Object.entries(c.cases)) {
      for (const e of cs.exhibits) {
        if (e.kind !== 'table' || !e.footerIsSum || !e.footer) continue;
        e.footer.forEach((cell, k) => {
          if (typeof cell !== 'number') return;
          const sum = (e.rows ?? []).reduce((s, r) => s + num(r[k]), 0);
          expect(sum, `${cid} ${e.id} column ${k}`).toBeCloseTo(cell, 6);
        });
      }
    }
  });
});

describe('Atelier Barro', () => {
  const ledger = exhibit('atelier-barro', 'ex-1');
  const monthly = (col: number) => (ledger.rows ?? []).filter((r) => r[1] === 'Each month').reduce((s, r) => s + num(r[col]), 0);
  const perMug = (col: number) => (ledger.rows ?? []).filter((r) => String(r[1]).startsWith('Per mug')).reduce((s, r) => s + num(r[col]), 0);
  const be = c.interactives['costs-break-even-atelier'];
  if (be?.component !== 'break-even-workspace') throw new Error('break-even interaction missing');
  const so = c.interactives['costs-special-order-atelier'];
  if (so?.component !== 'special-order') throw new Error('special order interaction missing');

  it('ledger totals match the note and the interactions', () => {
    expect(monthly(2)).toBe(8060);
    expect(monthly(3)).toBe(8140);
    expect(r2(perMug(2))).toBe(6.88);
    expect(r2(perMug(3))).toBe(7.18);
    // The fee row is 4% of €22, which the workspace models as a share of the price.
    expect(num(row(ledger, 'Card and platform fees')[3])).toBeCloseTo(0.04 * 22, 9);
    expect(be.defaults.fixedCosts).toBe(monthly(3));
    expect(r2(be.defaults.variableCost + ((be.defaults.priceShare ?? 0) / 100) * be.defaults.price)).toBe(7.18);
  });

  it('revenue streams agree with the average month', () => {
    const rev = exhibit('atelier-barro', 'ex-2');
    const mugs = 5376 + 2304;
    expect(mugs / 12).toBe(be.defaults.quantity);
    expect(num(row(rev, 'Mug sales, online shop')[2])).toBe(5376 * 22);
    expect(num(row(rev, 'Mug sales, studio shop')[2])).toBe(2304 * 22);
    expect(num(row(rev, 'Weekend workshops')[2])).toBe(24 * 8 * 55);
    const total = num(rev.footer?.[2]);
    expect(Math.round(((5376 + 2304) * 22 * 100) / total)).toBe(92);
  });

  it('Decision Room pricing outcomes follow from the ledger and the survey', () => {
    const m = decisionMetrics('atelier-pricing');
    const d = { ...be.defaults, priceShare: be.defaults.priceShare ?? 0 };
    const scenario = (id: string) => be.scenarios.find((s) => s.id === id)?.set ?? {};
    const cases: Array<[string, Partial<typeof d>]> = [
      ['baseline', scenario('before')],
      ['absorb', {}],
      ['raise-24', scenario('raise-24')],
      ['premium-25', scenario('premium-25')],
      ['cut-marketing', scenario('cut-marketing')],
    ];
    for (const [id, set] of cases) {
      const model = breakEvenModel({ ...d, ...set });
      const got = m[id];
      expect(got?.price, id).toBe(model.inputs.price);
      expect(got?.sales, id).toBe(model.inputs.quantity);
      expect(got?.contribution, id).toBe(r2(model.contribution));
      expect(got?.beq, id).toBe(model.beq);
      expect(got?.mos, id).toBe(model.mos);
      expect(got?.profit, id).toBe(r2(model.profitAtForecast));
    }
    // The survey (Exhibit 3) is the source of the sales estimates used above.
    const survey = exhibit('atelier-barro', 'ex-3');
    expect(num(row(survey, '24')[1] ?? NaN)).toBe(scenario('raise-24').quantity);
  });

  it('the hotel order is worth €1,395, or €1,845 at €12.50', () => {
    const vc = 2.3 + 2.4 + 0.75 + 0.4; // clay, piece rate, firing (Exhibit 1) and bulk packaging, no fee (Exhibit 5)
    expect(r2(vc)).toBe(so.defaults.variableCost);
    const m = decisionMetrics('atelier-pricing');
    expect(m.accept?.orderGain).toBe(r2(specialOrderGain(11, vc, 300, 150)));
    expect(m.negotiate?.orderGain).toBe(r2(specialOrderGain(12.5, vc, 300, 150)));
    expect(so.defaults.regularContribution).toBe(r2(22 - 7.18));
    // Average cost of a shop mug at 640 a month, from November: "about €20".
    expect(r2((8140 + 7.18 * 640) / 640)).toBe(so.defaults.fullCostPerUnit);
  });
});

describe('Marigold Kitchens', () => {
  // Parameters from Exhibits 1 and 3 (₹ million a year unless stated).
  const P = { revenue: 24, food: 0.32, staff: 6, rent: 3.6, utilities: 1.2, other: 1.2, central: 4.5, interest: 0.11 };
  const restaurantFixed = P.staff + P.rent + P.utilities + P.other;
  const restaurantProfit = P.revenue * (1 - P.food) - restaurantFixed;
  const own4 = 4 * restaurantProfit;
  const base = own4 - P.central;

  it('Exhibits 1, 2 and 4 add up', () => {
    const e1 = exhibit('marigold-kitchens', 'ex-1');
    expect(num(row(e1, 'Food and packaging')[1])).toBeCloseTo(P.revenue * P.food, 9);
    expect(num(row(e1, 'Restaurant profit')[1])).toBeCloseTo(restaurantProfit, 9);
    expect(r2(base)).toBe(12.78);
    const e4 = exhibit('marigold-kitchens', 'ex-4');
    const one = (label: string) => num(row(e4, label)[1]);
    const nine = (label: string) => num(row(e4, label)[2]);
    expect(nine('Revenue')).toBeCloseTo(9 * one('Revenue'), 9);
    expect(one('Food and packaging (34% of sales)')).toBeCloseTo(0.34 * one('Revenue'), 9);
    expect(one('Restaurant profit')).toBeCloseTo(one('Revenue') - one('Food and packaging (34% of sales)') - one('Other restaurant costs'), 9);
    expect(nine('Operating profit')).toBeCloseTo(nine('Restaurant profit') - nine('Central costs'), 9);
    expect(96 / nine('Operating profit')).toBeCloseTo(25, 9); // "twenty-five times"
  });

  it('the decision tree interaction uses Exhibit 8', () => {
    const e8 = exhibit('marigold-kitchens', 'ex-8');
    const tree = c.interactives['growth-tree-marigold'];
    if (tree?.component !== 'decision-tree-lab') throw new Error('tree missing');
    const labels: Record<string, string> = { organic: 'Organic growth', franchise: 'Franchising', stay: 'Stay focused' };
    for (const op of tree.options) {
      const r = row(e8, labels[op.id] ?? '');
      expect([op.cost, op.outcomes[0]?.probability, op.outcomes[0]?.payoff, op.outcomes[1]?.payoff], op.id).toEqual([r[1], r[2], r[3], r[4]]);
      expect(op.outcomes[1]?.probability, op.id).toBeCloseTo(1 - num(r[2]), 9);
    }
    const best = evaluateTree(tree.options);
    expect(best.bestId).toBe('franchise');
  });

  it('every Decision Room figure follows from Exhibit 3', () => {
    const m = decisionMetrics('marigold-growth');
    const expectProfit = (id: string, y2: number, y4: number) => {
      expect(m[id]?.profit2, `${id} year two`).toBe(r2(y2));
      expect(m[id]?.profit4, `${id} year four`).toBe(r2(y4));
    };
    expect(m.baseline?.profit2).toBe(r2(base));

    // Organic: four Mumbai restaurants, ₹52m loan at 11%, central costs ₹7.0m.
    const mumbaiFixed = P.staff + 5.4 + P.utilities + P.other;
    const mumbai = (sales: number) => sales * (1 - P.food) - mumbaiFixed;
    const organic = (ramp: number, extraCentral: number) => [
      own4 + 4 * mumbai(26 * ramp) - 7 - extraCentral - 52 * P.interest,
      own4 + 4 * mumbai(26) - 7 - extraCentral - 52 * P.interest,
    ] as const;
    expectProfit('organic', ...organic(0.85, 0));
    expectProfit('organic-hire', ...organic(0.9, 1.2));
    expectProfit('organic-promote', ...organic(0.8, 0.4));
    expect(m.organic?.revenue2).toBe(r2(96 + 4 * 26 * 0.85));
    expect([m.organic?.capital, m.organic?.debt]).toEqual([72, 52]);

    // Franchising: twelve franchises, 6% royalty, support ₹6.0m, academy ₹1.5m.
    const royalty = (n: number, sales: number) => 0.06 * n * sales;
    const franchise = [own4 + royalty(12, 19) - 6 - 1.5 - P.central, own4 + royalty(12, 21) - 6 - 1.5 - P.central] as const;
    expectProfit('franchise', ...franchise);
    expectProfit('franchise-strict', franchise[0] - 3 - 20 * P.interest, franchise[1] - 3 - 20 * P.interest);
    const ownLight = 4 * (P.revenue * 0.95 * (1 - P.food) - restaurantFixed);
    expectProfit('franchise-light', franchise[0], ownLight + royalty(10, 18.5) - 6 - 1.5 - P.central);
    expect(m.franchise?.revenue2).toBe(r2(96 + royalty(12, 19)));

    // Joint venture: six mall restaurants, rent 15% of sales, half of the profit, ₹30m loan.
    const mall = (sales: number) => sales * (1 - P.food - 0.15) - (6.6 + 2.4);
    const jv = (n: number, sales: number) => 0.5 * (n * mall(sales) - 2) ;
    const jvBase = own4 - P.central - 0.5 - 30 * P.interest;
    expectProfit('joint-venture', jvBase + jv(6, 25.2), jvBase + jv(6, 28));
    expectProfit('jv-negotiate', jvBase + jv(4, 25.2), jvBase + jv(6, 28));
    const ownQuick = 4 * (P.revenue * 0.97 * (1 - P.food) - restaurantFixed);
    expectProfit('jv-standard', jvBase + jv(6, 25.2), ownQuick - P.central - 0.5 + jv(6, 28) - 30 * P.interest);

    // Acquisition: food falls to 30%, six converted restaurants, central ₹8.0m, founder keeps 70%.
    const ownD = 4 * (P.revenue * 0.7 - restaurantFixed);
    const acq = (y2: number, y4: number) => [0.7 * y2, 0.7 * y4] as const;
    const d2 = ownD + 6 * (20 * 0.7 - 11) - 8;
    const d4 = ownD + 6 * (23 * 0.7 - 11) - 8;
    expectProfit('acquisition', ...acq(d2, d4));
    expectProfit('acq-rapid', ...acq(d2 - 2.5, d4));
    const phased = 4 * (P.revenue * 0.69 - restaurantFixed) + 6 * (18 * 0.69 - 10.6) - 8;
    expectProfit('acq-phased', ...acq(phased, d4));
    expect(m.acquisition?.founder).toBe(70);
    expect(m.acquisition?.revenue2).toBe(4 * P.revenue + 6 * 20);

    // Stay focused: office lunches, food 36%, delivery and selling ₹1.2m.
    const lunch = (sales: number) => sales * (1 - 0.36) - 1.2;
    expectProfit('stay-focused', base + lunch(6), base + lunch(9));
    expectProfit('stay-people', base + lunch(6) - 0.96, base + lunch(9) - 0.96);
    expectProfit('stay-pilot', base + lunch(6), base + lunch(9) + mumbai(26 * 0.85) - 0.5);
  });
});

describe('Halden Distribution', () => {
  const people = exhibit('halden-distribution', 'ex-2');
  const cell = (label: string, k: number) => num(row(people, label)[k]);

  it('labour turnover follows from leavers and average employees', () => {
    for (const k of [1, 2, 3]) {
      const lt = labourTurnover(cell('Employees who left in the year', k), cell('Average number of employees in the year', k));
      expect(Math.round((lt ?? 0) * 10) / 10, `column ${k}`).toBe(cell('Labour turnover (%)', k));
    }
    expect(cell('Employees now', 1) + cell('Employees now', 2)).toBe(cell('Employees now', 3));
  });

  it('the Decision Room starts from the exhibits', () => {
    const m = decisionMetrics('halden-leadership');
    const perf = exhibit('halden-distribution', 'ex-1');
    const last = perf.rows?.at(-1) ?? [];
    expect(m.baseline?.dispatch90).toBe(last[1]);
    expect(m.baseline?.errors).toBe(last[2]);
    expect(m.baseline?.turnover).toBe(cell('Labour turnover (%)', 3));
    // Engagement: the average share agreeing, weighted by the 66 day and 46 night respondents.
    const survey = exhibit('halden-distribution', 'ex-3');
    const avg = (k: number) => (survey.rows ?? []).reduce((s, r) => s + num(r[k]), 0) / (survey.rows?.length ?? 1);
    expect(Math.round((avg(1) * 66 + avg(2) * 46) / 112)).toBe(m.baseline?.engagement);
  });
});

describe('practice question answers', () => {
  const answer = (id: string) => c.questions[id]?.markscheme.answer ?? '';

  it('match the finance functions', () => {
    const d = c.interactives['costs-break-even-atelier'];
    if (d?.component !== 'break-even-workspace') throw new Error('missing');
    const m = breakEvenModel({ ...d.defaults, priceShare: d.defaults.priceShare ?? 0 });
    expect(answer('q-costs-p2-beq')).toContain(`${m.beq} mugs`);
    expect(answer('q-costs-p2-mos')).toContain(`${m.mos} mugs`);
    expect(answer('q-costs-p2-mos')).toContain(`${(m.mosShare ?? 0).toFixed(1)}%`);
    const at24 = breakEvenModel({ ...d.defaults, priceShare: 4, price: 24, quantity: 590 });
    expect(answer('q-costs-p2-price')).toContain(`€${at24.profitAtForecast.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`);
    expect(answer('q-costs-hl-special')).toContain('€1,395');
    expect(answer('q-growth-p2-tree')).toMatch(/₹42m.*₹59m/);
    expect(answer('q-lead-p2-turnover')).toContain('51.9%');
  });
});
