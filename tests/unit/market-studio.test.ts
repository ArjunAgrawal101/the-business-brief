/**
 * The Market Studio instruments: every calculation and every rule, checked
 * against values worked by hand. The worked examples are read from their
 * content files, so these tests also pin what the pages show.
 */
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { asNum, nextId, stateFromFile, toCsv, uniqueIds } from '../../src/lib/market-kit';
import { annualMargin, clvModel, largestRival, metricsView, normalizeMetrics, relativeShare, validateClv, validateMetrics, type MetricsState } from '../../src/lib/market-metrics';
import { maxTotal, positioningStatement, readStp, scoreSegments, stpChecks, targeting, type StpState } from '../../src/lib/market-stp';
import { elementStatus, elementsFor, mixChecks, normalizeMix, type MixState } from '../../src/lib/market-mix';
import { initials, personaChecks, personaMarkdown, splitLines, type PersonaState } from '../../src/lib/market-persona';
import { clusters, describeSpot, gapVerdict, nearestRival, openSpaces, readMap, validateMap, type MapState } from '../../src/lib/market-map';
import { marginOfError, parseRange, questionChecks, quotaCounts, rangeProblems, samplingNotes, surveyChecks, type Question, type QuestionnaireState } from '../../src/lib/market-research';
import { baseUnits, lossYear, plcView, simulate, stageOf, validatePlc, type PlcState } from '../../src/lib/market-plc';
import { campaignChecks, campaignLine, funnel, objectiveChange, plannedSpend, reviewWeeks, type CampaignState } from '../../src/lib/market-campaign';
import { budgetView, channelResult, customers, marginalCustomers, reach, roundSplit, suggestSplit, validateBudget, type BudgetState } from '../../src/lib/market-budget';

const example = <T>(file: string): T => structuredClone(parse(readFileSync(new URL(`../../src/content/interactives/${file}.yaml`, import.meta.url), 'utf8')).state) as T;
const levels = (cs: Array<{ level: string }>) => cs.map((c) => c.level);

describe('shared helpers', () => {
  it('writes CSV with quoting and guards against spreadsheet formulas', () => {
    expect(toCsv([['a', 'b,c', 'say "hi"'], [1, -2.5, null]])).toBe('a,"b,c","say ""hi"""\r\n1,-2.5,');
    // Text that a spreadsheet would run as a formula is prefixed; a negative number stays a number.
    expect(toCsv([['=SUM(A1)', '-x', '+1', '@x']])).toBe("'=SUM(A1),'-x,'+1,'@x");
  });

  it('reads untrusted saved values safely', () => {
    expect(asNum('12', 0)).toBe(12);
    expect(asNum('abc', 7)).toBe(7);
    expect(asNum(500, 0, 0, 100)).toBe(100);
    // Three ids exist, so it tries s4, which is taken, then s5.
    expect(nextId('s', ['s1', 's2', 's4'])).toBe('s5');
    expect(uniqueIds([{ id: 'a' }, { id: 'a' }, { id: '' }], 'x').map((r) => r.id)).toEqual(['a', 'x2', 'x3']);
    expect(stateFromFile({ tool: 'stp-planner', state: { a: 1 } }, 'stp-planner')).toEqual({ a: 1 });
    expect(stateFromFile({ tool: 'persona', state: {} }, 'stp-planner')).toBeNull();
    expect(stateFromFile({ a: 1 }, 'stp-planner')).toEqual({ a: 1 });
  });
});

describe('market metrics', () => {
  const s = example<MetricsState>('market-metrics-corner-brew');

  it('works out the local market by value', () => {
    const v = metricsView(s);
    // 410 + 380 + 300 + 210 + 150 + 90 + 160 = 1,700 thousand; 430 + 372 + 330 + 240 + 168 + 84 + 176 = 1,800 thousand
    expect(v.model.totalLast).toBe(1700000);
    expect(v.model.totalNow).toBe(1800000);
    // (1,800,000 − 1,700,000) ÷ 1,700,000 × 100 = 5.882%
    expect(v.model.growth).toBeCloseTo(5.8824, 4);
    const cb = v.model.firms.find((f) => f.id === 'cornerbrew');
    // 210,000 ÷ 1,700,000 = 12.353%; 240,000 ÷ 1,800,000 = 13.333%; +0.980 points; sales +14.286%
    expect(cb?.shareLast).toBeCloseTo(12.3529, 4);
    expect(cb?.shareNow).toBeCloseTo(13.3333, 4);
    expect(cb?.shareChange).toBeCloseTo(0.9804, 4);
    expect(cb?.salesGrowth).toBeCloseTo(14.2857, 4);
    expect(v.model.leaderNow).toBe('quickcup');
  });

  it('works out relative market share against the largest named rival', () => {
    // 240,000 ÷ 430,000 = 0.5581
    expect(relativeShare(s.firms, 'cornerbrew')).toBeCloseTo(0.5581, 4);
    expect(largestRival(s.firms, 'cornerbrew')?.name).toBe('Quickcup');
    // The leader is measured against the second largest: 430,000 ÷ 372,000 = 1.156
    expect(relativeShare(s.firms, 'quickcup')).toBeCloseTo(1.1559, 4);
    // A group of many sellers has no relative share.
    expect(relativeShare(s.firms, 'others')).toBeNull();
  });

  it('works out customer lifetime value', () => {
    const k = clvModel(s.clv);
    // 3.50 × 40 × 0.65 = 91.00 a year
    expect(annualMargin(s.clv)).toBeCloseTo(91, 9);
    // 91 ÷ (1 + 0.08 − 0.55) = 91 ÷ 0.53 = 171.70
    expect(k.clv).toBeCloseTo(171.6981, 4);
    // 1 ÷ (1 − 0.55) = 2.22 years; 91 ÷ 0.45 = 202.22 undiscounted
    expect(k.lifetime).toBeCloseTo(2.2222, 4);
    expect(k.undiscounted).toBeCloseTo(202.2222, 4);
    // 37.88 ÷ (91 ÷ 12) = 4.995 months
    expect(k.paybackMonths).toBeCloseTo(4.9952, 4);
    expect(k.ratio).toBeCloseTo(171.6981 / 37.88, 4);
    // Year 1: 91 ÷ 1.08 = 84.26; year 2: 91 × 0.55 ÷ 1.08² = 42.91
    expect(k.rows[0]?.pv).toBeCloseTo(84.2593, 4);
    expect(k.rows[1]?.pv).toBeCloseTo(42.9098, 4);
    // Ten years of the table fall just short of the whole series.
    expect(k.rows[9]?.cumulative).toBeLessThan(k.clv);
    expect(k.rows[9]?.cumulative).toBeCloseTo(171.4967, 3);
  });

  it('names invalid figures and survives a corrupt saved file', () => {
    expect(validateClv({ ...s.clv, retention: 100 }).map((p) => p.where)).toEqual(['clv-retention']);
    const bad = { ...s, firms: s.firms.map((f) => (f.id === 'kettle' ? { ...f, now: Number.NaN, name: '' } : f)) };
    expect(validateMetrics(bad).map((p) => p.where)).toEqual(expect.arrayContaining(['kettle-name', 'kettle-now']));
    expect(normalizeMetrics({ firms: 'nonsense' }, s)).toBeNull();
    const n = normalizeMetrics({ firms: [{ id: 'a', name: 'A', last: -5, now: '7' }, { id: 'a', name: 'B', last: 1, now: 2 }], clv: { retention: 140 } }, s);
    expect(n?.firms.map((f) => [f.id, f.last, f.now])).toEqual([
      ['a', 0, 7],
      ['f2', 1, 2],
    ]);
    expect(n?.clv.retention).toBe(99);
  });
});

describe('STP planner', () => {
  const s = example<StpState>('market-stp-corner-brew');

  it('ranks the segments by weighted score', () => {
    // Weights size 3, growth 2, fit 4, competition 3 (maximum 12 × 5 = 60):
    // students 3×4 + 2×3 + 4×4 + 3×4 = 46; home workers 9 + 8 + 16 + 9 = 42; brewers 3 + 6 + 20 + 12 = 41; commuters 15 + 4 + 8 + 3 = 30
    expect(maxTotal(s)).toBe(60);
    expect(scoreSegments(s).map((r) => [r.id, r.total, r.rank])).toEqual([
      ['students', 46, 1],
      ['homeworkers', 42, 2],
      ['brewers', 41, 3],
      ['commuters', 30, 4],
    ]);
    expect(targeting(s)).toBe('several');
  });

  it('finds the weight that would change the ranking', () => {
    // At a size weight of 1: students 4 + 6 + 16 + 12 = 38, brewers 1 + 6 + 20 + 12 = 39
    const r = readStp(s);
    expect(r.reading).toContain('The highest-scoring segment is College students, with 46 of 60 points (77%), 4 ahead of Home workers.');
    expect(r.reading).toContain('a weight of 1 on size (now 3) would put Home brewers first');
  });

  it('passes its own checks, and catches a plan that does not hold together', () => {
    expect(levels(stpChecks(s)).filter((l) => l === 'conflict' || l === 'tension')).toEqual([]);
    const bad = structuredClone(s);
    bad.segments[0]!.target = true; // commuters: poor fit, crowded
    bad.segments[0]!.reachable = false;
    bad.segments[3]!.target = false;
    bad.positioning.customers = 'busy professionals';
    bad.positioning.difference = '';
    const texts = stpChecks(bad).map((c) => `${c.level}: ${c.text}`);
    expect(texts).toContain('conflict: It cannot be reached through promotion and distribution, so it cannot be targeted.');
    expect(texts).toContain('tension: A target with a poor fit with the business’s strengths is hard to serve well.');
    expect(texts).toContain('conflict: A position needs a point of difference from rivals.');
    expect(texts.some((t) => t.startsWith('tension: The statement does not seem to name'))).toBe(true);
    const all = structuredClone(s);
    all.segments.forEach((g) => (g.target = true));
    expect(targeting(all)).toBe('mass');
  });

  it('writes the positioning statement in the common format', () => {
    expect(positioningStatement(s.positioning)).toBe(
      'For college students and people working from home nearby who want a calm place to work through the quiet afternoon hours, Corner Brew is the neighbourhood café that serves good coffee, roasted on the premises that morning, at a modest price, because it roasts its own beans every day and prints the roasting date on every cup.',
    );
    expect(positioningStatement({ customers: '', need: '', brand: 'Slow Bean', frame: '', difference: 'only sells decaffeinated coffee', proof: '' })).toBe('Slow Bean is the choice that only sells decaffeinated coffee.');
  });
});

describe('marketing mix builder', () => {
  const s = example<MixState>('market-mix-corner-brew');

  it('finds one tension and six consistent links in the worked example', () => {
    const c = mixChecks(s);
    expect(c.filter((x) => x.level === 'conflict')).toEqual([]);
    expect(c.filter((x) => x.level === 'tension').map((x) => x.about)).toEqual(['Product and Price']);
    expect(c.filter((x) => x.level === 'fit')).toHaveLength(6);
    expect(elementStatus(c, 'price')).toEqual({ target: 'fit', position: 'fit', ps: 'tension' });
    expect(elementsFor('service')).toHaveLength(7);
    expect(elementsFor('good')).toEqual(['product', 'price', 'promotion', 'place']);
  });

  it('catches the contradictions the 4.5 notes describe', () => {
    const premiumCheap = { ...s, position: 'premium' as const, price: { ...s.price, level: 'below' as const } };
    expect(mixChecks(premiumCheap).some((c) => c.level === 'conflict' && c.about === 'Price and Position')).toBe(true);
    const predatory = { ...s, price: { ...s.price, method: 'predatory' as const } };
    expect(mixChecks(predatory).some((c) => c.level === 'conflict' && c.text.includes('illegal in many countries'))).toBe(true);
    const lossLeader = { ...s, product: { ...s.product, range: 'single' as const }, price: { ...s.price, method: 'loss-leader' as const } };
    expect(mixChecks(lossLeader).some((c) => c.level === 'conflict' && c.text.includes('single product'))).toBe(true);
    const noPeople = { ...s, people: { ...s.people, text: '' } };
    expect(mixChecks(noPeople).some((c) => c.level === 'conflict' && c.text.startsWith('A service needs all seven Ps'))).toBe(true);
    // A good does not need the three service Ps.
    expect(mixChecks({ ...noPeople, kind: 'good' }).some((c) => c.text.startsWith('A service needs'))).toBe(false);
    const hl = { ...s, price: { ...s.price, method: 'contribution' as const } };
    expect(mixChecks(hl).some((c) => c.level === 'note' && c.text === 'Contribution pricing is an HL pricing method in the guide.')).toBe(true);
  });

  it('keeps unknown saved choices out', () => {
    const n = normalizeMix({ ...s, position: 'luxury', price: { method: 'skimming', level: 'below', text: 'x' } }, s);
    expect(n?.position).toBe(s.position);
    expect(n?.price.method).toBe(s.price.method);
  });
});

describe('customer persona creator', () => {
  const p = example<PersonaState>('market-persona-corner-brew');

  it('accepts a persona built from research, and warns about one built on assumptions', () => {
    expect(levels(personaChecks(p)).filter((l) => l === 'conflict' || l === 'tension')).toEqual([]);
    const guess = { ...p, basis: 'assumption' as const, segment: '', channels: [] };
    const texts = personaChecks(guess).map((c) => `${c.level}: ${c.about}`);
    expect(texts).toEqual(expect.arrayContaining(['tension: Evidence', 'tension: Segment', 'conflict: Channels']));
  });

  it('exports as text and reads lists one item per line', () => {
    expect(initials('Lena')).toBe('LE');
    expect(initials('Maya Okoro')).toBe('MO');
    expect(splitLines('- one\n\n• two\n three ')).toEqual(['one', 'two', 'three']);
    const md = personaMarkdown(p);
    expect(md.startsWith('# Lena\n19 · First-year nursing student at the college')).toBe(true);
    expect(md).toContain('- The college library is full by 2 p.m.');
  });
});

describe('competitor positioning map', () => {
  const s = example<MapState>('market-map-corner-brew');
  const pts = s.brands.map((b) => ({ id: b.id, name: b.name, x: b.x, y: b.y }));

  it('finds the open spaces, the head-to-head rivals and the nearest rival', () => {
    const sp = openSpaces(pts, { min: 0, max: 10 });
    // Centre (5.25, 2.5): nearest seller Saltmarsh at √(2.35² + 0.9²) = 2.516, Daybreak at √(2.25² + 0.7²) = 2.356 → radius 2.356
    expect(sp[0]?.x).toBe(5.25);
    expect(sp[0]?.y).toBe(2.5);
    expect(sp[0]?.r).toBeCloseTo(2.3564, 4);
    // Centre (2.25, 7.75): limited by the left edge, 2.25 (Corner Brew is √(1.75² + 1.85²) = 2.547 away)
    expect(sp[1]?.x).toBe(2.25);
    expect(sp[1]?.y).toBe(7.75);
    expect(sp[1]?.r).toBeCloseTo(2.25, 9);
    // Daybreak and Quickcup: √(1.4² + 1.4²) = 1.980, within a fifth of the scale (2.0)
    expect(clusters(pts, { min: 0, max: 10 })).toEqual([{ a: 'Daybreak', b: 'Quickcup', d: expect.closeTo(1.9799, 4) }]);
    // Corner Brew to Harbour Roast: √(2.4² + 0.9²) = 2.563
    expect(nearestRival(pts, 'cornerbrew')).toEqual({ name: 'Harbour Roast', d: expect.closeTo(2.5632, 4) });
  });

  it('describes places on the map in the axes’ own words', () => {
    const xa = { id: 'x', label: 'Price', low: 'Low price', high: 'High price' };
    const ya = { id: 'y', label: 'Perceived quality', low: 'Low perceived quality', high: 'High perceived quality' };
    expect(describeSpot(2.25, 7.75, xa, ya, { min: 0, max: 10 })).toBe('low price, high perceived quality');
    expect(describeSpot(5.25, 2.5, xa, ya, { min: 0, max: 10 })).toBe('the middle of the price scale, low perceived quality');
    expect(readMap(s).reading).toContain('The next is around low price, high perceived quality.');
  });

  it('turns the gap test into a verdict', () => {
    expect(gapVerdict(s.test).verdict).toBe('evidence');
    expect(gapVerdict({ ...s.test, demand: 'yes', rivals: 'yes' }).verdict).toBe('promising');
    expect(gapVerdict({ ...s.test, demand: 'no' }).verdict).toBe('avoid');
  });

  it('rejects scores off the scale and repeated names', () => {
    const bad = structuredClone(s);
    bad.brands[0]!.x = 11;
    bad.brands[1]!.name = 'Corner Brew';
    expect(validateMap(bad).map((p) => p.message)).toEqual(expect.arrayContaining(['Use a score from 0 to 10.', 'Another seller has this name.']));
  });
});

describe('market research questionnaire builder', () => {
  const s = example<QuestionnaireState>('market-questionnaire-corner-brew');
  const q = (text: string, extra: Partial<Question> = {}): Question => ({ id: 'q', type: 'single', text, options: [], low: '', high: '', required: true, ...extra });

  it('flags the two badly written questions in the worked example, and no others', () => {
    const flagged = s.questions.map((x, i) => [x.id, questionChecks(x, i + 1).filter((c) => c.level === 'conflict' || c.level === 'tension').length]);
    expect(flagged).toEqual([
      ['q1', 0],
      ['q2', 0],
      ['q3', 1],
      ['q4', 1],
      ['q5', 0],
      ['q6', 0],
      ['q7', 0],
      ['q8', 0],
    ]);
    expect(questionChecks(s.questions[2]!, 3)[0]?.text).toMatch(/^Possibly leading/);
    expect(questionChecks(s.questions[3]!, 4)[0]?.text).toContain('“refills and fast”');
    // Asking what people would pay is a note, not a fault.
    expect(questionChecks(s.questions[5]!, 6).map((c) => c.level)).toEqual(['note']);
  });

  it('catches leading, loaded, double-barrelled and badly scaled questions', () => {
    expect(questionChecks(q("Our coffee is great, isn't it?"), 1)[0]?.text).toMatch(/^Possibly leading/);
    expect(questionChecks(q('How much do you love our amazing cakes?'), 1).map((c) => c.text.slice(0, 30))).toEqual(expect.arrayContaining(['Possibly leading: “amazing” is']));
    expect(questionChecks(q('Is the café clean and friendly?', { type: 'yesno' }), 1)[0]?.text).toMatch(/^Possibly double-barrelled/);
    // "Between 2 and 5" joins numbers, not two questions.
    expect(questionChecks(q('Would you visit between 2 and 5 p.m.?', { type: 'yesno' }), 1).some((c) => c.text.includes('double-barrelled'))).toBe(false);
    expect(questionChecks(q('Rate our service', { type: 'scale', low: 'Good', high: 'Excellent' }), 1).some((c) => c.text.startsWith('Unbalanced scale'))).toBe(true);
    expect(questionChecks(q("Don't you never visit cafés?"), 1).some((c) => c.text.startsWith('Possible double negative'))).toBe(true);
    expect(questionChecks(q('What is your income?'), 1).some((c) => c.text.startsWith('Sensitive'))).toBe(true);
    // A rating question is not a hypothetical one.
    expect(questionChecks(q('How would you rate the coffee?', { type: 'scale', low: 'Very poor', high: 'Very good' }), 1)).toEqual([]);
  });

  it('reads answer ranges and finds overlaps and gaps', () => {
    expect(parseRange('$2 to $2.99')).toEqual({ lo: 2, hi: 2.99, loOpen: false, hiOpen: false, dp: 2 });
    expect(parseRange('Under $2')).toMatchObject({ lo: -Infinity, hi: 2, hiOpen: true });
    expect(parseRange('3 or more times a week')).toMatchObject({ lo: 3, hi: Infinity });
    expect(parseRange('Never')).toBeNull();
    expect(rangeProblems(['$5 to $10', '$10 to $15']).overlaps).toEqual([['$5 to $10', '$10 to $15']]);
    expect(rangeProblems(['1 to 2', '4 or more']).gaps).toEqual([['1 to 2', '4 or more']]);
    expect(rangeProblems(['Under $2', '$2 to $2.99', '$3 to $3.99', '$4 or more'])).toEqual({ overlaps: [], gaps: [] });
  });

  it('sets quotas that add up, and works out the margin of error for a random sample', () => {
    // 40%, 35% and 25% of 120 = 48, 42, 30
    expect(quotaCounts(s.quotas, 120).map((r) => r.count)).toEqual([48, 42, 30]);
    // Thirds of 100: 33.33 each; the largest remainder goes to the first group
    expect(quotaCounts([{ id: 'a', group: 'A', share: 1 }, { id: 'b', group: 'B', share: 1 }, { id: 'c', group: 'C', share: 1 }], 100).map((r) => r.count)).toEqual([34, 33, 33]);
    // 1.96 × √(0.25 ÷ 100) = 0.098: ±9.8 points
    expect(marginOfError(100)).toBeCloseTo(9.8, 9);
    // With 120 of 2,400: 1.96 × √(0.25 ÷ 120) × √(2,280 ÷ 2,399) = 8.72 points
    expect(marginOfError(120, 2400)).toBeCloseTo(8.7214, 4);
    expect(samplingNotes(s).quotas.map((r) => r.count)).toEqual([48, 42, 30]);
    expect(samplingNotes({ ...s, method: 'random' }).moe).toBeCloseTo(8.7214, 4);
    expect(samplingNotes({ ...s, method: 'convenience' }).moe).toBeNull();
    expect(levels(surveyChecks(s)).filter((l) => l === 'conflict' || l === 'tension')).toEqual([]);
  });
});

describe('product life cycle simulator', () => {
  const s = example<PlcState>('market-plc-corner-brew');

  it('shapes sales through the stages', () => {
    expect([0, 1, 2, 4, 5, 7, 8, 10].map((y) => stageOf(s, y))).toEqual(['Development', 'Introduction', 'Growth', 'Growth', 'Maturity', 'Maturity', 'Decline', 'Decline']);
    // Growth eases towards the peak: 3,600 + 20,400 × (1 − (2/3)²) = 3,600 + 20,400 × 5/9 = 14,933.33
    expect(baseUnits(s, 2)).toBeCloseTo(14933.3333, 4);
    // 3,600 + 20,400 × (1 − (1/3)²) = 21,733.33; then the peak; then 24,000 × 0.8³ = 12,288
    expect(baseUnits(s, 3)).toBeCloseTo(21733.3333, 4);
    expect(baseUnits(s, 4)).toBe(24000);
    expect(baseUnits(s, 10)).toBeCloseTo(12288, 9);
  });

  it('works out profit, cash flow and payback year by year', () => {
    const r = simulate(s, false);
    const y = (n: number) => r.years[n]!;
    // Year 1: 3,600 × 2.20 = 7,920 contribution − 16,000 fixed − 10,000 launch promotion = −18,080;
    // cash also loses 12% of 12,600 revenue to stock and credit: −18,080 − 1,512 = −19,592
    expect(y(1).profit).toBeCloseTo(-18080, 6);
    expect(y(1).cash).toBeCloseTo(-19592, 6);
    // Year 2: 14,933.33 × 2.20 = 32,853.33 − 16,000 − 10% of 52,266.67 − 4,000 depreciation = 7,626.67 profit;
    // cash: 7,626.67 + 4,000 − 24,000 equipment − 12% × (52,266.67 − 12,600) = −17,133.33
    expect(y(2).profit).toBeCloseTo(7626.6667, 4);
    expect(y(2).cash).toBeCloseTo(-17133.3333, 4);
    // Year 5 (maturity): 24,000 × 2.20 = 52,800 − 16,000 − 4% of 84,000 − 4,000 = 29,440
    expect(y(5).profit).toBeCloseTo(29440, 6);
    expect(r.firstProfit).toBe(2);
    expect(r.firstCash).toBe(3);
    expect(r.payback).toBe(5);
    expect(r.peakNeed).toBeCloseTo(-54725.3333, 4);
    expect(r.peakNeedYear).toBe(2);
    expect(r.totalProfit).toBeCloseTo(156259.5733, 3);
    expect(lossYear(s)).toBe(13);
  });

  it('shows what an extension strategy adds, and what a price cut does to profit', () => {
    const v = plcView(s);
    // A new version from year 7: +20%, +16%, +12%, +8% of sales, for 6,000.
    expect(v.ext.years[7]?.units).toBeCloseTo(28800, 6);
    expect(v.ext.years[10]?.units).toBeCloseTo(12288 * 1.08, 6);
    expect(v.addedProfit).toBeCloseTo(16451.2512, 3);
    const cut = structuredClone(s);
    cut.extensions.forEach((e) => (e.on = e.id === 'price-cut'));
    const c = plcView(cut);
    // From year 7: price 3.15, units +15%: revenue rises (×1.035) but contribution falls (×1.15 × 1.85 ÷ 2.20 = ×0.967)
    expect(c.ext.years[7]?.revenue).toBeGreaterThan(c.base.years[7]?.revenue ?? 0);
    expect(c.ext.years[7]?.contribution).toBeCloseTo(24000 * 1.15 * 1.85, 6);
    expect(c.addedProfit).toBeLessThan(0);
    expect(validatePlc({ ...s, peak: 100 }).map((p) => p.where)).toContain('peak');
  });
});

describe('marketing campaign planner', () => {
  const s = example<CampaignState>('market-campaign-corner-brew');

  it('estimates the funnel against the objective', () => {
    const f = funnel(s);
    // 2,400 × 55% = 1,320 aware; × 20% = 264 try it; × 18% = 47.52 regulars; × 1.1 visits × $3.50 = $182.95 a week
    expect(f.aware).toBeCloseTo(1320, 9);
    expect(f.tried).toBeCloseTo(264, 9);
    expect(f.regulars).toBeCloseTo(47.52, 9);
    expect(f.weekly).toBeCloseTo(182.952, 9);
    // The objective's gap is 900 − 720 = 180: 182.952 ÷ 180 = 101.6%
    expect(f.coverage).toBeCloseTo(101.64, 9);
    expect(objectiveChange(s)).toBeCloseTo(25, 9);
  });

  it('checks the budget, the timeline and the KPIs', () => {
    expect(plannedSpend(s)).toBe(3000);
    expect(campaignLine(s)).toBe('below');
    expect(reviewWeeks(s)).toEqual([4, 8, 12, 16, 20, 24, 26]);
    expect(levels(campaignChecks(s)).filter((l) => l === 'conflict' || l === 'tension')).toEqual([]);
    const late = structuredClone(s);
    late.channels[0]!.end = 30;
    late.channels[1]!.cost = 900;
    late.kpis.forEach((k) => (k.primary = false));
    const texts = campaignChecks(late).filter((c) => c.level === 'conflict').map((c) => c.about);
    expect(texts).toEqual(expect.arrayContaining(['Budget', 'Timeline', 'KPIs']));
    const mixed = structuredClone(s);
    mixed.channels[0]!.line = 'above';
    expect(campaignLine(mixed)).toBe('through');
  });
});

describe('marketing budget allocation', () => {
  const s = example<BudgetState>('market-budget-corner-brew');
  const posts = s.channels[0]!;

  it('models reach with diminishing returns', () => {
    // 2,400 × (1 − e^(−1,000 ÷ 250)) = 2,400 × (1 − 0.0183156) = 2,356.0425 reached; 6% = 141.36 customers
    expect(reach(posts, 1000)).toBeCloseTo(2356.0425, 3);
    expect(customers(posts, 1000)).toBeCloseTo(141.3625, 3);
    // The next customer costs 250 × e⁴ ÷ (2,400 × 0.06) = 94.79
    expect(1 / marginalCustomers(posts, 1000)).toBeCloseTo(94.7884, 3);
    const r = channelResult(posts);
    // The first $100 wins 144 × (1 − e^(−0.4)) = 47.47; at $1,000 the next $100 wins 144 × (e^(−4) − e^(−4.4)) = 0.87
    expect(r.first100).toBeCloseTo(47.4740, 3);
    expect(r.next100).toBeCloseTo(0.8695, 3);
  });

  it('compares the first draft with the suggested split', () => {
    const v = budgetView(s);
    expect(v.yours.spend).toBe(1800);
    expect(v.yours.customers).toBeCloseTo(247.2205, 3);
    expect(v.yours.cpa).toBeCloseTo(7.2809, 3);
    expect(v.suggestedSpends).toEqual([661.5, 297, 598.5, 243, 0]);
    expect(v.suggested.customers).toBeCloseTo(263.9898, 3);
    // At the suggested split, the next customer costs about the same in every channel used.
    const m = v.suggested.results.filter((r) => r.spend > 0).map((r) => r.marginalCpa ?? 0);
    expect(Math.max(...m) - Math.min(...m)).toBeLessThan(0.6);
    expect(suggestSplit(s.channels, 0)).toEqual([0, 0, 0, 0, 0]);
    // Rounded to whole dollars without leaving the budget: 661.5 + 297 + 598.5 + 243 = 1,800 becomes 662 + 297 + 598 + 243
    expect(roundSplit(v.suggestedSpends)).toEqual([662, 297, 598, 243, 0]);
    expect(validateBudget({ ...s, channels: [{ ...posts, k: 0 }] }).map((p) => p.where)).toEqual(['posts-k']);
  });
});
