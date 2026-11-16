/**
 * The Boardroom Briefings: every briefing validates and passes its integrity
 * check; the check catches the mistakes it exists for; the formula engine and
 * the text scan work figures as a student would; and each briefing's key
 * results are reworked here with the platform's own finance, ratio, market,
 * operations, decision tree and unit economics functions, independently of
 * the formulas written in the YAML.
 */
import { describe, expect, it } from 'vitest';
import { checkBoardroomBriefings } from '../../src/lib/boardroom-briefings/integrity';
import {
  accountedFor,
  cellOf,
  evaluate,
  figureTokens,
  isYearOrCount,
  roundTo,
  sameAt,
  unaccounted,
  weightedScores,
  workFigures,
  decimalsOf,
} from '../../src/lib/boardroom-briefings/figures';
import { boardroomBriefingSchema, type BoardroomBriefing } from '../../src/lib/boardroom-briefings/schema';
import { ANALYSIS_SECTIONS, DECISION_TYPE_LABELS, issueNo, moneyUnit, STUDENT_SECTIONS, toolHref } from '../../src/lib/boardroom-briefings/series';
import { EDITION_NOTES, editionAddress, isEdition } from '../../src/lib/boardroom-briefings/editions';
import { linkExhibits } from '../../src/lib/boardroom-briefings/render';
import { arr, discountFactor, npv, payback, type Project } from '../../src/lib/investment';
import { breakEvenExact, labourTurnover, percentChange } from '../../src/lib/finance';
import { gearingRatio, profitMargin, roce } from '../../src/lib/ratios';
import { growthRate, marketShare } from '../../src/lib/market';
import { capacityModel } from '../../src/lib/operations';
import { evaluateOption } from '../../src/lib/decision-tree';
import { unitEconomics } from '../../src/lib/lab/unit-economics';
import { briefingContext, loadBriefings } from './helpers/boardroom-briefings';

const items = loadBriefings();
const ctx = briefingContext();
const messages = (all: Record<string, BoardroomBriefing>) => checkBoardroomBriefings(all, ctx).map((p) => p.message);

const r1 = (v: number | null) => roundTo(v ?? NaN, 1);
const r2 = (v: number | null) => roundTo(v ?? NaN, 2);

/** A briefing by its file name. */
function briefing(id: string): BoardroomBriefing {
  const b = items[id];
  if (!b) throw new Error(`no briefing ${id}`);
  return b;
}

/** A numeric cell of an exhibit, student or analysis. */
function cell(b: BoardroomBriefing, ex: string, row: string, col: string): number {
  const e = [...b.exhibits, ...b.analysis.exhibits].find((x) => x.id === ex);
  if (!e) throw new Error(`no exhibit ${ex}`);
  const v = cellOf(e, row, col);
  if (typeof v === 'string') throw new Error(v);
  return v;
}

/** A row of numbers from an exhibit, by its first cell. */
function rowOf(b: BoardroomBriefing, ex: string, row: string): number[] {
  const e = [...b.exhibits, ...b.analysis.exhibits].find((x) => x.id === ex);
  const r = e?.rows?.find((x) => String(x[0]) === row);
  if (!r) throw new Error(`no row ${row} in ${ex}`);
  return r.slice(1).map((v) => (typeof v === 'number' ? v : NaN));
}

const project = (flows: number[]): Project => ({ id: 'p', label: 'p', capitalCost: -(flows[0] ?? 0), returns: flows.slice(1) });

/* ------------------------------------------------------------------ */
/* The series                                                          */
/* ------------------------------------------------------------------ */

describe('the series', () => {
  it('passes its integrity check', () => {
    const problems = checkBoardroomBriefings(items, ctx).map((p) => `${p.where}: ${p.message}`);
    expect(problems).toEqual([]);
  });

  it('asks the ten questions, one briefing each, numbered 1 to 10', () => {
    const list = Object.values(items).sort((a, b) => a.number - b.number);
    expect(list.map((b) => b.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    // The questions as set, in the platform's spelling (Oxford -ize, as the IB guide writes "organizational").
    expect(list.map((b) => b.question)).toEqual([
      'Should a company enter a new international market?',
      'Should a business acquire a competitor?',
      'How should a company respond to declining profitability?',
      'Should a business automate its operations?',
      'How should a CEO manage a major organizational crisis?',
      'Should a start-up prioritize growth or profitability?',
      'How should a company respond to a disruptive competitor?',
      'Should a business vertically integrate its supply chain?',
      'How should a company balance shareholder returns with long-term investment?',
      'How should a company respond to reputational damage?',
    ]);
  });

  it('covers ten industries and ten kinds of decision', () => {
    const list = Object.values(items);
    expect(new Set(list.map((b) => b.industry)).size).toBe(10);
    expect(new Set(list.map((b) => b.decisionType)).size).toBe(10);
    for (const b of list) expect(DECISION_TYPE_LABELS[b.decisionType].label.length).toBeGreaterThan(0);
  });

  it('is about fictional companies, labelled so and sourced so', () => {
    for (const [id, b] of Object.entries(items)) {
      expect(b.company.fictional, id).toBe(true);
      for (const e of [...b.exhibits, ...b.analysis.exhibits]) expect(e.provenance, `${id} ${e.id}`).toBe('simulated-data');
      expect(b.sources, id).toContain('bbr-method');
    }
  });

  it('gives each briefing the parts of a board paper in both editions', () => {
    expect(STUDENT_SECTIONS.map((s) => s.title)).toEqual([
      'Executive summary',
      'Business background',
      'Strategic context',
      'Relevant evidence',
      'Financial information',
      'Stakeholder implications',
      'The strategic options',
      'Evaluation criteria',
      'Discussion questions',
    ]);
    const analysis = ANALYSIS_SECTIONS.map((s) => s.title).join(' | ');
    for (const part of ['Executive summary', 'evidence', 'assumptions', 'trade-offs', 'alternatives', 'recommended course of action', 'Implementation', 'Evaluation', 'Limitations']) {
      expect(analysis).toContain(part);
    }
    for (const b of Object.values(items)) {
      expect(b.options.length).toBeGreaterThanOrEqual(3);
      expect(b.stakeholders.length).toBeGreaterThanOrEqual(4);
      expect(b.analysis.alternatives).toHaveLength(b.options.length);
      expect(b.questions.course.length + b.questions.seminar.length).toBeGreaterThanOrEqual(5);
    }
  });

  it('recommends the option its own scores rank first, in every briefing', () => {
    for (const [id, b] of Object.entries(items)) {
      const totals = weightedScores(b);
      const best = [...totals.entries()].sort((x, y) => y[1] - x[1])[0]?.[0];
      expect(b.analysis.recommendation.option, id).toBe(best);
      expect(b.analysis.recommendation.departsFromScores, id).toBeUndefined();
    }
  });

  it('labels the money each briefing is in', () => {
    expect(moneyUnit(briefing('international-market-entry').currency)).toBe('GBP, in thousands (£000)');
    expect(moneyUnit(briefing('declining-profitability').currency)).toBe('CAD, in millions (C$m)');
    expect(issueNo(3)).toBe('No. 03');
  });
});

/* ------------------------------------------------------------------ */
/* The formula engine                                                  */
/* ------------------------------------------------------------------ */

describe('the formula engine', () => {
  const none = (ref: string): number => {
    throw new Error(`no ${ref}`);
  };

  it('rounds half away from zero, without binary noise', () => {
    expect(roundTo(2.675, 2)).toBe(2.68);
    expect(roundTo(-2.5, 0)).toBe(-3);
    expect(roundTo(651.945, 1)).toBe(651.9);
    expect(roundTo(563.475, 2)).toBe(563.48);
    expect(decimalsOf(4.5)).toBe(1);
    expect(decimalsOf(420)).toBe(0);
    expect(sameAt(3.5, 3.526, 1)).toBe(true);
    expect(sameAt(3.6, 3.526, 1)).toBe(false);
  });

  it('works arithmetic with the usual precedence', () => {
    expect(evaluate('1 + 2 * 3', none)).toBe(7);
    expect(evaluate('(1 + 2) * 3', none)).toBe(9);
    expect(evaluate('-2 * -3', none)).toBe(6);
    expect(evaluate('10 / 4 - 1', none)).toBe(1.5);
    expect(evaluate('{a} + {b}', (r) => (r === 'a' ? 2 : 3))).toBe(5);
    expect(evaluate('sum(1, 2, 3) + max(4, 9) - min(4, 9) + abs(-1)', none)).toBe(12);
  });

  it('works payback, ARR and NPV exactly as the Financial Laboratory does', () => {
    const flows = [-1800, 100, 450, 750, 950, 1050];
    expect(evaluate(`payback(${flows.join(', ')})`, none)).toBeCloseTo(payback(project(flows))?.total ?? NaN, 9);
    expect(evaluate(`arr(${flows.join(', ')})`, none)).toBeCloseTo(arr(project(flows)) ?? NaN, 9);
    expect(evaluate(`npv(10, ${flows.join(', ')})`, none)).toBeCloseTo(npv(project(flows), 10) ?? NaN, 9);
    expect(evaluate('df(8, 3)', none)).toBe(discountFactor(8, 3));
  });

  it('refuses what it cannot work', () => {
    expect(() => evaluate('npv(9, -100, 50, 60)', none)).toThrow(/guide's rates/);
    expect(() => evaluate('payback(100, 50)', none)).toThrow(/negative/);
    expect(() => evaluate('payback(-100, 10, 10)', none)).toThrow(/not recovered/);
    expect(() => evaluate('1 +', none)).toThrow();
    expect(() => evaluate('2 $ 3', none)).toThrow(/unexpected/);
    expect(() => evaluate('nope(1)', none)).toThrow(/unknown function/);
    expect(() => evaluate('1 / 0', none)).toThrow(/finite/);
  });
});

/* ------------------------------------------------------------------ */
/* Reading figures in text                                             */
/* ------------------------------------------------------------------ */

describe('the text scan', () => {
  const tokens = (s: string) => figureTokens(s).map((t) => t.text);

  it('finds money, percentages and plain figures, and leaves references and dates', () => {
    expect(tokens('Revenue rose to £38.6m, a margin of 10%, from 29,400 in 2023.')).toEqual(['£38.6m', '10%', '29,400', '2023']);
    expect(tokens('See Exhibit 3 and Exhibits 1 and A2, subtopic 3.8, on 14 March, in Exhibit 12.')).toEqual([]);
    expect(tokens('All figures in £000 and US$000.')).toEqual([]);
    expect(tokens('a fall of −£120k')).toEqual(['−£120k']);
  });

  it('ignores years and small counts, but never money or a percentage', () => {
    const t = (s: string) => figureTokens(s)[0]!;
    expect(isYearOrCount(t('in 2025'))).toBe(true);
    expect(isYearOrCount(t('nine of 12'))).toBe(true);
    expect(isYearOrCount(t('£12'))).toBe(false);
    expect(isYearOrCount(t('7%'))).toBe(false);
    expect(isYearOrCount(t('2.5'))).toBe(false);
  });

  it('accounts for a figure at the precision it is written, in the briefing\'s units', () => {
    const t = (s: string) => figureTokens(s)[0]!;
    // A briefing kept in thousands: 2,412 thousand reads as £2.4m, and 412 as £412k.
    expect(accountedFor(t('£2.4m'), [2412], 1000)).toBe(true);
    expect(accountedFor(t('£2.5m'), [2412], 1000)).toBe(false);
    expect(accountedFor(t('£412k'), [412], 1000)).toBe(true);
    expect(accountedFor(t('12.5%'), [12.46], 1000)).toBe(true);
    expect(accountedFor(t('12.5%'), [12.44], 1000)).toBe(false);
    // A loss is quoted without its sign.
    expect(accountedFor(t('a loss of £120k'), [-120], 1000)).toBe(true);
  });

  it('links exhibits named in the text, one by one', () => {
    const ids = new Set(['ex-1', 'ex-2', 'ex-A1']);
    expect(linkExhibits('<p>See Exhibit 1.</p>', ids)).toBe('<p>See <a href="#ex-1">Exhibit 1</a>.</p>');
    expect(linkExhibits('(Exhibits 2 and A1)', ids)).toBe('(Exhibits <a href="#ex-2" aria-label="Exhibit 2">2</a> and <a href="#ex-A1" aria-label="Exhibit A1">A1</a>)');
    expect(linkExhibits('Exhibit 9', ids)).toBe('Exhibit 9');
  });
});

/* ------------------------------------------------------------------ */
/* The integrity check catches the mistakes it exists for               */
/* ------------------------------------------------------------------ */

describe('the integrity check catches', () => {
  const id = 'international-market-entry';
  const mutate = (change: (b: BoardroomBriefing) => void) => {
    const copy = structuredClone(items);
    change(copy[id]!);
    return messages(copy);
  };

  it('a cell that its check does not rework', () => {
    const msgs = mutate((b) => {
      const row = b.exhibits.find((e) => e.id === 'ex-1')!.rows![2]!;
      row[4] = 11.0; // 2025's operating margin, really 10.0
    });
    expect(msgs.some((m) => m.includes('row "2025", column "Operating profit margin (%)": printed 11'))).toBe(true);
  });

  it('a declared figure that does not work out', () => {
    const msgs = mutate((b) => {
      b.figures.find((f) => f.id === 'japan-growth')!.value = 120.0;
    });
    expect(msgs.some((m) => m.includes('figure "japan-growth"'))).toBe(true);
  });

  it('a figure in the text that the model does not account for', () => {
    const msgs = mutate((b) => {
      b.background[1] = `${b.background[1]} Revenue reached £39.9m.`;
    });
    expect(msgs.some((m) => m.includes('"£39.9m" is not a cell'))).toBe(true);
  });

  it('a figure in the strategic context', () => {
    const msgs = mutate((b) => {
      b.context[0] = 'The skincare market grew by 7% last year.';
    });
    expect(msgs.some((m) => m.includes('strategic context paragraph 1 contains figures (7%)'))).toBe(true);
  });

  it('research without a source, and a source that is not in the register', () => {
    const msgs = mutate((b) => {
      b.evidence[3]!.sources = [];
      b.sources.push('bbr-no-such-source');
    });
    expect(msgs.some((m) => m.includes('is research, so it must cite a source'))).toBe(true);
    expect(msgs.some((m) => m.includes('"bbr-no-such-source" is not in the source register'))).toBe(true);
  });

  it('a fictional company with real evidence, or a real company without it', () => {
    const fictional = mutate((b) => {
      b.exhibits[0]!.provenance = 'external-evidence';
      b.sources.push('mcd-10k-2025');
      b.evidence[0]!.sources = ['mcd-10k-2025'];
    });
    expect(fictional.some((m) => m.includes('must be labelled simulated-data'))).toBe(true);
    expect(fictional.some((m) => m.includes('real evidence cannot support a fictional company'))).toBe(true);
    const real = mutate((b) => {
      b.company.fictional = false;
    });
    expect(real.some((m) => m.includes('must be labelled external-evidence'))).toBe(true);
    expect(real.some((m) => m.includes('must cite at least one of its own documents or a press report'))).toBe(true);
  });

  it('an option left unjudged, unscored or scored wrongly', () => {
    const msgs = mutate((b) => {
      b.analysis.alternatives.pop();
      b.analysis.scores[0]!.total = 4.2;
      b.criteria[0]!.weight = 35;
    });
    expect(msgs.some((m) => m.includes('does not judge option D'))).toBe(true);
    expect(msgs.some((m) => m.includes("option A's weighted score is stated as 4.2"))).toBe(true);
    expect(msgs.some((m) => m.includes('weights add up to 105'))).toBe(true);
  });

  it('a recommendation that ignores the scores without saying why', () => {
    const msgs = mutate((b) => {
      b.analysis.recommendation.option = 'B';
    });
    expect(msgs.some((m) => m.includes('say why under departsFromScores'))).toBe(true);
  });

  it('references that do not resolve, and HL material left unmarked', () => {
    const msgs = mutate((b) => {
      b.frameworks.push({ id: 'no-such-framework', use: 'x' });
      b.tools.push({ kind: 'calculator', id: 'no-such-calculator', use: 'x' });
      b.course.terms.push('market-entry-mode');
      b.course.subtopics.find((s) => s.code === '4.6')!.level = 'SL/HL';
      b.questions.course.find((q) => q.id === 'threats')!.level = 'SL/HL';
    });
    expect(msgs.some((m) => m.includes('framework "no-such-framework" is not in the frameworks library'))).toBe(true);
    expect(msgs.some((m) => m.includes('calculator tool "no-such-calculator" does not exist'))).toBe(true);
    expect(msgs.some((m) => m.includes('"market-entry-mode" is beyond the IB course'))).toBe(true);
    expect(msgs.some((m) => m.includes('subtopic 4.6 is HL only, so its connection must be marked level: HL'))).toBe(true);
    expect(msgs.some((m) => m.includes('subtopic 4.6 is HL only, so the question must be marked HL'))).toBe(true);
  });

  it('a gap in the numbering of the series', () => {
    const copy = structuredClone(items);
    copy[id]!.number = 11;
    expect(messages(copy).some((m) => m.includes('numbered 1 to 10 with no gap'))).toBe(true);
  });

  it('a value that a flow-style comma has cut short', () => {
    const raw = structuredClone(items[id]!) as unknown as Record<string, unknown>;
    (raw.tools as Array<Record<string, unknown>>)[0] = { kind: 'studio', id: 'option-appraisal', use: 'Score the routes', 'with your own weights.': null };
    expect(boardroomBriefingSchema.safeParse(raw).success).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Each briefing's key figures, reworked with the platform's functions  */
/* ------------------------------------------------------------------ */

describe('No. 1, international market entry', () => {
  const b = briefing('international-market-entry');
  const route = (label: string) => project(rowOf(b, 'ex-4', label).slice(0, 6));

  it('appraises the three routes as the Financial Laboratory would', () => {
    const rows = ['A. Distributor (Kasumi Trading)', 'B. Joint venture (Hinata Drugstores)', 'C. Subsidiary of its own'];
    for (const label of rows) {
      const p = route(label);
      expect(r1(payback(p)?.total ?? NaN), label).toBe(cell(b, 'ex-A1', label, 'Payback (years)'));
      expect(r1(arr(p)), label).toBe(cell(b, 'ex-A1', label, 'ARR (%)'));
      expect(r1(npv(p, 10)), label).toBe(cell(b, 'ex-A1', label, 'NPV at 10%'));
    }
    expect([r1(npv(route(rows[0]!), 10)), r1(npv(route(rows[1]!), 10)), r1(npv(route(rows[2]!), 10))]).toEqual([613.3, 527.1, 152]);
  });

  it('shows the yen hurting only the routes that earn in yen', () => {
    const weaker = (label: string) => {
      const p = route(label);
      return r1(npv({ ...p, returns: p.returns.map((x) => x * 0.9) }, 10));
    };
    expect(weaker('B. Joint venture (Hinata Drugstores)')).toBe(294.4);
    expect(weaker('C. Subsidiary of its own')).toBe(-223.2);
  });

  it('works route B by hand, as the question asks', () => {
    const p = route('B. Joint venture (Hinata Drugstores)');
    const pb = payback(p);
    expect(pb?.years).toBe(3);
    expect(r1(pb?.months ?? NaN)).toBe(6.3);
    expect(r1(arr(p))).toBe(16.7);
  });

  it('keeps the margins, the orders and the survey consistent', () => {
    expect(r1(profitMargin(3860, 38600))).toBe(10);
    expect(r1(percentChange(520, 1140))).toBe(119.2);
    expect(r2(cell(b, 'ex-2', 'Online orders shipped to Japan, full year', 'Revenue (£000)') * 1000 / 13400)).toBe(85.07);
    const prefer = ['drugstore', 'department store', 'online'].map((w) => cell(b, 'ex-3', `Prefer to buy skincare ${w === 'online' ? 'online' : `in a ${w}`}`, 'Answering yes (%)'));
    expect(prefer.reduce((s, x) => s + x, 0)).toBe(100);
  });
});

describe('No. 2, acquiring a competitor', () => {
  const b = briefing('acquiring-a-competitor');

  it('gives each operator its market share and the market its growth', () => {
    const total = 600;
    expect(r1(marketShare(cell(b, 'ex-2', 'Quarrystone Climbing (four Dublin centres)', '2025'), total))).toBe(38);
    expect(r1(marketShare(cell(b, 'ex-2', 'Brackenhold Bouldering (three centres)', '2025'), total))).toBe(27);
    expect(r1(growthRate(560, 600))).toBe(7.1);
  });

  it('works the gearing ratio before and after the purchase', () => {
    expect(r1(gearingRatio(2400, 6000))).toBe(28.6);
    expect(r1(gearingRatio(5400, 6000))).toBe(47.4);
    expect(r1(gearingRatio(4800, 6000))).toBe(44.4);
  });

  it('values the purchase at each price and level of savings', () => {
    const value = (price: number, savings: number) => r1(npv(project([-price, 378 + savings / 2 - 400, ...Array(9).fill(378 + savings)]), 8));
    expect([value(3600, 300), value(3600, 150), value(3600, 0)]).toEqual([440.1, -496.9, -1434]);
    expect([value(3000, 300), value(3000, 150), value(3000, 0)]).toEqual([1040.1, 103.1, -834]);
    // Only the walk-away price survives a shortfall of half the savings.
    expect(value(3000, 150)).toBeGreaterThan(0);
    expect(value(3600, 150)).toBeLessThan(0);
  });
});

describe('No. 3, declining profitability', () => {
  const b = briefing('declining-profitability');

  it('works the profit margin and ROCE for each year', () => {
    expect([r1(profitMargin(13.8, 172.0)), r1(profitMargin(7.3, 181.5)), r1(profitMargin(1.9, 186.0))]).toEqual([8, 4, 1]);
    expect(r1(roce(1.9, 0, 64.0))).toBe(3);
    expect(r1(roce(13.8, 0, 60.0))).toBe(23);
  });

  it('works the load factor as a capacity utilization rate', () => {
    const lf = (pax: number, seats: number) => r1(capacityModel({ capacity: seats, output: pax, made: pax, rejected: 0, labourHours: 1, outputValue: 1, inputCost: 1, fixedCosts: 0 }).utilization);
    expect([lf(1040, 1520), lf(1090, 1640)]).toEqual([68.4, 66.5]);
    expect(cell(b, 'ex-4', 'All routes', 'Load factor (%)')).toBe(66.5);
  });

  it('works the fare rise with the price elasticity of demand', () => {
    const passengers = -0.6 * 8; // per cent change in quantity
    expect(passengers).toBeCloseTo(-4.8, 9);
    const revenue = 94.2 * ((1.08 * (1 + passengers / 100)) - 1);
    expect(r2(revenue)).toBe(2.65);
    expect(r1(revenue + 540 * 0.048 * 22 / 1000)).toBe(cell(b, 'ex-5', 'B. Raise fares by 8% on the four routes with no competitor', 'Added to operating profit each year from 2027'));
  });

  it('leaves only the cost programme in profit in 2027', () => {
    const profits = b.analysis.exhibits[0]!.rows!.slice(1).map((r) => [String(r[0]).slice(0, 1), r[2]]);
    expect(profits).toEqual([['A', -1.3], ['B', -1], ['C', 4.8], ['D', -3.4]]);
  });
});

describe('No. 4, automating operations', () => {
  const b = briefing('automating-operations');

  it('works break-even for each way of running the line', () => {
    expect(breakEvenExact(8960, 2.1, 1.46)).toBeCloseTo(14000, 6);
    expect(r1(breakEvenExact(10706, 2.1, 1.33))).toBe(13903.9);
    expect(r1(breakEvenExact(10916, 2.1, 1.33))).toBe(14176.6);
    expect(cell(b, 'ex-A2', 'Automated, bought', 'Break-even quantity (000 loaves)')).toBe(r1(breakEvenExact(10706, 2.1, 1.33)));
  });

  it('appraises the proposals with the guide\'s factors', () => {
    const flows = (capital: number, saving: number, oneOff: number) => project([-capital, saving - oneOff, ...Array(6).fill(saving)]);
    expect(r1(npv(flows(4200, 1540, 520), 8))).toBe(3336.2);
    expect(r1(payback(flows(4200, 1540, 520))?.total ?? NaN)).toBe(3.1);
    expect(r1(arr(flows(4200, 1540, 520)))).toBe(20.6);
    expect(r1(npv(flows(1300, 494, 120), 8))).toBe(1160.8);
    expect(r1(npv(flows(150, 220, 0), 8))).toBe(995.4);
    // Leasing needs no capital: its figure is the present value of its savings.
    const lease = [210, 730, 730, 730, 730, 730, 730].reduce((s, x, i) => s + x * discountFactor(8, i + 1), 0);
    expect(r1(lease)).toBe(3319.1);
  });

  it('works the labour turnover the people plan rests on', () => {
    expect(r1(labourTurnover(9, 38))).toBe(23.7);
    expect(9 * 18 / 12).toBe(13.5);
  });
});

describe('No. 5, leading through a crisis', () => {
  const b = briefing('leading-through-a-crisis');
  const branch = (row: string) => cell(b, 'ex-4', row, 'Total cost');

  it('works each response\'s expected cost as a decision tree would', () => {
    const tree = (rows: string[]) =>
      -evaluateOption({ id: 'x', label: 'x', cost: 0, outcomes: rows.map((row) => ({ label: row, probability: cell(b, 'ex-4', row, 'Probability'), payoff: -branch(row) })) }).expectedValue;
    expect(tree(["B. Restore fast from last night's backup: it works", "B. Restore fast from last night's backup: reinfected"])).toBeCloseTo(4899, 6);
    expect(tree(['C. Pay the ransom: the key works', 'C. Pay the ransom: the key fails'])).toBeCloseTo(7592, 6);
    expect(tree(['D. Hand deliveries to competitors for three weeks: customers stay', 'D. Hand deliveries to competitors for three weeks: a supermarket leaves'])).toBeCloseTo(5850, 6);
    expect(branch('A. Rebuild from offline backups, with a manual service for urgent customers')).toBe(3920);
  });

  it('can afford any outcome', () => {
    const worst = Math.max(...b.exhibits.find((e) => e.id === 'ex-4')!.rows!.map((r) => r[7] as number));
    expect(worst).toBe(9280);
    expect(9600 + 15000).toBeGreaterThan(2 * worst);
  });
});

describe('No. 6, growth or profitability', () => {
  const b = briefing('growth-or-profitability');

  it('works each city\'s lifetime value with the Entrepreneurship Lab\'s model', () => {
    const city = (row: string) => {
      const retention = cell(b, 'ex-2', row, 'Customers who book again the next year (%)');
      const u = unitEconomics({
        spend: cell(b, 'ex-2', row, 'Marketing (R$000)') * 1000,
        customers: cell(b, 'ex-2', row, 'New customers'),
        revenue: 72 / 12,
        variableCost: 0,
        churn: ((100 - retention) / 12),
        cap: 10000,
      });
      return [r2(u.cac), r1(u.ltv), r2(u.ratio), r1(u.payback)];
    };
    expect(city('São Paulo (since 2022)')).toEqual([90, 205.7, 2.29, 15]);
    expect(city('Belo Horizonte (since 2025)')).toEqual([210, 130.9, 0.62, 35]);
  });

  it('works the runway and the growth in bookings', () => {
    expect(r1(31000 / (15360 / 12))).toBe(24.2);
    expect(r1(growthRate(51000, 96000))).toBe(88.2);
    expect(r1(growthRate(22000, 51000))).toBe(131.8);
  });
});

describe('No. 7, a disruptive competitor', () => {
  it('works the change in enrolments and the margins', () => {
    expect(r1(percentChange(5400, 4100))).toBe(-24.1);
    expect(r1(percentChange(3600, 3700))).toBe(2.8);
    expect([r1(profitMargin(5994, 33300)), r1(profitMargin(3432, 28600))]).toEqual([18, 12]);
  });

  it('values the students the hybrid model keeps', () => {
    expect(Math.round(700 * (28600 * 1000 / 7800) / 1000)).toBe(2567);
    expect(Math.round(400 * (28600 * 1000 / 7800 - 49 * 12) / 1000)).toBe(1231);
  });
});

describe('No. 8, vertical integration', () => {
  const b = briefing('vertical-integration');

  it('works the cost to buy and the cost to make', () => {
    const ctb = 210 * 38;
    const ctm = 1450 + 210 * 24.5;
    expect([ctb, ctm, ctb - ctm]).toEqual([7980, 6595, 1385]);
    expect(cell(b, 'ex-4', "Roast in a roastery of Tallowood's own (cost to make)", 'Total cost (A$000 a year)')).toBe(ctm);
  });

  it('works the roaster\'s utilization and the value of each option', () => {
    expect(r1(capacityModel({ capacity: 700, output: 520, made: 520, rejected: 0, labourHours: 1, outputValue: 1, inputCost: 1, fixedCosts: 0 }).utilization)).toBe(74.3);
    const eight = (capital: number, saving: number) => r1(npv(project([-capital, ...Array(8).fill(saving)]), 8));
    expect(eight(3400, 1385)).toBe(4559);
    expect(eight(9000, 1874)).toBe(1769.1);
    expect(eight(9000, 3300)).toBe(9963.8);
    expect(eight(9000, 448)).toBe(-6425.5);
  });
});

describe('No. 9, shareholder returns or investment', () => {
  it('values building all at once against building in stages', () => {
    const tail = (x: number) => Array(6).fill(x);
    const b = { won: r1(npv(project([-250, -250, -90, 110, 160, ...tail(190)]), 8)), lost: r1(npv(project([-250, -250, -90, 50, 80, ...tail(100)]), 8)) };
    const c = { won: r1(npv(project([-150, -150, -290, 110, 160, ...tail(190)]), 8)), lost: r1(npv(project([-150, -150, 30, 40, 60, ...tail(70)]), 8)) };
    expect(b).toEqual({ won: 291.9, lost: -120.3 });
    expect(c).toEqual({ won: 313, lost: 50.5 });
    expect(r1(0.6 * b.won + 0.4 * b.lost)).toBe(127);
    expect(r1(0.6 * c.won + 0.4 * c.lost)).toBe(208);
  });

  it('works gearing and earnings per share under each option', () => {
    expect(r1(gearingRatio(300, 2140))).toBe(12.3);
    expect(r1(gearingRatio(700, 1740))).toBe(28.7);
    expect(r2(231 / 50)).toBe(4.62);
    expect(r2((231 - 8.4) / (50 - 400 / 62))).toBe(5.11);
  });
});

describe('No. 10, reputational damage', () => {
  const b = briefing('reputational-damage');

  it('weights the recycled content by the units sold', () => {
    const rows = ['Fleeces', 'Jackets', 'T-shirts and tops', 'Trousers'];
    const units = rows.map((r) => cell(b, 'ex-3', r, 'Units sold in 2025 (000)'));
    const content = rows.map((r) => cell(b, 'ex-3', r, 'Recycled content (%)'));
    const weighted = units.reduce((s, u, i) => s + u * (content[i] ?? 0), 0) / units.reduce((s, u) => s + u, 0);
    expect(r1(weighted)).toBe(61.6);
    expect(r1(content.reduce((s, x) => s + x, 0) / content.length)).toBe(61);
  });

  it('works the fall in revenue and the forecast profits', () => {
    expect(r1(percentChange(72400, 63900))).toBe(-11.7);
    expect(r1(profitMargin(2556, 63900))).toBe(4);
    expect(74500 * 0.09 - 1500).toBeCloseTo(5205, 6);
    expect(84000 * 0.09 - 600).toBeCloseTo(6960, 6);
  });
});

/* ------------------------------------------------------------------ */
/* Every briefing's own figures, and the tools it names                 */
/* ------------------------------------------------------------------ */

describe('every briefing', () => {
  it('declares figures that work out and accounts for every figure in its text', () => {
    for (const [id, b] of Object.entries(items)) {
      const { values, problems } = workFigures(b);
      expect(problems, id).toEqual([]);
      expect(unaccounted(b, values), id).toEqual([]);
    }
  });

  it('names tools that resolve to a page', () => {
    for (const [id, b] of Object.entries(items)) {
      for (const t of b.tools) expect(toolHref(t.kind, t.id, ctx.registry), `${id} ${t.kind}:${t.id}`).toMatch(/^\/[a-z-]+\/.*$/);
    }
  });
});

describe('the edition switch', () => {
  it('keeps the edition in the address', () => {
    expect(editionAddress('/boardroom-briefings/x/', '', 'analysis')).toBe('/boardroom-briefings/x/#analysis');
    expect(editionAddress('/boardroom-briefings/x/', '?a=1', 'student')).toBe('/boardroom-briefings/x/?a=1');
    expect(isEdition('analysis')).toBe(true);
    expect(isEdition('teacher')).toBe(false);
    expect(EDITION_NOTES.student).toContain('withheld');
  });
});
