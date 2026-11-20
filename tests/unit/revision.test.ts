/**
 * Quick revision: the sheets and the flashcard deck built from the content,
 * exactly as the build publishes them (src/lib/revision/), checked for stable
 * ids, codes and levels on every card, what each sheet gathers, the integrity
 * check catching the mistakes it exists for, and every figure in the
 * quantitative exercises reworked with the platform's own functions.
 */
import { describe, expect, it } from 'vitest';
import { buildRevision, recallSetCode, type RevisionData } from '../../src/lib/revision/build';
import { checkRevision, commandAllowed, subtopicsOf } from '../../src/lib/revision/integrity';
import { lhs, measureText, rhs, shape } from '../../src/lib/revision/formulae';
import { noteErrors, MAX_MISTAKES } from '../../src/lib/revision/sheet';
import { CARD_KINDS, recallIds, slugify } from '../../src/lib/flashcards';
import type { RevisionEntry } from '../../src/lib/revision/schema';
import { revisionInput } from './helpers/revision';
import { breakEvenUnits, contributionPerUnit, labourTurnover, marginOfSafety, profit, specialOrderGain, totalCost, totalRevenue } from '../../src/lib/finance';
import { acidTestRatio, creditorDays, currentRatio, debtorDays, gearingRatio, grossProfitMargin, profitMargin, roce, stockTurnoverDays, stockTurnoverTimes } from '../../src/lib/ratios';
import { arr, npv, payback, presentValues } from '../../src/lib/investment';
import { variance } from '../../src/lib/budget';
import { marketShare, growthRate } from '../../src/lib/market';
import { maxStock, reorderLevel, weightedScores } from '../../src/lib/operations';

const input = revisionInput();
const data: RevisionData = buildRevision(input);
const { c, revision } = input;
const subs = subtopicsOf(c);
const cards = data.deck.cards;
const byId = new Map(cards.map((x) => [x.id, x]));

describe('the build', () => {
  it('passes its integrity check', () => {
    expect(data.problems.map((p) => `${p.where}: ${p.message}`)).toEqual([]);
  });

  it('gives every subtopic a sheet at the slug of its page in the topic library', () => {
    expect(data.sheets).toHaveLength(37);
    expect(data.sheets.map((s) => s.code)).toEqual(subs.map((s) => s.code));
    for (const s of data.sheets) {
      expect(s.slug).toBe(slugify(s.title));
      expect(s.notesHref).toBe(`/topics/${s.slug}/`);
      expect(s.flashcardsHref).toBe(`/revision/flashcards/?topic=${s.code}`);
    }
  });

  it('keeps the three addresses the revision briefs had', () => {
    const slugs = data.sheets.map((s) => s.slug);
    for (const id of Object.keys(c.topics)) expect(slugs, id).toContain(id);
  });

  it('is the same from one build to the next', () => {
    const again = buildRevision(revisionInput());
    expect(again.deck.cards.map((x) => x.id)).toEqual(cards.map((x) => x.id));
    expect(JSON.stringify(again.deck)).toBe(JSON.stringify(data.deck));
  });
});

describe('the flashcard deck', () => {
  it('gives every card a unique, well-formed id that names its kind', () => {
    const ids = cards.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const x of cards) {
      expect(x.id, x.id).toMatch(/^[a-z]+:[a-z0-9][a-z0-9:._-]*$/);
      expect(x.id.split(':')[0], x.id).toBe(x.kind);
      expect(CARD_KINDS).toContain(x.kind);
    }
  });

  it('keeps the ids other parts of the platform rely on', () => {
    for (const id of ['term:liquidity', 'formula:current-ratio', 'formula:current-ratio:use', 'framework:ansoff-matrix', 'framework:ansoff-matrix:structure', 'distinction:profit-vs-cash-flow']) {
      expect(byId.has(id), id).toBe(true);
    }
  });

  it('gives every card subtopic codes in course order and a level', () => {
    const order = [...subs.map((s) => s.code), 'toolkit'];
    for (const x of cards) {
      expect(x.codes.length, x.id).toBeGreaterThan(0);
      for (const code of x.codes) expect(order, `${x.id}: ${code}`).toContain(code);
      expect([...x.codes].sort((a, b) => order.indexOf(a) - order.indexOf(b)), x.id).toEqual(x.codes);
      expect(['SL/HL', 'HL'], x.id).toContain(x.level);
      expect(x.title.trim(), x.id).not.toBe('');
      expect(x.front.trim(), x.id).not.toBe('');
      expect(x.back.trim(), x.id).not.toBe('');
    }
  });

  it('marks a card HL when every subtopic it belongs to is HL only', () => {
    const hlOnly = new Set(subs.filter((s) => s.level === 'HL').map((s) => s.code));
    for (const x of cards) {
      const subjects = x.codes.filter((code) => code !== 'toolkit');
      if (subjects.length && subjects.every((code) => hlOnly.has(code))) expect(x.level, x.id).toBe('HL');
    }
  });

  it('holds every IB glossary term and none beyond the course', () => {
    const ib = Object.entries(c.glossary).filter(([, g]) => g.provenance !== 'enrichment');
    const beyond = Object.entries(c.glossary).filter(([, g]) => g.provenance === 'enrichment');
    expect(cards.filter((x) => x.kind === 'term')).toHaveLength(ib.length);
    for (const [id] of beyond) expect(byId.has(`term:${id}`), id).toBe(false);
    expect(byId.get('term:liquidity')).toMatchObject({ codes: ['3.5', '3.7'], level: 'SL/HL', title: 'Liquidity', href: '/glossary/liquidity/' });
  });

  it('carries every framework twice, and marks those beyond the course as enrichment', () => {
    const fw = cards.filter((x) => x.kind === 'framework');
    expect(fw.length).toBeGreaterThanOrEqual(70);
    expect(byId.get('framework:ansoff-matrix')?.codes).toEqual(['1.5', '4.2', 'toolkit']);
    expect(byId.get('framework:mendelow-matrix')?.enrichment).toBe(true);
    expect(byId.get('framework:ansoff-matrix')?.enrichment).toBeUndefined();
  });

  it('carries every formula both ways: from the formula and from a situation', () => {
    for (const f of data.formulae) {
      const forward = byId.get(`formula:${f.id}`);
      const back = byId.get(`formula:${f.id}:use`);
      expect(forward, f.id).toBeDefined();
      expect(back, `${f.id} has no situation in the revision files`).toBeDefined();
      expect(f.measures, `${f.id} says nothing about what it measures`).toBeTruthy();
    }
    const cr = byId.get('formula:current-ratio');
    expect(cr?.front).toContain('current assets ÷ current liabilities');
    expect(cr?.front).not.toContain('Current ratio');
    expect(cr?.back).toContain('Current ratio = current assets ÷ current liabilities');
  });

  it('folds in the recall questions of the notes and the briefs, with the ids the subtopic pages use', () => {
    const notes = Object.values(c.notes).reduce((n, x) => n + x.retrieval.length, 0);
    const briefs = Object.values(c.topics).reduce((n, x) => n + x.revision.retrieval.length, 0);
    const recall = cards.filter((x) => x.kind === 'recall');
    expect(recall).toHaveLength(notes + briefs);
    expect(recall.length).toBe(379);
    const note = Object.values(c.notes).find((n) => n.code === '1.4')!;
    const ids = recallIds('1.4', note.retrieval.map((r) => r.q));
    for (const id of ids) expect(byId.get(id)?.codes).toEqual(['1.4']);
  });

  it('marks the HL recall questions of mixed subtopics', () => {
    const hl = cards.filter((x) => x.kind === 'recall' && x.codes[0] === '2.4' && x.level === 'HL');
    expect(hl.length).toBe(5);
    expect(byId.get('recall:2-3-when-is-intuitive-decision-making-most-useful')?.level).toBe('HL');
    expect(cards.filter((x) => x.kind === 'recall' && x.codes[0] === '3.6').every((x) => x.level === 'HL')).toBe(true);
    // The HL mark is shown as a tag, so it leaves the question itself.
    expect(cards.filter((x) => x.kind === 'recall').some((x) => /^\(HL|^HL only/.test(x.title))).toBe(false);
  });

  it('holds 60 to 100 key distinctions, each tied to subtopics', () => {
    const d = cards.filter((x) => x.kind === 'distinction');
    expect(d.length).toBeGreaterThanOrEqual(60);
    expect(d.length).toBeLessThanOrEqual(100);
    expect(byId.get('distinction:profit-vs-cash-flow')?.codes).toEqual(['3.4', '3.7']);
    expect(byId.get('distinction:profitability-vs-liquidity')?.codes).toEqual(['3.5', '3.7']);
  });

  it('labels every application scenario fictional, and covers every unit with scenarios and evaluation prompts', () => {
    const scen = cards.filter((x) => x.kind === 'scenario');
    expect(scen.every((x) => x.fictional)).toBe(true);
    for (const unit of ['1', '2', '3', '4', '5']) {
      expect(scen.some((x) => x.codes.some((code) => code.startsWith(`${unit}.`))), `unit ${unit}`).toBe(true);
      expect(cards.some((x) => x.kind === 'evaluation' && x.codes.some((code) => code.startsWith(`${unit}.`))), `unit ${unit}`).toBe(true);
    }
  });

  it('covers every subtopic and the toolkit', () => {
    for (const code of [...subs.map((s) => s.code), 'toolkit']) expect(cards.some((x) => x.codes.includes(code)), code).toBe(true);
  });

  it('writes no leaked values and no long dashes', () => {
    const json = JSON.stringify(data.deck);
    expect(json).not.toMatch(/\bundefined\b|\bNaN\b|\[object Object\]/);
    expect(json).not.toMatch(new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`));
  });

  it('resolves the set ids the recall cards are given on the subtopic pages and the sheets', () => {
    expect(recallSetCode(c, 'notes-3-5')).toBe('3.5');
    expect(recallSetCode(c, 'costs-and-revenues')).toBe('3.3');
    expect(recallSetCode(c, 'rev-growth-and-evolution')).toBe('1.5');
    expect(recallSetCode(c, 'something-else')).toBeUndefined();
  });
});

describe('the formula register', () => {
  it('reads the two sides of a formula', () => {
    expect(rhs('Current ratio = current assets ÷ current liabilities')).toBe('current assets ÷ current liabilities');
    expect(lhs('Current ratio = current assets ÷ current liabilities')).toBe('Current ratio');
    expect(lhs('no equals sign')).toBe('');
  });

  it('compares shapes word for word, keeping the operators', () => {
    expect(shape('NPV = ∑ present values of return − original cost')).toBe(shape('NPV = sum of the present values of the returns − original cost'));
    expect(shape('Working capital = current assets − current liabilities')).not.toBe(shape('Current ratio = current assets ÷ current liabilities'));
  });

  it('says what a formula measures without saying the formula again', () => {
    expect(measureText('Current assets divided by current liabilities, which shows how many times the assets cover the debts.')).toBe('How many times the assets cover the debts.');
    expect(measureText('The average number of days a business takes to collect its debts.')).toBe('The average number of days a business takes to collect its debts.');
  });

  it('keeps one entry per formula, merging the same formula taught in two subtopics', () => {
    const ids = data.formulae.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    const lt = data.formulae.find((f) => f.id === 'labour-turnover');
    expect(lt?.codes).toEqual(['2.4', '5.9']);
    expect(data.formulae.find((f) => f.id === 'working-capital')?.codes).toEqual(['3.5', '3.7']);
    expect(data.formulae.find((f) => f.id === 'current-ratio')?.codes).toEqual(['3.5']);
    expect(data.formulae.find((f) => f.id === 'net-present-value')?.level).toBe('HL');
  });
});

describe('the sheets', () => {
  const sheet = (code: string) => data.sheets.find((s) => s.code === code)!;

  it('each hold definitions, three to five exercises and at least three common mistakes', () => {
    for (const s of data.sheets) {
      expect(s.terms.length, s.code).toBeGreaterThan(0);
      expect(s.exercises.length, s.code).toBeGreaterThanOrEqual(3);
      expect(s.exercises.length, s.code).toBeLessThanOrEqual(5);
      expect(s.mistakes.length, s.code).toBeGreaterThanOrEqual(3);
      expect(s.mistakes.length, s.code).toBeLessThanOrEqual(MAX_MISTAKES);
      expect(s.points.length, s.code).toBeGreaterThan(0);
      expect(s.recall, s.code).not.toBeNull();
      expect(s.cards, s.code).toBeGreaterThan(0);
    }
  });

  it('use only the IB glossary for their definitions, A to Z', () => {
    for (const s of data.sheets) {
      for (const t of s.terms) expect(c.glossary[t.id]?.provenance, `${s.code} ${t.id}`).not.toBe('enrichment');
      expect(s.terms.map((t) => t.term)).toEqual([...s.terms.map((t) => t.term)].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })));
    }
  });

  it('take mistakes from the content first, and write their own only where it holds too few', () => {
    // 1.1 is the one exception: everything the content holds for it is about toolkit items (the business plan, circular
    // models), so two mistakes on the subtopic's own core, the sectors and added value, are written for its sheet.
    const coreAdded = new Set(['1.1']);
    for (const s of data.sheets) {
      const written = revision[s.slug]?.mistakes.length ?? 0;
      const sourced = s.mistakes.filter((m) => m.source).length;
      expect(s.mistakes.filter((m) => !m.source)).toHaveLength(written);
      // The content's own come first.
      expect(s.mistakes.findIndex((m) => !m.source) === -1 || s.mistakes.slice(s.mistakes.findIndex((m) => !m.source)).every((m) => !m.source), s.code).toBe(true);
      if (written && !coreAdded.has(s.code)) expect(sourced, `${s.code} wrote its own mistakes although the content held enough`).toBeLessThan(3);
    }
  });

  it('keep what the old revision briefs showed', () => {
    for (const [id, t] of Object.entries(c.topics)) {
      const s = data.sheets.find((x) => x.slug === id)!;
      expect(s.points).toEqual(t.revision.keyPoints);
      for (const trap of t.revision.traps.slice(0, 4)) expect(s.mistakes.map((m) => m.text)).toContain(trap);
      for (const k of t.related.calculations) expect(s.formulae.map((f) => f.id), `${id} ${k}`).toContain(k);
      for (const g of t.related.glossary) expect(s.terms.map((x) => x.id), `${id} ${g}`).toContain(g);
      expect(s.recall?.set).toBe(`rev-${id}`);
      expect(s.recall?.items).toEqual(t.revision.retrieval.map((r) => ({ q: r.q, a: r.a })));
    }
  });

  it('share their recall questions with the notes page, so a rating counts in both places', () => {
    expect(sheet('3.5').recall?.set).toBe('notes-3-5');
    expect(sheet('3.5').recall?.items).toHaveLength(Object.values(c.notes).find((n) => n.code === '3.5')!.retrieval.length);
  });

  it('gather the frameworks and formulae of the subtopic', () => {
    expect(sheet('1.5').frameworks.map((f) => f.id)).toEqual(expect.arrayContaining(['ansoff-matrix', 'decision-trees', 'force-field-analysis', 'swot-analysis']));
    expect(sheet('2.4').frameworks.map((f) => f.id)).toEqual(expect.arrayContaining(['maslows-hierarchy-of-needs', 'herzbergs-motivation-hygiene-theory']));
    expect(sheet('3.5').formulae.map((f) => f.id)).toEqual(expect.arrayContaining(['gross-profit-margin', 'profit-margin', 'roce', 'current-ratio', 'acid-test-ratio']));
    for (const f of sheet('1.5').frameworks) expect(f.purpose.trim()).not.toBe('');
  });

  it('mark HL content on SL and HL sheets, and only there', () => {
    expect(sheet('2.4').hasHL).toBe(true);
    expect(sheet('3.6').hasHL).toBe(false);
    expect(sheet('1.4').hasHL).toBe(false);
  });

  it('read only the sentences in the notes that state a common error themselves', () => {
    const note = Object.values(c.notes).find((n) => n.code === '3.6')!;
    const errors = noteErrors(note).map((e) => e.text);
    expect(errors).toContain('A common error is to divide debtors by cost of sales or creditors by sales revenue.');
    for (const e of Object.values(c.notes).flatMap((n) => noteErrors(n))) expect(e.text).not.toMatch(/\d/);
  });
});

describe('the integrity check', () => {
  const base = (): Record<string, RevisionEntry> => structuredClone(revision);
  const problems = (rev: Record<string, RevisionEntry>) =>
    checkRevision({ c, revision: rev, formulaIds: new Set(data.formulae.map((f) => f.id)), recallIds: new Set(data.recall.flatMap((r) => r.ids)) }).map((p) => `${p.where}: ${p.message}`);

  it('allows a command term at or below the AO level of the statements', () => {
    const at = (code: string) => subs.find((s) => s.code === code)!;
    expect(commandAllowed('AO2', at('1.4'), 'SL/HL')).toBe(true);
    expect(commandAllowed('AO3', at('1.4'), 'SL/HL')).toBe(false);
    expect(commandAllowed('AO4', at('3.5'), 'SL/HL')).toBe(true);
    expect(commandAllowed('AO4', at('4.5'), 'HL')).toBe(false);
    // 2.4's labour turnover statement is HL and carries AO4; its SL statements do not.
    expect(commandAllowed('AO4', at('2.4'), 'SL/HL')).toBe(false);
    expect(commandAllowed('AO4', at('2.4'), 'HL')).toBe(true);
  });

  it('catches the mistakes it exists for', () => {
    const r = base();
    const st = r.stakeholders!;
    st.exercises[0]!.command = 'evaluate';
    st.exercises[1]!.business = 'Someone Else Ltd';
    st.distinctions.push({ ...st.distinctions[0]! });
    st.formulas = { 'no-such-formula': { situation: 'x' } };
    st.hlRecall = ['recall:1-4-not-a-question'];
    const ia = r['industrial-employee-relations']!;
    ia.exercises[0]!.level = 'SL/HL';
    ia.distinctions[0]!.level = 'SL/HL';
    r['cash-flow']!.scenarios[0]!.codes = ['9.9'];
    delete r.budgets;
    const found = problems(r);
    for (const want of [
      'above the AO level',
      'the stem does not name Someone Else Ltd',
      'distinction "stakeholder-vs-shareholder": the id is also used',
      'formula "no-such-formula" is not in the formula register',
      'is not a recall card',
      'HL only, so the exercise must be marked HL',
      'every subtopic it belongs to is HL only',
      '"9.9" is not a subtopic',
      '3.9 Budgets has no revision file',
    ]) {
      expect(found.some((p) => p.includes(want)), want).toBe(true);
    }
  });

  it('catches a formula described twice and a file named for the wrong subtopic', () => {
    const r = base();
    r.location!.formulas = { ...r.location!.formulas, 'current-ratio': { situation: 'again' } };
    r['some-other-name'] = { ...r.location! };
    const found = problems(r);
    expect(found.some((p) => p.includes('formula "current-ratio" is also described'))).toBe(true);
    expect(found.some((p) => p.includes('must be named location.yaml'))).toBe(true);
  });
});

describe('the figures in the exercises, reworked', () => {
  const outline = (file: string, id: string) => {
    const x = revision[file]?.exercises.find((e) => e.id === id);
    if (!x) throw new Error(`${file}#${id} not found`);
    return x.outline.join(' ');
  };

  it('1.1 added value and 3.3 a price cut', () => {
    expect(1050 - 420).toBe(630);
    expect(outline('what-is-a-business', 'spokewright-added-value')).toContain('$1,050 − $420 = $630');
    expect(totalRevenue(12, 1000)).toBe(12000);
    expect(totalCost(4000, 5, 1000)).toBe(9000);
    expect(profit(12, 5, 4000, 1000)).toBe(3000);
    expect(profit(10, 5, 4000, 1200)).toBe(2000);
    expect(profit(10, 5, 4000, 1400)).toBe(3000);
    const t = outline('costs-and-revenues', 'glazewright-price-cut');
    for (const s of ['profit = $3,000', 'profit = $2,000', '1,400 mugs']) expect(t).toContain(s);
  });

  it('2.4 labour turnover', () => {
    expect(labourTurnover(42, (150 + 130) / 2)).toBe(30);
    expect(outline('motivation-and-demotivation', 'quaymill-labour-turnover')).toContain('**30%**');
  });

  it('3.4 the statement of profit or loss and depreciation', () => {
    const gp = 640000 - 380000;
    const pbit = gp - 150000;
    const pbt = pbit - 10000;
    const pfp = pbt - 20000;
    expect([gp, pbit, pbt, pfp, pfp - 30000]).toEqual([260000, 110000, 100000, 80000, 50000]);
    const t = outline('final-accounts', 'tamberley-profit-or-loss');
    for (const s of ['$260,000', '$110,000', '$100,000', '$80,000', '$50,000']) expect(t).toContain(s);
    expect((48000 - 8000) / 4).toBe(10000);
    expect(((48000 - 8000) / 200000) * 60000).toBe(12000);
    expect(outline('final-accounts', 'tamberley-depreciation')).toContain('**$12,000**');
  });

  it('3.5 profitability and liquidity ratios', () => {
    expect(grossProfitMargin(200000, 500000)).toBe(40);
    expect(profitMargin(60000, 500000)).toBe(12);
    expect(roce(60000, 100000, 300000)).toBe(15);
    expect(currentRatio(90000, 60000)).toBe(1.5);
    expect(acidTestRatio(90000, 50000, 60000)).toBeCloseTo(0.67, 2);
    const t = outline('profitability-and-liquidity-ratio-analysis', 'copperlane-ratios');
    for (const s of ['**40%**', '**12%**', '**15%**', '**1.5:1**', '**0.67:1**']) expect(t).toContain(s);
  });

  it('3.6 efficiency ratios', () => {
    expect(stockTurnoverTimes(438000, 50000, 70000)).toBeCloseTo(7.3, 6);
    expect(stockTurnoverDays(438000, 50000, 70000)).toBeCloseTo(50, 6);
    expect(debtorDays(80000, 730000)).toBeCloseTo(40, 6);
    expect(creditorDays(48000, 438000)).toBeCloseTo(40, 6);
    expect(gearingRatio(150000, 350000)).toBe(30);
    const t = outline('efficiency-ratio-analysis', 'tidemark-efficiency');
    for (const s of ['**7.3 times**', '**50 days**', '**40 days**', '**30%**']) expect(t).toContain(s);
  });

  it('3.7 a cash flow forecast', () => {
    const may = 6000 + (24000 - 27000);
    const june = may + (30000 - 25000);
    expect([may, june]).toEqual([3000, 8000]);
    const t = outline('cash-flow', 'fernlow-forecast');
    for (const s of ['**−$3,000**', '**$3,000**', '**$5,000**', '**$8,000**']) expect(t).toContain(s);
  });

  it('3.8 payback, ARR and NPV with the guide’s factors', () => {
    const p = { id: 'x', label: 'Machine', capitalCost: 80000, returns: [30000, 30000, 24000, 16000] };
    expect(payback(p)).toMatchObject({ years: 2, months: 10 });
    expect(arr(p)).toBe(6.25);
    expect(presentValues(p, 10).map((v) => Math.round(v))).toEqual([27273, 24792, 18031, 10928]);
    expect(Math.round(npv(p, 10) ?? 0)).toBe(1024);
    expect(outline('investment-appraisal', 'tarnbrook-payback-arr')).toContain('**2 years and 10 months**');
    expect(outline('investment-appraisal', 'tarnbrook-payback-arr')).toContain('**6.25%**');
    expect(outline('investment-appraisal', 'tarnbrook-npv')).toContain('**$1,024**');
  });

  it('3.9 variances, labelled by their effect on profit', () => {
    expect(variance('revenue', 40000, 37000)).toMatchObject({ amount: 3000, mark: 'A' });
    expect(variance('cost', 12000, 12500)).toMatchObject({ amount: 500, mark: 'A' });
    expect(variance('cost', 10000, 9200)).toMatchObject({ amount: 800, mark: 'F' });
    expect(40000 - 22000 - (37000 - 21700)).toBe(2700);
    const t = outline('budgets', 'tellmere-variances');
    for (const s of ['**$3,000 [A]**', '**$500 [A]**', '**$800 [F]**', '**$2,700 [A]**']) expect(t).toContain(s);
  });

  it('4.1 market share and growth', () => {
    expect(marketShare(40, 250)).toBe(16);
    expect(marketShare(45, 300)).toBe(15);
    expect(growthRate(250, 300)).toBe(20);
    expect(growthRate(40, 45)).toBe(12.5);
    const t = outline('introduction-to-marketing', 'millhaven-share-growth');
    for (const s of ['**16%**', '**15%**', '**20%**', '12.5%']) expect(t).toContain(s);
  });

  it('4.5 price elasticity of demand', () => {
    expect(-5 / 10).toBe(-0.5);
    expect(1.1 * 0.95).toBeCloseTo(1.045, 10);
    expect(outline('the-seven-ps-of-the-marketing-mix', 'thistledown-ped')).toContain('1.10 × 0.95 = 1.045');
  });

  it('5.4 weighted scores', () => {
    const r = weightedScores(
      [
        { id: 'edge', name: 'City edge', scores: { cost: 4, access: 9, labour: 8 } },
        { id: 'town', name: 'Town', scores: { cost: 9, access: 5, labour: 5 } },
      ],
      [{ id: 'cost' }, { id: 'access' }, { id: 'labour' }],
      { cost: 0.5, access: 0.3, labour: 0.2 },
      10,
    );
    const total = (id: string) => r.find((x) => x.id === id)?.total;
    expect(total('edge')).toBeCloseTo(6.3, 10);
    expect(total('town')).toBeCloseTo(7.0, 10);
    const t = outline('location', 'haverling-weighted');
    expect(t).toContain('**6.3**');
    expect(t).toContain('**7.0**');
  });

  it('5.5 break-even, a rise in costs and a special order', () => {
    expect(contributionPerUnit(20, 8)).toBe(12);
    expect(breakEvenUnits(36000, 20, 8)).toBe(3000);
    expect(marginOfSafety(4000, 36000, 20, 8)).toBe(1000);
    expect(profit(20, 8, 36000, 4000)).toBe(12000);
    expect(breakEvenUnits(36000, 20, 10)).toBe(3600);
    expect(marginOfSafety(4000, 36000, 20, 10)).toBe(400);
    expect(profit(20, 10, 36000, 4000)).toBe(4000);
    expect(specialOrderGain(14, 8, 500, 1000)).toBe(2000);
    expect(outline('break-even-analysis', 'rowanlea-break-even')).toContain('**3,000 candles**');
    expect(outline('break-even-analysis', 'rowanlea-cost-rise')).toContain('**3,600 candles**');
    expect(outline('break-even-analysis', 'rowanlea-special-order')).toContain('**+$2,000**');
  });

  it('5.6 stock control, make or buy, capacity and productivity', () => {
    expect(reorderLevel({ buffer: 300, usage: 400, leadTime: 2 })).toBe(1100);
    expect(maxStock({ buffer: 300, reorderQty: 1600 })).toBe(1900);
    expect(3.5 * 10000).toBe(35000);
    expect(12000 + 2 * 10000).toBe(32000);
    expect([3.5 * 8000, 12000 + 2 * 8000]).toEqual([28000, 28000]);
    expect((3500 / 5000) * 100).toBe(70);
    expect(3500 / 14).toBe(250);
    expect(outline('production-planning', 'brakewell-stock-levels')).toContain('**1,100 tins**');
    expect(outline('production-planning', 'brakewell-make-or-buy')).toContain('**$32,000**');
    expect(outline('production-planning', 'brakewell-capacity')).toContain('**70%**');
  });
});
