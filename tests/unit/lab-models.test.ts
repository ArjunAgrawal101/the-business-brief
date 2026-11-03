/**
 * The Entrepreneurship and Innovation Lab's models, checked against values
 * worked by hand: start-up costs and runway, the revenue model, unit
 * economics, the feasibility assessment, the canvas and the business plan.
 * Refill Round's figures are simulated; the small examples are made up so the
 * arithmetic can be followed with a pencil.
 */
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { costModel, contributionIn, fromDraft, readCosts, readMix, toDraft, validateCosts, type CostInputs } from '../../src/lib/lab/costs';
import { revenuePlan, revenueSensitivity, readRevenue, streamsFromDrafts, validateStreams, type Stream } from '../../src/lib/lab/revenue';
import { paybackSeries, readUnit, unitEconomics, unitWorkings, validateUnit, verdict } from '../../src/lib/lab/unit-economics';
import { assess, readAssessment, validateFeasibility, type Criterion, type Idea } from '../../src/lib/lab/feasibility';
import { canvasToJson, parseCanvas, riskiest, summarize, readCanvas, CANVAS_BLOCKS, type Canvas, type BlockId } from '../../src/lib/lab/canvas';
import { cleanSummaries, digest, planMarkdown, planProgress, words, type PlanSection } from '../../src/lib/lab/plan';
import { paybackSvg, revenueSvg, runwaySvg } from '../../src/lib/lab/charts';

const lab = (f: string) => parse(readFileSync(new URL(`../../src/content/lab/${f}.yaml`, import.meta.url), 'utf8'));

/* ---------- Start-up costs and runway ---------- */

describe('start-up costs and runway', () => {
  // One-off 1,500; monthly 600; funding 3,000; contribution 300 from month 2, growing 50% a month.
  const small: CostInputs = {
    oneOff: [
      { id: 'a', label: 'Equipment', amount: 1000 },
      { id: 'b', label: 'Stock', amount: 500 },
    ],
    monthly: [
      { id: 'c', label: 'Rent', amount: 400 },
      { id: 'd', label: 'Insurance', amount: 200 },
    ],
    funding: [
      { id: 'e', label: 'Savings', amount: 2000, kind: 'own' },
      { id: 'f', label: 'Loan', amount: 1000, kind: 'loan' },
    ],
    contribution: 300,
    growth: 50,
    salesStart: 2,
  };

  it('adds up the lines and the cash at launch', () => {
    const m = costModel(small);
    expect(m.oneOffTotal).toBe(1500);
    expect(m.monthlyTotal).toBe(600);
    expect(m.fundingTotal).toBe(3000);
    expect(m.cashAtLaunch).toBe(1500);
  });

  it('projects the balance month by month', () => {
    const m = costModel(small);
    // Month 1: 1,500 − 600 = 900. Month 2: 900 − 600 + 300 = 600. Month 3: 600 − 600 + 450 = 450. Month 4: 450 − 600 + 675 = 525.
    expect(m.months.slice(0, 4).map((r) => r.closing)).toEqual([900, 600, 450, 525]);
    expect(m.months.slice(0, 3).map((r) => r.noSales)).toEqual([900, 300, -300]);
    expect(contributionIn(small, 1)).toBe(0);
    expect(contributionIn(small, 5)).toBeCloseTo(1012.5, 9);
  });

  it('finds the runway, the zero-sales runway, the month sales cover outgoings and the lowest balance', () => {
    const m = costModel(small);
    expect(m.runOut).toBeNull();
    expect(m.runway).toBe(24);
    expect(m.zeroSalesRunway).toBeCloseTo(2.5, 9);
    expect(m.breakEvenMonth).toBe(4); // 675 ≥ 600
    expect(m.lowest).toEqual({ month: 3, balance: 450 });
    expect(m.gap).toBe(0);
    expect(m.netBurn).toBe(600);
  });

  it('treats a balance of exactly zero as not yet run out', () => {
    // 1,500 at launch, losing 500 a month: 1,000, 500, 0, then −500 in month 4.
    const m = costModel({ ...small, contribution: 100, growth: 0, salesStart: 1 });
    expect(m.months[2]?.closing).toBe(0);
    expect(m.runOut).toBe(4);
    expect(m.runway).toBe(3);
    expect(m.breakEvenMonth).toBeNull();
    // To last 24 months it needs 24 × 500 − 1,500 = 10,500 more.
    expect(m.gap).toBe(10500);
  });

  it('shows a business that is short of cash before it trades', () => {
    const m = costModel({ ...small, funding: [{ id: 'e', label: 'Savings', amount: 1000, kind: 'own' }] });
    expect(m.cashAtLaunch).toBe(-500);
    expect(m.runOut).toBe(1);
    expect(m.zeroSalesRunway).toBe(0);
    expect(readCosts(m, '$').reading).toContain('falls $500 short');
  });

  it("works Refill Round's start: $17,800 at launch, runway 5 months, outgoings covered in month 11", () => {
    const k = lab('start-up-costs');
    const m = costModel(k);
    expect(m.oneOffTotal).toBe(27200);
    expect(m.monthlyTotal).toBe(5050);
    expect(m.fundingTotal).toBe(45000);
    expect(m.cashAtLaunch).toBe(17800);
    // 17,800 ÷ 5,050 = 3.5248 months with no sales.
    expect(m.zeroSalesRunway).toBeCloseTo(3.5248, 4);
    // Month 1: 17,800 − 5,050 + 1,400 = 14,150. Month 2: 14,150 − 5,050 + 1,610 = 10,710.
    expect(m.months[0]?.closing).toBeCloseTo(14150, 6);
    expect(m.months[1]?.closing).toBeCloseTo(10710, 6);
    expect(m.runOut).toBe(6);
    expect(m.runway).toBe(5);
    // 1,400 × 1.15^10 = 5,663.78 ≥ 5,050, while month 10's 4,925.03 is not.
    expect(m.breakEvenMonth).toBe(11);
    expect(m.lowest.month).toBe(10);
    expect(m.gap).toBeCloseTo(4274.79, 2);
    expect(m.mix.map((x) => [x.kind, Math.round(x.share)])).toEqual([
      ['own', 22],
      ['loan', 47],
      ['equity', 22],
      ['presales', 9],
    ]);
    expect(readMix(m)).toContain('47% is borrowed');
  });

  it('validates what the learner types, line by line', () => {
    const d = toDraft(small);
    d.oneOff[0]!.amount = null;
    d.monthly[0]!.amount = -5;
    d.funding[0]!.label = ' ';
    d.growth = 150;
    d.salesStart = 0;
    const fields = validateCosts(d).map((p) => p.field);
    expect(fields).toEqual(['oneOff:a:amount', 'monthly:c:amount', 'funding:e:label', 'growth', 'salesStart']);
    expect(validateCosts(toDraft(small))).toEqual([]);
    expect(fromDraft(toDraft(small))).toEqual(small);
  });
});

/* ---------- The revenue model ---------- */

describe('the revenue model', () => {
  const sub: Stream = { id: 's', kind: 'subscription', label: 'Box', price: 20, start: 0, joining: 10, growth: 10, churn: 10, fee: 0 };
  const units: Stream = { id: 'u', kind: 'units', label: 'Shop', price: 5, units: 100, growth: 20, fee: 10 };

  it('builds subscribers up from joiners and cancellations, in whole numbers', () => {
    const m = revenuePlan([sub], 4);
    // Month 2: 10 − round(1) + round(11) = 20. Month 3: 20 − 2 + round(12.1) = 30. Month 4: 30 − 3 + round(13.31) = 40.
    expect(m.months.map((r) => r.streams[0]?.units)).toEqual([10, 20, 30, 40]);
    expect(m.months.map((r) => r.streams[0]?.left)).toEqual([0, 1, 2, 3]);
    expect(m.months.map((r) => r.revenue)).toEqual([200, 400, 600, 800]);
    expect(m.revenue).toBe(2000);
    expect(m.endSubscribers).toBe(40);
    expect(m.lost).toBe(6);
  });

  it('grows unit sales and takes off the channel fee', () => {
    const m = revenuePlan([units], 4);
    // 100, 120, 144, round(172.8) = 173 units at $5; 10% fee.
    expect(m.months.map((r) => r.streams[0]?.units)).toEqual([100, 120, 144, 173]);
    expect(m.revenue).toBe(2685);
    expect(m.fees).toBeCloseTo(268.5, 9);
    expect(m.net).toBeCloseTo(2416.5, 9);
    expect(m.multiple).toBeCloseTo(865 / 500, 9);
  });

  it("works Refill Round's year: $106,081, with 529 subscribers in month 12", () => {
    const r = lab('revenue-planner');
    const m = revenuePlan(r.streams);
    expect(m.months[0]?.revenue).toBe(2510);
    // Month 2: 45 − 4 + 48 = 89 subscribers; month 3: 89 − 7 + 51 = 133.
    expect(m.months[1]?.streams[0]?.units).toBe(89);
    expect(m.months[2]?.streams[0]?.units).toBe(133);
    expect(m.months[3]?.streams[0]?.units).toBe(176);
    expect(m.revenue).toBe(106081);
    expect(m.fees).toBeCloseTo(1667.6, 6);
    expect(m.endSubscribers).toBe(529);
    expect(m.lost).toBe(232);
    expect(Math.round(m.totals[0]?.share ?? 0)).toBe(77);
  });

  it('tests plausible setbacks one at a time', () => {
    const s = revenueSensitivity([sub, units], 4);
    expect(s.map((x) => x.id)).toEqual(['price', 'volume', 'growth', 'churn']);
    const price = s.find((x) => x.id === 'price');
    expect(price?.changePct).toBeCloseTo(-10, 9);
    expect(revenueSensitivity([units], 4).map((x) => x.id)).toEqual(['price', 'volume', 'growth']);
    const read = readRevenue(revenuePlan([sub, units], 4), s, '$');
    expect(read.implication).toContain('setbacks tested');
  });

  it('validates the streams', () => {
    const bad = validateStreams([
      { id: 'u', kind: 'units', label: '', price: -1, units: 2.5, growth: 200, fee: 101 },
      { id: 's', kind: 'subscription', label: 'Box', price: 20, start: null, joining: 10, growth: 0, churn: 120, fee: 0 },
    ]).map((p) => p.field);
    expect(bad).toEqual(['u:label', 'u:price', 'u:growth', 'u:fee', 'u:units', 's:start', 's:churn']);
    expect(validateStreams([])).toHaveLength(1);
    expect(streamsFromDrafts([{ id: 'u', kind: 'units', label: ' Shop ', price: 5, units: 100, growth: 20, fee: 10 }])).toEqual([units]);
  });
});

/* ---------- Unit economics ---------- */

describe('unit economics', () => {
  const refill = { spend: 1800, customers: 45, revenue: 24, variableCost: 9.1, churn: 8, cap: 36 };

  it("works Refill Round's subscriber: CAC $40, LTV $186.25, 4.66 to 1, paid back in 2.68 months", () => {
    const u = unitEconomics(refill);
    expect(u.cac).toBe(40);
    expect(u.contribution).toBeCloseTo(14.9, 9);
    expect(u.margin).toBeCloseTo(62.0833, 4);
    expect(u.lifetime).toBeCloseTo(12.5, 9);
    expect(u.capped).toBe(false);
    expect(u.ltv).toBeCloseTo(186.25, 9);
    expect(u.ltvRevenue).toBeCloseTo(300, 9);
    expect(u.ratio).toBeCloseTo(4.65625, 9);
    expect(u.payback).toBeCloseTo(2.6846, 4);
    expect(verdict(u)).toBe('healthy');
    expect(readUnit(u, '$').reading).toContain('$186.25');
  });

  it('halves lifetime value when churn doubles', () => {
    const u = unitEconomics({ ...refill, churn: 16 });
    expect(u.lifetime).toBeCloseTo(6.25, 9);
    expect(u.ltv).toBeCloseTo(93.125, 9);
    expect(u.ratio).toBeCloseTo(2.328125, 9);
    expect(verdict(u)).toBe('thin');
  });

  it('applies the cap when churn is low or zero', () => {
    expect(unitEconomics({ ...refill, churn: 2 }).lifetime).toBe(36);
    const none = unitEconomics({ ...refill, churn: 0 });
    expect(none.uncapped).toBeNull();
    expect(none.lifetime).toBe(36);
    expect(none.capped).toBe(true);
  });

  it('says when every customer loses money, or leaves before paying back', () => {
    const loss = unitEconomics({ ...refill, variableCost: 25 });
    expect(loss.payback).toBeNull();
    expect(readUnit(loss, '$').implication).toContain('makes the loss bigger');
    // CAC $200, contribution $14.90: payback 13.4 months, but customers stay 12.5.
    const leaky = unitEconomics({ ...refill, spend: 9000 });
    expect(leaky.payback).toBeGreaterThan(leaky.lifetime);
    expect(verdict(leaky)).toBe('loses');
    expect(readUnit(leaky, '$').implication).toContain('before earning back');
  });

  it('writes the eight-part workings and the payback series', () => {
    const u = unitEconomics(refill);
    const w = unitWorkings(u, '$');
    expect(w.cac.answer).toBe('$40.00');
    expect(w.ltv.answer).toBe('$186.25');
    expect(w.ratio.answer).toBe('4.7 to 1');
    expect(w.payback.answer).toBe('2.7 months');
    expect(paybackSeries(u, 14).at(-1)?.[1]).toBeCloseTo(186.25, 9);
    expect(paybackSeries(u, 14)[2]?.[1]).toBeCloseTo(29.8, 9);
  });

  it('validates the inputs', () => {
    expect(validateUnit({ ...refill, customers: 0 }).map((p) => p.field)).toEqual(['customers']);
    expect(validateUnit({ ...refill, customers: 2.5, churn: 140, cap: 0 }).map((p) => p.field)).toEqual(['customers', 'churn', 'cap']);
    expect(validateUnit({ ...refill, spend: null }).map((p) => p.field)).toEqual(['spend']);
  });
});

/* ---------- Feasibility ---------- */

describe('the feasibility assessment', () => {
  const f = lab('feasibility');
  const criteria = f.criteria as Criterion[];
  const ideas = f.ideas as Idea[];
  const weights = Object.fromEntries(criteria.map((c) => [c.id, c.weight]));
  const settings = { maxScore: 5, maxWeight: 5, threshold: 60, floor: 2 };

  it('ranks the three ideas on the weighted criteria', () => {
    const a = assess(ideas, criteria, weights, settings);
    // Weights sum to 29, so the maximum is 145. Refill Round: 5×4 + 4×3 + 3×3 + 3×4 + 4×3 + 4×4 + 3×3 + 3×4 = 102.
    expect(a.max).toBe(145);
    expect(a.results.map((r) => [r.id, r.total])).toEqual([
      ['refill-round', 102],
      ['office-refills', 88],
      ['refill-shop', 85],
    ]);
    expect(a.results[0]?.share).toBeCloseTo(70.345, 3);
    expect(a.results.map((r) => r.verdict)).toEqual(['go', 'go', 'weak']);
    expect(a.flips).toEqual([]);
  });

  it('runs the optimism test on the leader', () => {
    const a = assess(ideas, criteria, weights, settings);
    // Every score one lower: 102 − 29 = 73, 50.3% of 145, below the pass mark and behind Office refills (88).
    expect(a.optimism?.share).toBeCloseTo(50.345, 3);
    expect(a.optimism?.passes).toBe(false);
    expect(a.optimism?.leads).toBe(false);
    expect(a.optimism?.overtakenBy).toBe('office-refills');
    expect(readAssessment(a, ideas, criteria, weights, settings).implication).toContain('Office refills would rank first instead');
  });

  it('flags a must-have below the floor whatever the total', () => {
    const flawed = ideas.map((i) => (i.id === 'refill-round' ? { ...i, scores: { ...i.scores, pay: 1 } } : i));
    const a = assess(flawed, criteria, weights, settings);
    const r = a.results.find((x) => x.id === 'refill-round');
    expect(r?.flaws).toEqual(['pay']);
    expect(r?.verdict).toBe('fix');
  });

  it('finds the weight at which the leader changes, and the weight at which a single idea crosses the pass mark', () => {
    const two: Idea[] = [
      { id: 'a', name: 'A', scores: { x: 5, y: 1 } },
      { id: 'b', name: 'B', scores: { x: 2, y: 4 } },
    ];
    const c2: Criterion[] = [
      { id: 'x', label: 'X', weight: 3 },
      { id: 'y', label: 'Y', weight: 2 },
    ];
    // A: 15 + 2 = 17; B: 6 + 8 = 14. With y at 3: A 18, B 18, a tie; so the nearest flip on y is 3.
    const a = assess(two, c2, { x: 3, y: 2 }, settings);
    expect(a.results[0]?.id).toBe('a');
    expect(a.flips.find((s) => s.factor === 'y')).toEqual({ factor: 'y', weight: 3, leaders: ['a', 'b'] });
    // A alone: 15 + 2 = 17 of 25 = 68%, a pass.
    const solo = assess([two[0]!], c2, { x: 3, y: 2 }, settings);
    expect(solo.results[0]?.passes).toBe(true);
    // x at 2: 10 + 2 = 12 of 20 = 60%, still a pass; x at 1: 5 + 2 = 7 of 15 = 46.7%, a fail. So the edge on x is 1.
    expect(solo.edges.find((e) => e.criterion === 'x')).toEqual({ criterion: 'x', weight: 1, passes: false });
    // y at 3: 18 of 30 = 60%, a pass; y at 4: 19 of 35 = 54.3%, a fail. So the edge on y is 4.
    expect(solo.edges.find((e) => e.criterion === 'y')).toEqual({ criterion: 'y', weight: 4, passes: false });
  });

  it('validates scores and weights', () => {
    const p = validateFeasibility([{ id: 'a', name: '', scores: { need: 6 } }], criteria.slice(0, 2), { need: 5, pay: 9 }, settings).map((x) => x.field);
    expect(p).toEqual(['a:name', 'a:need', 'a:pay', 'w:pay']);
  });
});

/* ---------- The canvas ---------- */

describe('the Business Model Canvas', () => {
  const c = lab('business-model-canvas');
  const canvas: Canvas = { name: 'Refill Round', entries: c.entries };
  const labels = Object.fromEntries(c.blocks.map((b: { id: BlockId; label: string }) => [b.id, b.label])) as Record<BlockId, string>;

  it('ranks the riskiest assumptions, breaking ties by what customers want, then whether it can pay, then whether it can be done', () => {
    const r = riskiest(canvas, 6);
    // Two at risk 5: churn (customer relationships) before price (revenue streams). Four at risk 4, in test order.
    expect(r.map((e) => e.id)).toEqual(['cr-churn', 'rs-box', 'vp-cheaper', 'ch-social', 'cost-variable', 'ka-wash']);
    expect(r.every((e) => e.kind === 'assumption')).toBe(true);
    expect(r[0]?.lens).toBe('desirability');
    expect(r[1]?.lens).toBe('viability');
  });

  it('counts assumptions and evidence, and finds the empty blocks', () => {
    const s = summarize(canvas);
    expect(s.entries).toBe(18);
    expect(s.evidence).toBe(6);
    expect(s.assumptions).toBe(12);
    expect(s.high).toBe(6);
    expect(s.empty).toEqual([]);
    const sparse = summarize({ name: '', entries: canvas.entries.filter((e) => e.block === 'channels') });
    expect(sparse.empty).toHaveLength(8);
    expect(readCanvas(canvas, labels).implication).toContain('Subscribers stay about a year');
  });

  it('writes the reading as whole sentences, with one critical assumption or several', () => {
    const one: Canvas = { name: '', entries: [{ id: 'x', block: 'channels', text: 'Flyers bring customers', kind: 'assumption', risk: 5, note: '' }] };
    expect(readCanvas(one, labels).implication).toMatch(/risk 5 of 5\)\. A cheap experiment/);
    expect(readCanvas(canvas, labels).implication).toContain('6 assumptions are rated high or critical; a cheap experiment');
  });

  it('ignores empty entries and lists nothing when there are no assumptions', () => {
    const blank: Canvas = { name: '', entries: [{ id: 'x', block: 'channels', text: '  ', kind: 'assumption', risk: 5, note: '' }] };
    expect(riskiest(blank)).toEqual([]);
    expect(summarize(blank).entries).toBe(0);
  });

  it('saves to JSON and reads it back', () => {
    const json = canvasToJson(canvas, '2026-11-03');
    const back = parseCanvas(json);
    expect(back.ok).toBe(true);
    if (back.ok) expect(back.canvas).toEqual(canvas);
  });

  it('refuses files it did not write, and entries that break the rules', () => {
    expect(parseCanvas('not json')).toEqual({ ok: false, error: 'That file is not valid JSON.' });
    expect(parseCanvas('{"format":"other"}').ok).toBe(false);
    const wrongBlock = JSON.stringify({ format: 'the-business-brief/business-model-canvas', version: 1, entries: [{ block: 'mission', text: 'x', kind: 'evidence', risk: 3 }] });
    expect(parseCanvas(wrongBlock)).toEqual({ ok: false, error: 'Entry 1 names a block that is not on the canvas.' });
    const badRisk = JSON.stringify({ format: 'the-business-brief/business-model-canvas', version: 1, entries: [{ block: 'channels', text: 'x', kind: 'evidence', risk: 9 }] });
    expect(parseCanvas(badRisk).ok).toBe(false);
    const dupes = JSON.stringify({ format: 'the-business-brief/business-model-canvas', version: 1, name: 'n', entries: [{ id: 'a', block: 'channels', text: 'x', kind: 'evidence', risk: 3 }, { id: 'a', block: 'channels', text: 'y', kind: 'assumption', risk: 2 }] });
    const r = parseCanvas(dupes);
    expect(r.ok && r.canvas.entries.map((e) => e.id)).toEqual(['a', 'ax']);
    expect(CANVAS_BLOCKS).toHaveLength(9);
  });
});

/* ---------- The business plan ---------- */

describe('the business plan outline', () => {
  const p = lab('business-plan');
  const defs = p.sections as PlanSection[];

  it('counts words and progress', () => {
    expect(words('  One two\nthree  ')).toBe(3);
    expect(words('')).toBe(0);
    const prog = planProgress(defs, { title: 'T', sections: { summary: 'word '.repeat(120), founders: 'a few words' } });
    expect(prog.sections.summary?.status).toBe('drafted');
    expect(prog.sections.founders?.status).toBe('started');
    expect(prog.drafted).toBe(1);
    expect(prog.started).toBe(1);
    expect(prog.empty).toBe(defs.length - 2);
  });

  it('writes Markdown with the text, the prompts for empty sections and the figures from the Lab', () => {
    const md = planMarkdown(defs, { title: 'Refill Round', sections: { summary: 'Refills to the door.' } }, { finance: ['Start-up costs: $27,200.'] }, '3 November 2026');
    expect(md.startsWith('# Refill Round\n')).toBe(true);
    expect(md).toContain('## 1. Executive summary\n\nRefills to the door.');
    expect(md).toContain('## 2. The founders and the team\n\n*Not written yet. Questions to answer:*');
    expect(md).toContain('**From the Lab tools**\n\n- Start-up costs: $27,200.');
    expect(md).not.toMatch(/[–—]/);
  });

  it("quotes the other tools' saved results, and ignores damaged ones", () => {
    const k = costModel(lab('start-up-costs'));
    const raw = {
      costs: { currency: '$', oneOff: k.oneOffTotal, monthly: k.monthlyTotal, funding: k.fundingTotal, cashAtLaunch: k.cashAtLaunch, runway: k.runway, runOut: k.runOut, breakEven: k.breakEvenMonth, gap: k.gap, horizon: 24, mix: readMix(k) },
      unit: { currency: '$', cac: 40, contribution: 14.9, lifetime: 12.5, ltv: 186.25, ratio: 4.65625, payback: 2.68 },
      revenue: { currency: '$', total: 'lots' },
    };
    const s = cleanSummaries(raw);
    expect(Object.keys(s)).toEqual(['unit', 'costs']);
    const d = digest(s);
    expect(d.finance?.[0]).toBe('Start-up costs: $27,200 one-off and $5,050 a month, against funding of $45,000, leaving $17,800 at launch.');
    expect(d.finance?.[1]).toContain('runs out in month 6');
    expect(d.model?.[0]).toContain('lifetime value of $186.25 (LTV to CAC 4.7 to 1)');
    expect(d.risks).toBeUndefined();
  });
});

/* ---------- Charts ---------- */

describe('the Lab charts', () => {
  it('give each chart a title and a description that states the result', () => {
    const k = runwaySvg(costModel(lab('start-up-costs')), { currency: '$', id: 'k' });
    expect(k).toContain('role="img"');
    expect(k).toContain('runs out in month 6');
    expect(k).toContain('Sales cover the monthly outgoings from month 11');
    const r = revenueSvg(revenuePlan(lab('revenue-planner').streams), { currency: '$', id: 'r' });
    expect(r).toContain('from $2,510 in month 1 to $15,411 in month 12');
    const u = paybackSvg(unitEconomics({ spend: 1800, customers: 45, revenue: 24, variableCost: 9.1, churn: 8, cap: 36 }), { currency: '$', id: 'u' });
    expect(u).toContain('earned back after 2.7 months');
    for (const svg of [k, r, u]) expect(svg).not.toMatch(/NaN|undefined/);
  });
});
